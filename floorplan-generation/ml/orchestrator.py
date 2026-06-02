"""
GenerationOrchestrator v4 -- Production-Grade Pipeline Coordinator

Coordinates the floorplan generation pipeline with graceful degradation:
  1. Retrieval + Adaptation (fast, reliable)
  2. cGAN Generation + Post-process (creative, GPU-dependent)
  3. Algorithmic Fallback (guaranteed output)

Optimizations:
  - Uses LRU-cached layout extraction (no repeated disk I/O)
  - Thread-safe (no global RNG mutation)
  - Proper timeout awareness
  - Structured logging
"""

from __future__ import annotations

import logging
import random
import time
from typing import Optional, List, Dict, Any

from .layout_db import LayoutDatabase, extract_layout_cached
from .adaptation import LayoutAdaptor, AdaptationTarget
from .gan_generator import CGANEngine
from .validators import full_validation
from .rplan_extractor import BEDROOM_CATS, BATHROOM_CATS, SPECIAL_CATS, ROOM_LABELS

logger = logging.getLogger(__name__)

# Confidence scoring weights
CONF_W_BEDS = 0.30
CONF_W_BATHS = 0.20
CONF_W_AREA = 0.25
CONF_W_SPECIAL = 0.10
CONF_W_VALID = 0.15


class GenerateRequest:
    """Parameters for a generation request."""
    __slots__ = (
        "bedrooms", "bathrooms", "totalArea", "floors",
        "style", "specialRooms", "location", "seed",
        "output_size", "prefer_cgan"
    )

    def __init__(self, bedrooms: int = 3, bathrooms: int = 2, totalArea: float = 1800,
                 floors: int = 1, style: str = "Modern", specialRooms: List[str] = None,
                 location: str = "Lahore", seed: int = None, output_size: int = 900,
                 prefer_cgan: bool = False):
        self.bedrooms = bedrooms
        self.bathrooms = bathrooms
        self.totalArea = totalArea
        self.floors = floors
        self.style = style
        self.specialRooms = specialRooms or []
        self.location = location
        self.seed = seed
        self.output_size = output_size
        self.prefer_cgan = prefer_cgan

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bedrooms": self.bedrooms,
            "bathrooms": self.bathrooms,
            "totalArea": self.totalArea,
            "floors": self.floors,
            "style": self.style,
            "specialRooms": self.specialRooms,
            "location": self.location,
        }


class GenerateResult:
    """Output from the orchestrator."""
    __slots__ = ("layout", "source", "confidence", "generation_time_ms")

    def __init__(self, layout: dict, source: str, confidence: float, generation_time_ms: int = 0):
        self.layout = layout
        self.source = source
        self.confidence = confidence
        self.generation_time_ms = generation_time_ms


