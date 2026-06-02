"""
CGANEngine -- cGAN Inference Wrapper v4 (Production)

Loads the trained Generator checkpoint, encodes user requirements to a
27-dim condition vector, generates a 256x256 layout image, then
post-processes the output to extract room boundaries and build a layout dict.

Used as the secondary generation mode when k-NN retrieval cannot find
a sufficiently good match.

Fixes applied:
  - scipy.ndimage.label for connected-component extraction (was pure-Python flood-fill)
  - Local torch.Generator for thread-safe RNG (no global seed mutation)
  - Correct footprint area calculation (no bitwise & on scalars)
  - Better error messages for architecture mismatches
  - GPU memory release on unload
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    from scipy.ndimage import label as ndimage_label
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

from .config import ModelConfig, ConditionConfig
from .utils import encode_condition
from .rplan_extractor import ROOM_LABELS, BEDROOM_CATS, BATHROOM_CATS, SPECIAL_CATS

logger = logging.getLogger(__name__)

# ── Color palette for room segmentation from cGAN output ─────────────────────
# These are the colors the cGAN has learned to produce for each room type
ROOM_COLORS = {
    0:  (255, 215, 0),     # Living room - gold
    1:  (0, 80, 200),      # Master bedroom - dark blue
    2:  (255, 182, 193),   # Kitchen - pink
    3:  (0, 255, 255),     # Bathroom - cyan
    4:  (255, 255, 0),     # Dining - yellow
    5:  (0, 123, 255),     # Bedroom - blue
    6:  (128, 0, 128),     # Study - purple
    7:  (0, 100, 200),     # Guest bed 1 - blue variant
    8:  (50, 50, 200),     # Guest bed 2 - blue variant
    9:  (255, 128, 0),     # Balcony - orange
    10: (0, 255, 0),       # Entry - green
    11: (139, 69, 19),     # Storage - brown
}

# Pre-compute color array for vectorized classification
_COLOR_KEYS = sorted(ROOM_COLORS.keys())
_COLOR_ARRAY = np.array([ROOM_COLORS[k] for k in _COLOR_KEYS], dtype=np.float32)

# Minimum component size in pixels to count as a room
MIN_COMPONENT_AREA = 100


class CGANEngine:
    """
    Manages the trained cGAN Generator model.
    Loads weights from checkpoint at startup, runs inference on GPU.
    Thread-safe: uses local RNG generators.
    """

    def __init__(self, checkpoint_path: str = "checkpoints/latest.pth",
                 device: str = None):
        self.checkpoint_path = Path(checkpoint_path)
        self.device = device
        self.generator = None
        self.ready = False
        self._epoch = 0
        self._cfg = ModelConfig()
        self._cond_cfg = ConditionConfig()

    def load(self) -> bool:
        """
        Load Generator weights from checkpoint.
        Returns True if successful, False if GPU unavailable or checkpoint missing.
        """
        if not TORCH_AVAILABLE:
            logger.warning("PyTorch not available, cGAN disabled")
            return False

        # Determine device
        if self.device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
            else:
                self.device = "cpu"
                logger.info("No CUDA GPU detected, using CPU (will be slower)")

        if not self.checkpoint_path.exists():
            logger.warning(f"Checkpoint not found: {self.checkpoint_path}")
            return False

        try:
            from .model import Generator

            logger.info(f"Loading checkpoint from {self.checkpoint_path}...")
            t0 = time.time()

            checkpoint = torch.load(
                str(self.checkpoint_path),
                map_location=self.device,
                weights_only=False,
            )

            # Instantiate Generator
            self.generator = Generator(self._cfg)

            # Load state dict with explicit mismatch handling
            try:
                if "G" in checkpoint:
                    self.generator.load_state_dict(checkpoint["G"])
                    self._epoch = checkpoint.get("epoch", 0)
                elif "generator" in checkpoint:
                    self.generator.load_state_dict(checkpoint["generator"])
                    self._epoch = checkpoint.get("epoch", 0)
                else:
                    self.generator.load_state_dict(checkpoint)
            except RuntimeError as e:
                if "size mismatch" in str(e):
                    logger.error(
                        f"Architecture mismatch between ModelConfig and checkpoint. "
                        f"Ensure ModelConfig matches training config. Error: {e}"
                    )
                else:
                    logger.error(f"Failed to load state dict: {e}")
                self.ready = False
                return False

            # Move to device and set eval mode
            self.generator = self.generator.to(self.device)
            self.generator.eval()

            # Warm up with one dummy forward pass
            with torch.no_grad():
                dummy_z = torch.randn(1, self._cfg.noise_dim, device=self.device)
                dummy_cond = torch.zeros(1, self._cond_cfg.input_dim, device=self.device)
                _ = self.generator(dummy_z, dummy_cond)

            self.ready = True
            elapsed = time.time() - t0
            logger.info(
                f"Generator loaded on {self.device} "
                f"(epoch {self._epoch}, {elapsed:.1f}s)"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to load generator: {e}", exc_info=True)
            self.ready = False
            return False

    def unload(self):
        """Release GPU memory."""
        if self.generator is not None:
            del self.generator
            self.generator = None
        self.ready = False
        if TORCH_AVAILABLE and torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info("cGAN engine unloaded, GPU memory released")

    def offload_to_cpu(self):
        """Move model to CPU to free VRAM (stays ready for inference, just slower)."""
        if self.generator is not None and TORCH_AVAILABLE:
            self.generator = self.generator.to("cpu")
            self.device = "cpu"
            torch.cuda.empty_cache()
            logger.info("cGAN offloaded to CPU")

    def generate(self, params: Dict[str, Any], seed: Optional[int] = None) -> Optional[dict]:
        """
        Generate a floorplan layout dict from user parameters.

        Steps:
          1. Encode condition vector from params
          2. Sample noise (with optional seed via local Generator)
          3. Forward pass through Generator
          4. Convert output image to numpy
          5. Segment into room layout dict
          6. Return layout dict (same schema as rplan_extractor output)
        """
        if not self.ready or self.generator is None:
            return None

        try:
            with torch.no_grad():
                # Encode condition
                cond = encode_condition(params).unsqueeze(0).to(self.device)

                # Sample noise with local generator (thread-safe)
                gen = torch.Generator(device=self.device)
                if seed is not None:
                    gen.manual_seed(seed)
                else:
                    gen.seed()  # Random seed
                z = torch.randn(1, self._cfg.noise_dim, device=self.device, generator=gen)

                # Forward pass
                output = self.generator(z, cond)  # (1, 3, 256, 256)

                # Convert to numpy image [0, 255]
                img_tensor = output[0].cpu().clamp(-1, 1)
                img_np = ((img_tensor + 1) / 2 * 255).byte().permute(1, 2, 0).numpy()

            # Segment into layout dict
            layout = self._segment_output(img_np, params)
            if layout is not None:
                layout["source"] = "cgan_generated"
            return layout

        except Exception as e:
            logger.error(f"Generation failed: {e}", exc_info=True)
            return None

    def generate_batch(self, params: Dict[str, Any], n: int = 4) -> List[dict]:
        """
        Generate n variations using different noise seeds.
        Returns list of layout dicts.
        """
        if not self.ready or self.generator is None:
            return []

        results = []
        base_seed = hash(str(sorted(params.items()))) % 2**31

        try:
            with torch.no_grad():
                cond = encode_condition(params).unsqueeze(0).to(self.device)

                for i in range(n):
                    gen = torch.Generator(device=self.device)
                    gen.manual_seed(base_seed + i * 37)
                    z = torch.randn(1, self._cfg.noise_dim, device=self.device, generator=gen)

                    output = self.generator(z, cond)
                    img_tensor = output[0].cpu().clamp(-1, 1)
                    img_np = ((img_tensor + 1) / 2 * 255).byte().permute(1, 2, 0).numpy()

                    layout = self._segment_output(img_np, params)
                    if layout is not None:
                        layout["source"] = "cgan_generated"
                        results.append(layout)

        except Exception as e:
            logger.error(f"Batch generation failed: {e}", exc_info=True)

        return results

    @property
    def is_ready(self) -> bool:
        return self.ready and self.generator is not None

    @property
    def epoch(self) -> int:
        return self._epoch

    @property
    def device_name(self) -> str:
        if not TORCH_AVAILABLE:
            return "unavailable"
        if self.device == "cuda" and torch.cuda.is_available():
            return torch.cuda.get_device_name(0)
        return str(self.device)

    @property
    def gpu_vram_mb(self) -> int:
        if not TORCH_AVAILABLE or not torch.cuda.is_available():
            return 0
        try:
            return torch.cuda.get_device_properties(0).total_mem // (1024 * 1024)
        except Exception:
            return 0

    # ── Private Methods ──────────────────────────────────────────────────────

    def _segment_output(self, image: np.ndarray, params: Dict[str, Any]) -> Optional[dict]:
        """
        Extract structured room layout from a 256x256 RGB image.
        Uses color-based classification + connected components (scipy).
        """
        h, w = image.shape[:2]

        # Step 1: Identify wall pixels (very dark)
        gray = np.mean(image, axis=2)
        wall_mask = gray < 40

        # Step 2: Identify background (white/near-white)
        background_mask = np.all(image > 220, axis=2) | (gray > 240)

        # Step 3: Interior mask (not wall, not background)
        interior_mask = ~wall_mask & ~background_mask

        if interior_mask.sum() < 500:
            return None

        # Step 4: Find connected components using scipy (fast, correct)
        rooms = self._find_rooms_connected_components(image, interior_mask, wall_mask)

        if not rooms:
            return None

        # Step 5: Compute footprint
        fp_rows = np.any(~background_mask, axis=1)
        fp_cols = np.any(~background_mask, axis=0)

        if not fp_rows.any() or not fp_cols.any():
            return None

        row_indices = np.where(fp_rows)[0]
        col_indices = np.where(fp_cols)[0]
        r1 = int(row_indices[0])
        r2 = int(row_indices[-1])
        c1 = int(col_indices[0])
        c2 = int(col_indices[-1])

        # Correct footprint area: everything that isn't background
        footprint_area_px = int((~background_mask).sum())

        # Step 6: Detect doors (thin gaps in walls)
        doors = self._detect_doors(wall_mask, rooms)

        # Step 7: Build layout dict
        cats = [r["category"] for r in rooms]
        bedrooms = sum(1 for c in cats if c in BEDROOM_CATS)
        bathrooms = sum(1 for c in cats if c in BATHROOM_CATS)
        special = [SPECIAL_CATS[c] for c in cats if c in SPECIAL_CATS]

        return {
            "footprint_bbox": (r1, c1, r2, c2),
            "footprint_area_px": footprint_area_px,
            "rooms": rooms,
            "doors": doors,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "living_rooms": sum(1 for c in cats if c in {0, 4}),
            "special": special,
            "source": "cgan_generated",
        }

    def _find_rooms_connected_components(self, image: np.ndarray,
                                          interior_mask: np.ndarray,
                                          wall_mask: np.ndarray) -> List[dict]:
        """
        Find rooms using connected components on interior regions separated by walls.
        Uses scipy.ndimage.label for fast extraction (vs pure-Python flood-fill).
        Falls back to stride-based flood-fill if scipy unavailable.
        """
        if SCIPY_AVAILABLE:
            return self._find_rooms_scipy(image, interior_mask, wall_mask)
        else:
            return self._find_rooms_fallback(image, interior_mask, wall_mask)

    def _find_rooms_scipy(self, image: np.ndarray,
                           interior_mask: np.ndarray,
                           wall_mask: np.ndarray) -> List[dict]:
        """Fast connected-component extraction using scipy.ndimage.label."""
        # Label connected components in interior (excluding walls)
        room_mask = interior_mask & ~wall_mask
        labeled, num_features = ndimage_label(room_mask)

        rooms = []
        for comp_id in range(1, num_features + 1):
            component_mask = labeled == comp_id
            area = int(component_mask.sum())

            # Skip tiny components (noise)
            if area < MIN_COMPONENT_AREA:
                continue

            # Compute bbox
            rows, cols = np.where(component_mask)
            r_min, r_max = int(rows.min()), int(rows.max())
            c_min, c_max = int(cols.min()), int(cols.max())

            # Compute mean color for classification (sample for speed)
            if area > 1000:
                # Sample up to 1000 pixels for large components
                step = max(1, area // 1000)
                sample_rows = rows[::step]
                sample_cols = cols[::step]
                colors = image[sample_rows, sample_cols].astype(np.float32)
            else:
                colors = image[rows, cols].astype(np.float32)

            mean_color = colors.mean(axis=0)

            # Classify room by color (vectorized)
            category = self._classify_room_color_vectorized(mean_color)

            rooms.append({
                "category": category,
                "name": ROOM_LABELS.get(category, "ROOM"),
                "centroid": (int((r_min + r_max) // 2), int((c_min + c_max) // 2)),
                "bbox": (r_min, c_min, r_max, c_max),
                "area_px": area,
            })

        return rooms

    def _find_rooms_fallback(self, image: np.ndarray,
                              interior_mask: np.ndarray,
                              wall_mask: np.ndarray) -> List[dict]:
        """
        Fallback flood-fill for when scipy is unavailable.
        Uses strided seed points but marks all visited pixels.
        """
        h, w = interior_mask.shape
        visited = np.zeros((h, w), dtype=bool)
        rooms = []
        room_mask = interior_mask & ~wall_mask

        for start_r in range(0, h, 4):
            for start_c in range(0, w, 4):
                if visited[start_r, start_c] or not room_mask[start_r, start_c]:
                    continue

                # Flood fill
                component_pixels = []
                stack = [(start_r, start_c)]
                visited[start_r, start_c] = True

                while stack:
                    r, c = stack.pop()
                    component_pixels.append((r, c))

                    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < h and 0 <= nc < w:
                            if not visited[nr, nc] and room_mask[nr, nc]:
                                visited[nr, nc] = True
                                stack.append((nr, nc))

                if len(component_pixels) < MIN_COMPONENT_AREA:
                    continue

                pixels_arr = np.array(component_pixels)
                r_min, c_min = pixels_arr.min(axis=0)
                r_max, c_max = pixels_arr.max(axis=0)

                colors = image[pixels_arr[:, 0], pixels_arr[:, 1]].astype(np.float32)
                mean_color = colors.mean(axis=0)

                category = self._classify_room_color_vectorized(mean_color)

                rooms.append({
                    "category": category,
                    "name": ROOM_LABELS.get(category, "ROOM"),
                    "centroid": (int((r_min + r_max) // 2), int((c_min + c_max) // 2)),
                    "bbox": (int(r_min), int(c_min), int(r_max), int(c_max)),
                    "area_px": len(component_pixels),
                })

        return rooms

    def _classify_room_color_vectorized(self, mean_color: np.ndarray) -> int:
        """
        Map mean RGB color to RPLAN category index using vectorized nearest-neighbor.
        """
        # Compute squared distance to all reference colors at once
        diff = _COLOR_ARRAY - mean_color.reshape(1, 3)
        dists = (diff * diff).sum(axis=1)
        best_idx = int(dists.argmin())
        return _COLOR_KEYS[best_idx]

    def _detect_doors(self, wall_mask: np.ndarray, rooms: List[dict]) -> List[tuple]:
        """
        Find door positions: thin breaks in walls between rooms.
        A door is a gap in the wall segment between adjacent rooms.
        """
        doors = []
        h, w = wall_mask.shape

        for i in range(len(rooms)):
            for j in range(i + 1, len(rooms)):
                r1 = rooms[i]["bbox"]
                r2 = rooms[j]["bbox"]

                # Right-left adjacency
                if abs(r1[3] - r2[1]) < 8:
                    overlap_top = max(r1[0], r2[0])
                    overlap_bot = min(r1[2], r2[2])
                    if overlap_bot > overlap_top + 5:
                        col = (r1[3] + r2[1]) // 2
                        mid_row = (overlap_top + overlap_bot) // 2
                        if 0 <= mid_row < h and 0 <= col < w:
                            doors.append((mid_row, col))

                # Left-right adjacency
                elif abs(r2[3] - r1[1]) < 8:
                    overlap_top = max(r1[0], r2[0])
                    overlap_bot = min(r1[2], r2[2])
                    if overlap_bot > overlap_top + 5:
                        col = (r2[3] + r1[1]) // 2
                        mid_row = (overlap_top + overlap_bot) // 2
                        if 0 <= mid_row < h and 0 <= col < w:
                            doors.append((mid_row, col))

                # Bottom-top adjacency
                elif abs(r1[2] - r2[0]) < 8:
                    overlap_left = max(r1[1], r2[1])
                    overlap_right = min(r1[3], r2[3])
                    if overlap_right > overlap_left + 5:
                        row = (r1[2] + r2[0]) // 2
                        mid_col = (overlap_left + overlap_right) // 2
                        if 0 <= row < h and 0 <= mid_col < w:
                            doors.append((row, mid_col))

                # Top-bottom adjacency
                elif abs(r2[2] - r1[0]) < 8:
                    overlap_left = max(r1[1], r2[1])
                    overlap_right = min(r1[3], r2[3])
                    if overlap_right > overlap_left + 5:
                        row = (r2[2] + r1[0]) // 2
                        mid_col = (overlap_left + overlap_right) // 2
                        if 0 <= row < h and 0 <= mid_col < w:
                            doors.append((row, mid_col))

        return doors[:20]  # Cap at 20 doors
