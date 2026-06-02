"""
RPLAN Layout Database v4 -- Production-Grade k-NN Index

Indexes all 64K RPLAN plans by (bedrooms, bathrooms, area, specials) for fast retrieval.

Optimizations:
  - Pre-bucketed by (beds, baths) at load time for O(1) bucket lookup
  - Vectorized scoring with numpy for fast k-NN on large candidate sets
  - LRU cache on pickle extraction to avoid repeated disk I/O
  - Diversity filtering to avoid returning nearly identical plans
  - Thread-safe for concurrent async access

Environment variables:
    LAYOUT_CACHE_SIZE - LRU cache size for extracted layouts (default: 256)
"""

from __future__ import annotations

import json
import logging
import os
import random
import time
from functools import lru_cache
from pathlib import Path
from typing import Optional, List, Dict, Tuple, Set

import numpy as np

from .rplan_extractor import extract_layout, BEDROOM_CATS, BATHROOM_CATS, SPECIAL_CATS

logger = logging.getLogger(__name__)

_INDEX_FILE = Path("layout_index.json")
_PICKLE_DIR = Path("pickle/train")

# Scoring weights
W_BEDS = 0.35
W_BATHS = 0.25
W_AREA = 0.25
W_SPECIAL = 0.15

# Pixel-to-sqft heuristic (RPLAN: ~14 px^2 per sqft)
PX_PER_SQFT = 14.0

# LRU cache size for extracted layouts (each ~20-100KB in memory)
_CACHE_SIZE = int(os.environ.get("LAYOUT_CACHE_SIZE", "256"))


# ── Cached layout extraction ────────────────────────────────────────────────

@lru_cache(maxsize=_CACHE_SIZE)
def extract_layout_cached(pkl_path: str) -> Optional[dict]:
    """Extract layout with LRU caching to avoid repeated pickle I/O."""
    return extract_layout(pkl_path)


def clear_layout_cache():
    """Clear the LRU cache (useful for testing or memory pressure)."""
    extract_layout_cached.cache_clear()


# ── Index builder ────────────────────────────────────────────────────────────

def build_index(pickle_dir: Path = _PICKLE_DIR,
                index_file: Path = _INDEX_FILE,
                max_files: int = 0) -> dict:
    """
    Scan all .pkl files, extract lightweight metrics, save index JSON.
    max_files=0 -> process all files (first run: ~5-10 min for 64K files).
    """
    import pickle as pkl_lib

    files = sorted(pickle_dir.glob("*.pkl"))
    if max_files:
        files = files[:max_files]

    logger.info(f"Building index for {len(files):,} files ...")
    t0 = time.time()

    entries = []
    for i, fpath in enumerate(files):
        if i % 5000 == 0 and i:
            logger.info(f"  {i:,}/{len(files):,}  ({time.time()-t0:.0f}s)")
        try:
            with open(fpath, "rb") as f:
                data = pkl_lib.load(f)
        except Exception:
            continue

        rooms_raw = data[4]
        if not rooms_raw:
            continue

        boundary = np.array(data[0], dtype=np.uint8)
        footprint_px = int((boundary > 127).sum())
        if footprint_px < 1000:
            continue

        cats = [int(r.get("category", 0)) for r in rooms_raw]
        beds = sum(1 for c in cats if c in BEDROOM_CATS)
        baths = sum(1 for c in cats if c in BATHROOM_CATS)
        specials = [SPECIAL_CATS[c] for c in cats if c in SPECIAL_CATS]

        entries.append({
            "file": str(fpath),
            "beds": beds,
            "baths": baths,
            "fp_px": footprint_px,
            "n_rooms": len(rooms_raw),
            "special": specials,
        })

    index_file.write_text(json.dumps(entries, separators=(",", ":")), encoding="utf-8")
    elapsed = time.time() - t0
    logger.info(f"Index saved -> {index_file}  ({len(entries):,} entries, {elapsed:.0f}s)")
    return {e["file"]: e for e in entries}


def load_index(index_file: Path = _INDEX_FILE) -> list:
    """Load the pre-built index from disk."""
    if not index_file.exists():
        return []
    return json.loads(index_file.read_text(encoding="utf-8"))


# ── Database class ───────────────────────────────────────────────────────────