class GenerationOrchestrator:
    """
    Coordinates the floorplan generation pipeline.
    Tries engines in priority order until one succeeds.
    Thread-safe: uses local Random instances.
    """

    def __init__(self, layout_db: LayoutDatabase, cgan_engine: Optional[CGANEngine],
                 adaptor: LayoutAdaptor):
        self.layout_db = layout_db
        self.cgan = cgan_engine
        self.adaptor = adaptor

    def generate(self, request: GenerateRequest) -> GenerateResult:
        """
        Main entry point. Returns adapted layout.

        Strategy priority:
          1. Retrieval + Adaptation (fast, reliable)
          2. cGAN + Post-process (creative, GPU-dependent)
          3. Algorithmic fallback (always works)

        If prefer_cgan is True, tries cGAN first.
        """
        t0 = time.time()

        if request.prefer_cgan and self.cgan and self.cgan.is_ready:
            result = self._try_cgan(request)
            if result:
                result.generation_time_ms = int((time.time() - t0) * 1000)
                return result

        # Priority 1: Retrieval + Adaptation
        result = self._try_retrieval(request)
        if result and result.confidence >= 0.4:
            result.generation_time_ms = int((time.time() - t0) * 1000)
            return result

        # Priority 2: cGAN (if available and not already tried)
        if not request.prefer_cgan and self.cgan and self.cgan.is_ready:
            cgan_result = self._try_cgan(request)
            if cgan_result and cgan_result.confidence > (result.confidence if result else 0):
                cgan_result.generation_time_ms = int((time.time() - t0) * 1000)
                return cgan_result

        # Return retrieval result if we got one (even if low confidence)
        if result:
            result.generation_time_ms = int((time.time() - t0) * 1000)
            return result

        # Priority 3: Algorithmic fallback (always works)
        fallback = self._try_algorithmic(request)
        fallback.generation_time_ms = int((time.time() - t0) * 1000)
        return fallback

    def generate_variations(self, request: GenerateRequest, n: int = 4) -> List[GenerateResult]:
        """
        Generate n distinct variations using different retrieval candidates
        and optionally one cGAN variation.
        """
        results = []
        t0 = time.time()

        # Get multiple candidates from retrieval
        candidates = self.layout_db.find_candidates(
            bedrooms=request.bedrooms,
            bathrooms=request.bathrooms,
            area_sqft=request.totalArea,
            special_rooms=request.specialRooms,
            top_k=n + 5,
        )

        target = AdaptationTarget(
            bedrooms=request.bedrooms,
            bathrooms=request.bathrooms,
            area_sqft=request.totalArea,
            special_rooms=request.specialRooms,
            floors=request.floors,
            style=request.style,
        )

        # Generate retrieval-based variations
        retrieval_count = n - 1 if (self.cgan and self.cgan.is_ready) else n

        for candidate in candidates:
            if len(results) >= retrieval_count:
                break

            # Use cached extraction to avoid repeated disk I/O
            layout = extract_layout_cached(candidate["file"])
            if layout is None:
                continue

            adapted = self.adaptor.adapt(layout, target)
            if adapted is None:
                continue

            adapted["source"] = "retrieval_adapted"
            confidence = self._compute_confidence(request, adapted)
            elapsed = int((time.time() - t0) * 1000)
            results.append(GenerateResult(adapted, "retrieval_adapted", confidence, elapsed))

        # Add one cGAN variation if available
        if self.cgan and self.cgan.is_ready and len(results) < n:
            cgan_result = self._try_cgan(request)
            if cgan_result:
                results.append(cgan_result)

        # Fill remaining with algorithmic if needed
        while len(results) < n:
            algo = self._try_algorithmic(request)
            results.append(algo)

        # Sort by confidence descending
        results.sort(key=lambda r: -r.confidence)

        return results[:n]

    # ── Private Methods ──────────────────────────────────────────────────────

    def _try_retrieval(self, request: GenerateRequest) -> Optional[GenerateResult]:
        """Attempt retrieval + adaptation path."""
        try:
            candidates = self.layout_db.find_candidates(
                bedrooms=request.bedrooms,
                bathrooms=request.bathrooms,
                area_sqft=request.totalArea,
                special_rooms=request.specialRooms,
                top_k=5,
            )

            if not candidates:
                logger.info("No retrieval candidates found")
                return None

            target = AdaptationTarget(
                bedrooms=request.bedrooms,
                bathrooms=request.bathrooms,
                area_sqft=request.totalArea,
                special_rooms=request.specialRooms,
                floors=request.floors,
                style=request.style,
            )

            # Try up to 3 candidates
            for candidate in candidates[:3]:
                layout = extract_layout_cached(candidate["file"])
                if layout is None:
                    continue

                adapted = self.adaptor.adapt(layout, target)
                if adapted is None:
                    continue

                adapted["source"] = "retrieval_adapted"
                confidence = self._compute_confidence(request, adapted)

                if confidence >= 0.3:
                    return GenerateResult(adapted, "retrieval_adapted", confidence)

            # Return best effort from first candidate
            if candidates:
                layout = extract_layout_cached(candidates[0]["file"])
                if layout:
                    adapted = self.adaptor.adapt(layout, target)
                    if adapted:
                        adapted["source"] = "retrieval_adapted"
                        confidence = self._compute_confidence(request, adapted)
                        return GenerateResult(adapted, "retrieval_adapted", confidence)

            return None

        except Exception as e:
            logger.error(f"Retrieval path failed: {e}", exc_info=True)
            return None

    def _try_cgan(self, request: GenerateRequest) -> Optional[GenerateResult]:
        """Attempt cGAN generation + adaptation path."""
        if not self.cgan or not self.cgan.is_ready:
            return None

        try:
            params = request.to_dict()
            layout = self.cgan.generate(params, seed=request.seed)

            if layout is None:
                logger.info("cGAN generation returned None")
                return None

            # Adapt the generated layout
            target = AdaptationTarget(
                bedrooms=request.bedrooms,
                bathrooms=request.bathrooms,
                area_sqft=request.totalArea,
                special_rooms=request.specialRooms,
                floors=request.floors,
                style=request.style,
            )

            adapted = self.adaptor.adapt(layout, target)
            if adapted is None:
                return None

            adapted["source"] = "cgan_adapted"
            confidence = self._compute_confidence(request, adapted)

            return GenerateResult(adapted, "cgan_adapted", confidence)

        except Exception as e:
            logger.error(f"cGAN path failed: {e}", exc_info=True)
            return None

    def _try_algorithmic(self, request: GenerateRequest) -> GenerateResult:
        """Algorithmic grid layout fallback. Always succeeds."""
        layout = _generate_algorithmic_layout(
            bedrooms=request.bedrooms,
            bathrooms=request.bathrooms,
            area_sqft=request.totalArea,
            special_rooms=request.specialRooms,
        )
        layout["source"] = "algorithmic"
        confidence = self._compute_confidence(request, layout)
        # Algorithmic confidence is capped
        confidence = min(confidence, 0.5)
        return GenerateResult(layout, "algorithmic", confidence)

    def _compute_confidence(self, request: GenerateRequest, layout: dict) -> float:
        """Score how well the output matches the input request."""
        rooms = layout.get("rooms", [])
        cats = [r["category"] for r in rooms]

        # Bedroom score
        actual_beds = sum(1 for c in cats if c in BEDROOM_CATS)
        bed_score = 1.0 if actual_beds == request.bedrooms else 0.0

        # Bathroom score
        actual_baths = sum(1 for c in cats if c in BATHROOM_CATS)
        bath_score = 1.0 if actual_baths == request.bathrooms else 0.0

        # Area score
        fp_area = layout.get("footprint_area_px", 0)
        if fp_area > 0 and request.totalArea > 0:
            from .adaptation import PX_PER_SQFT_RATIO
            estimated_sqft = fp_area / PX_PER_SQFT_RATIO
            area_ratio = abs(estimated_sqft - request.totalArea) / request.totalArea
            area_score = max(0.0, 1.0 - area_ratio)
        else:
            area_score = 0.5

        # Special rooms score
        if request.specialRooms:
            specials_present = set(layout.get("special", []))
            matched = sum(1 for s in request.specialRooms if s in specials_present)
            special_score = matched / len(request.specialRooms)
        else:
            special_score = 1.0

        # Validation score
        is_valid, violations = full_validation(layout)
        valid_score = 1.0 if is_valid else max(0.3, 1.0 - len(violations) * 0.1)

        confidence = (
            CONF_W_BEDS * bed_score +
            CONF_W_BATHS * bath_score +
            CONF_W_AREA * area_score +
            CONF_W_SPECIAL * special_score +
            CONF_W_VALID * valid_score
        )

        return round(min(1.0, max(0.0, confidence)), 3)


# ── Algorithmic Fallback Layout Generator ────────────────────────────────────

def _generate_algorithmic_layout(bedrooms: int, bathrooms: int,
                                  area_sqft: float, special_rooms: List[str] = None) -> dict:
    """
    Generate a simple grid-based layout algorithmically.
    This always succeeds and provides a guaranteed output.
    """
    special_rooms = special_rooms or []
    from .adaptation import PX_PER_SQFT_RATIO

    # Calculate footprint dimensions
    total_px_area = area_sqft * PX_PER_SQFT_RATIO
    # Assume roughly square footprint with slight width bias
    fp_width = int(min(240, max(80, (total_px_area * 1.2) ** 0.5)))
    fp_height = int(min(240, max(80, total_px_area / fp_width)))

    # Center in 256x256 canvas
    margin = max(8, (256 - max(fp_width, fp_height)) // 2)
    fp_r1 = margin
    fp_c1 = margin
    fp_r2 = fp_r1 + fp_height
    fp_c2 = fp_c1 + fp_width

    # Clamp to canvas
    fp_r2 = min(248, fp_r2)
    fp_c2 = min(248, fp_c2)
    fp_height = fp_r2 - fp_r1
    fp_width = fp_c2 - fp_c1

    # Define rooms to place
    room_specs = []

    # Living room (always first, largest)
    room_specs.append({"category": 0, "name": "LIVING", "weight": 0.20})

    # Kitchen
    room_specs.append({"category": 2, "name": "KITCHEN", "weight": 0.10})

    # Master bedroom
    room_specs.append({"category": 1, "name": "MASTER BEDROOM", "weight": 0.14})

    # Additional bedrooms
    bed_cats = [5, 7, 8]
    for i in range(bedrooms - 1):
        cat = bed_cats[i % len(bed_cats)]
        room_specs.append({"category": cat, "name": "BEDROOM", "weight": 0.10})

    # Bathrooms
    for i in range(bathrooms):
        room_specs.append({"category": 3, "name": "BATH", "weight": 0.05})

    # Special rooms
    special_cat_map = {"study": 6, "balcony": 9, "garage": 11, "storage": 11, "entrance": 10}
    for sp in special_rooms:
        cat = special_cat_map.get(sp.lower(), 11)
        room_specs.append({"category": cat, "name": sp.upper(), "weight": 0.06})

    # Dining (if area allows)
    if area_sqft > 1200:
        room_specs.append({"category": 4, "name": "DINING", "weight": 0.08})

    # Entry
    room_specs.append({"category": 10, "name": "ENTRY", "weight": 0.03})

    # Normalize weights
    total_weight = sum(r["weight"] for r in room_specs)
    for r in room_specs:
        r["weight"] /= total_weight

    # Grid layout
    n_rooms = len(room_specs)
    n_cols = max(2, min(4, int(n_rooms ** 0.5 + 0.5)))
    n_rows = (n_rooms + n_cols - 1) // n_cols

    wall = 3
    avail_h = fp_height - wall * (n_rows + 1)
    avail_w = fp_width - wall * (n_cols + 1)

    rooms = []
    doors = []
    room_idx = 0

    for row in range(n_rows):
        for col in range(n_cols):
            if room_idx >= n_rooms:
                break

            spec = room_specs[room_idx]

            row_h = avail_h // n_rows
            col_w = avail_w // n_cols

            r1 = fp_r1 + wall + row * (row_h + wall)
            c1 = fp_c1 + wall + col * (col_w + wall)
            r2 = r1 + row_h
            c2 = c1 + col_w

            # Clamp to footprint
            r2 = min(r2, fp_r2 - wall)
            c2 = min(c2, fp_c2 - wall)

            if r2 > r1 + 10 and c2 > c1 + 10:
                rooms.append({
                    "category": spec["category"],
                    "name": spec["name"],
                    "centroid": ((r1 + r2) // 2, (c1 + c2) // 2),
                    "bbox": (r1, c1, r2, c2),
                    "area_px": (r2 - r1) * (c2 - c1),
                })
                doors.append((r2, (c1 + c2) // 2))

            room_idx += 1

    # Compute special list from placed rooms
    cats = [r["category"] for r in rooms]
    specials_placed = [SPECIAL_CATS[c] for c in cats if c in SPECIAL_CATS]

    return {
        "footprint_bbox": (fp_r1, fp_c1, fp_r2, fp_c2),
        "footprint_area_px": fp_height * fp_width,
        "rooms": rooms,
        "doors": doors,
        "bedrooms": sum(1 for c in cats if c in BEDROOM_CATS),
        "bathrooms": sum(1 for c in cats if c in BATHROOM_CATS),
        "living_rooms": sum(1 for c in cats if c in {0, 4}),
        "special": specials_placed,
        "source": "algorithmic",
    }