class LayoutDatabase:
    """
    Fast lookup: given user conditions -> best RPLAN layout dict.

    Production optimizations:
    - Pre-bucketed by (beds, baths) for O(1) initial filtering
    - Vectorized numpy scoring for candidate ranking
    - LRU-cached pickle extraction
    - Diversity filtering to avoid nearly identical results

    Usage:
        db = LayoutDatabase()
        db.load()
        layout = db.find(bedrooms=3, bathrooms=2, area_sqft=1500)
    """

    def __init__(self,
                 pickle_dir: Path = _PICKLE_DIR,
                 index_file: Path = _INDEX_FILE):
        self._pickle_dir = Path(pickle_dir)
        self._index_file = Path(index_file)
        self._entries: list = []
        self._ready = False

        # Pre-bucketed indices for fast lookup
        self._buckets: Dict[Tuple[int, int], List[int]] = {}
        # Vectorized arrays for numpy scoring
        self._beds_arr: Optional[np.ndarray] = None
        self._baths_arr: Optional[np.ndarray] = None
        self._fp_px_arr: Optional[np.ndarray] = None

    @property
    def plan_count(self) -> int:
        return len(self._entries)

    @property
    def is_ready(self) -> bool:
        return self._ready

    # ── Public ───────────────────────────────────────────────────────

    def load(self, rebuild: bool = False):
        """Load (or build) the index. Call once at startup."""
        if rebuild or not self._index_file.exists():
            build_index(self._pickle_dir, self._index_file)

        t0 = time.time()
        self._entries = load_index(self._index_file)
        n = len(self._entries)

        if n == 0:
            logger.warning("No entries in layout index!")
            self._ready = True
            return

        # Build vectorized arrays for fast numpy scoring
        self._beds_arr = np.array([e["beds"] for e in self._entries], dtype=np.float32)
        self._baths_arr = np.array([e["baths"] for e in self._entries], dtype=np.float32)
        self._fp_px_arr = np.array([e["fp_px"] for e in self._entries], dtype=np.float32)

        # Pre-bucket by (beds, baths) for fast candidate filtering
        self._buckets.clear()
        for idx, entry in enumerate(self._entries):
            key = (entry["beds"], entry["baths"])
            if key not in self._buckets:
                self._buckets[key] = []
            self._buckets[key].append(idx)

        self._ready = True
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.info(f"Loaded {n:,} indexed plans in {elapsed_ms}ms "
                    f"({len(self._buckets)} unique (beds,baths) buckets)")

    def find(self,
             bedrooms: int = 3,
             bathrooms: int = 2,
             area_sqft: float = 1500,
             special_rooms: list = None,
             seed: Optional[int] = None) -> Optional[dict]:
        """
        Return the layout dict for the best-matching plan.
        Uses bucketed search + vectorized scoring.
        """
        if not self._ready:
            raise RuntimeError("Call db.load() before db.find()")

        special_rooms = special_rooms or []
        rng = random.Random(seed)

        candidates = self.find_candidates(
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            area_sqft=area_sqft,
            special_rooms=special_rooms,
            top_k=10,
        )

        if not candidates:
            if self._entries:
                entry = rng.choice(self._entries)
                return extract_layout_cached(entry["file"])
            return None

        # Pick randomly from top-3 for variety (weighted toward better matches)
        top = candidates[:min(3, len(candidates))]
        weights = [3, 2, 1][:len(top)]
        entry = rng.choices(top, weights=weights, k=1)[0]
        return extract_layout_cached(entry["file"])

    def find_candidates(self, bedrooms: int, bathrooms: int, area_sqft: float,
                        special_rooms: list = None, top_k: int = 20) -> List[dict]:
        """
        Return top-k candidate entries ranked by composite match score.

        Uses bucketed pre-filtering + vectorized numpy scoring for speed.
        On 64K entries with bucketing, typical query touches ~2-5K entries.
        """
        if not self._ready:
            raise RuntimeError("Call db.load() before find_candidates()")

        special_rooms = special_rooms or []

        # Get candidate indices from relevant buckets
        # Search exact match + adjacent buckets (beds+/-1, baths+/-1)
        candidate_indices = self._get_bucket_candidates(bedrooms, bathrooms)

        if not candidate_indices:
            # Fallback to full scan if no bucket matches
            candidate_indices = list(range(len(self._entries)))

        # Vectorized scoring on candidate subset
        idx_arr = np.array(candidate_indices, dtype=np.int32)
        scores = self._vectorized_score(idx_arr, bedrooms, bathrooms, area_sqft, special_rooms)

        # Filter by minimum threshold
        mask = scores > 0.15
        valid_indices = idx_arr[mask]
        valid_scores = scores[mask]

        if len(valid_indices) == 0:
            return []

        # Sort by score descending (top-k)
        sort_order = np.argsort(-valid_scores)
        # Take more than top_k for diversity filtering
        n_consider = min(len(sort_order), top_k * 3)
        top_order = sort_order[:n_consider]

        # Diversity filtering
        diverse_results = []
        seen_signatures: Set[tuple] = set()

        for pos in top_order:
            entry_idx = int(valid_indices[pos])
            entry = self._entries[entry_idx]

            # Signature: beds + baths + rough area bucket (200 sqft)
            area_bucket = round(entry["fp_px"] / (PX_PER_SQFT * 200))
            sig = (entry["beds"], entry["baths"], area_bucket,
                   tuple(sorted(entry.get("special", []))))

            if sig not in seen_signatures or len(diverse_results) < 5:
                diverse_results.append(entry)
                seen_signatures.add(sig)

            if len(diverse_results) >= top_k:
                break

        return diverse_results

    def score_match(self, entry: dict, bedrooms: int, bathrooms: int,
                    area_sqft: float, special_rooms: list = None) -> float:
        """Compute weighted match score for a single index entry."""
        special_rooms = special_rooms or []

        # Bedroom match: exact=1.0, off by 1=0.5, off by 2+=0.0
        bed_diff = abs(entry["beds"] - bedrooms)
        if bed_diff == 0:
            bed_score = 1.0
        elif bed_diff == 1:
            bed_score = 0.5
        else:
            bed_score = max(0.0, 0.2 - bed_diff * 0.1)

        # Bathroom match
        bath_diff = abs(entry["baths"] - bathrooms)
        if bath_diff == 0:
            bath_score = 1.0
        elif bath_diff == 1:
            bath_score = 0.5
        else:
            bath_score = max(0.0, 0.2 - bath_diff * 0.1)

        # Area match
        target_fp_px = area_sqft * PX_PER_SQFT
        if target_fp_px > 0:
            area_ratio = abs(entry["fp_px"] - target_fp_px) / target_fp_px
            area_score = max(0.0, 1.0 - area_ratio)
        else:
            area_score = 0.5

        # Special rooms match
        if special_rooms:
            entry_specials = set(entry.get("special", []))
            requested = set(special_rooms)
            matched = len(entry_specials & requested)
            special_score = matched / len(requested)
        else:
            special_score = 1.0

        score = (
            W_BEDS * bed_score +
            W_BATHS * bath_score +
            W_AREA * area_score +
            W_SPECIAL * special_score
        )
        return score

    def get_layout_by_file(self, filepath: str) -> Optional[dict]:
        """Load and return extracted layout for a specific pickle file path."""
        return extract_layout_cached(filepath)

    def get_entry_by_file(self, filepath: str) -> Optional[dict]:
        """Get the index entry for a specific file."""
        for entry in self._entries:
            if entry["file"] == filepath:
                return entry
        return None

    # ── Private ──────────────────────────────────────────────────────

    def _get_bucket_candidates(self, bedrooms: int, bathrooms: int) -> List[int]:
        """Get candidate indices from exact and adjacent (beds, baths) buckets."""
        candidates = []
        # Search exact + adjacent (beds +/- 1, baths +/- 1)
        for bed_offset in range(-1, 2):
            for bath_offset in range(-1, 2):
                key = (bedrooms + bed_offset, bathrooms + bath_offset)
                if key in self._buckets:
                    candidates.extend(self._buckets[key])
        return candidates

    def _vectorized_score(self, indices: np.ndarray, bedrooms: int,
                          bathrooms: int, area_sqft: float,
                          special_rooms: list) -> np.ndarray:
        """Compute scores for all indices using vectorized numpy operations."""
        beds = self._beds_arr[indices]
        baths = self._baths_arr[indices]
        fp_px = self._fp_px_arr[indices]

        # Bedroom score: exact=1.0, off_by_1=0.5, else max(0, 0.2 - diff*0.1)
        bed_diff = np.abs(beds - bedrooms)
        bed_scores = np.where(bed_diff == 0, 1.0,
                              np.where(bed_diff == 1, 0.5,
                                       np.maximum(0.0, 0.2 - bed_diff * 0.1)))

        # Bathroom score
        bath_diff = np.abs(baths - bathrooms)
        bath_scores = np.where(bath_diff == 0, 1.0,
                               np.where(bath_diff == 1, 0.5,
                                        np.maximum(0.0, 0.2 - bath_diff * 0.1)))

        # Area score: 1.0 - |fp_px - target| / target
        target_fp_px = area_sqft * PX_PER_SQFT
        if target_fp_px > 0:
            area_ratio = np.abs(fp_px - target_fp_px) / target_fp_px
            area_scores = np.maximum(0.0, 1.0 - area_ratio)
        else:
            area_scores = np.full(len(indices), 0.5)

        # Special rooms score (cannot vectorize easily, but fast for small sets)
        if special_rooms:
            requested = set(special_rooms)
            n_requested = len(requested)
            special_scores = np.zeros(len(indices), dtype=np.float32)
            for i, idx in enumerate(indices):
                entry_specials = set(self._entries[int(idx)].get("special", []))
                matched = len(entry_specials & requested)
                special_scores[i] = matched / n_requested
        else:
            special_scores = np.ones(len(indices), dtype=np.float32)

        # Weighted combination
        scores = (
            W_BEDS * bed_scores +
            W_BATHS * bath_scores +
            W_AREA * area_scores +
            W_SPECIAL * special_scores
        )
        return scores
