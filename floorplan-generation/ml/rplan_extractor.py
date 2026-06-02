"""
RPLAN Layout Extractor
Converts raw RPLAN pickle files into structured room-layout dicts
that the renderer and layout database consume.

Layout dict schema:
{
  'footprint_bbox': (r1, c1, r2, c2),   # bounding box in 256-px space
  'footprint_area_px': int,
  'rooms': [
    {
      'category': int,
      'name': str,
      'centroid': (row, col),
      'bbox': (r1, c1, r2, c2),         # Voronoi bbox in 256-px space
      'area_px': int,
    },
    ...
  ],
  'doors': [(row, col), ...],           # door pixel positions (sampled)
  'bedrooms': int,
  'bathrooms': int,
  'living_rooms': int,
  'special': [str],                     # 'balcony','study','garage',...
  'source': str,                        # pickle filename
}
"""

import pickle
import numpy as np
from pathlib import Path

try:
    from scipy.ndimage import distance_transform_edt
    _SCIPY = True
except ImportError:
    _SCIPY = False

# ── Category metadata ────────────────────────────────────────────────────────

ROOM_LABELS = {
    0: "LIVING",           1: "MASTER BEDROOM",  2: "KITCHEN",
    3: "BATH",             4: "DINING",           5: "BEDROOM",
    6: "STUDY",            7: "BEDROOM",          8: "BEDROOM",
    9: "BALCONY",          10: "ENTRY",           11: "STORAGE",
}

BEDROOM_CATS  = {1, 5, 7, 8}
BATHROOM_CATS = {3}
LIVING_CATS   = {0, 4}
KITCHEN_CATS  = {2}
SPECIAL_CATS  = {6: "study", 9: "balcony", 10: "entrance", 11: "storage"}

_MAX_DOOR_SAMPLES = 20   # max door arc positions per plan


def extract_layout(pkl_path) -> dict | None:
    """
    Extract a structured layout dict from one RPLAN .pkl file.
    Returns None if the file is invalid/empty.
    """
    try:
        with open(pkl_path, "rb") as f:
            data = pickle.load(f)
    except Exception:
        return None

    boundary = np.array(data[0], dtype=np.uint8)   # 255=inside house
    walls    = np.array(data[2], dtype=np.uint8)   # 1=wall pixel
    door_map = np.array(data[3], dtype=np.uint8)   # 1=door pixel
    rooms_raw = data[4]                             # [{category, centroid}]

    if not rooms_raw:
        return None

    size = boundary.shape[0]  # typically 256
    footprint = boundary > 127

    if not footprint.any():
        return None

    # ── Footprint bounding box ───────────────────────────────────────
    rows_any = np.any(footprint, axis=1)
    cols_any = np.any(footprint, axis=0)
    r1, r2 = int(np.where(rows_any)[0][[0, -1]].tolist()[0]), int(np.where(rows_any)[0][-1])
    c1, c2 = int(np.where(cols_any)[0][0]), int(np.where(cols_any)[0][-1])
    footprint_area_px = int(footprint.sum())

    # ── Voronoi room segmentation ────────────────────────────────────
    if _SCIPY and len(rooms_raw) > 0:
        seed = np.zeros((size, size), dtype=np.int32)
        for i, room in enumerate(rooms_raw):
            cy, cx = room.get("centroid", (size // 2, size // 2))
            cy = max(0, min(size - 1, int(cy)))
            cx = max(0, min(size - 1, int(cx)))
            seed[cy, cx] = i + 1

        _, nearest = distance_transform_edt(seed == 0, return_indices=True)
        nr, nc = nearest
        room_map = seed[nr, nc] - 1   # 0-based room index per pixel
    else:
        # Fallback: nearest-centroid via numpy brute force (slow but works)
        centroids = []
        for room in rooms_raw:
            cy, cx = room.get("centroid", (size // 2, size // 2))
            centroids.append((int(cy), int(cx)))
        yy, xx = np.mgrid[0:size, 0:size]
        room_map = np.zeros((size, size), dtype=np.int32)
        best_dist = np.full((size, size), 1e9)
        for i, (cy, cx) in enumerate(centroids):
            dist = (yy - cy) ** 2 + (xx - cx) ** 2
            closer = dist < best_dist
            room_map[closer] = i
            best_dist[closer] = dist[closer]

    floor_mask = footprint & (walls == 0)

    # ── Extract per-room bboxes ──────────────────────────────────────
    rooms_out = []
    for i, room in enumerate(rooms_raw):
        cat = int(room.get("category", 0))
        centroid = room.get("centroid", (size // 2, size // 2))
        mask = (room_map == i) & floor_mask
        if not mask.any():
            continue
        rr, cc = np.where(mask)
        rooms_out.append({
            "category":  cat,
            "name":      ROOM_LABELS.get(cat, "ROOM"),
            "centroid":  (int(centroid[0]), int(centroid[1])),
            "bbox":      (int(rr.min()), int(cc.min()), int(rr.max()), int(cc.max())),
            "area_px":   int(mask.sum()),
        })

    if not rooms_out:
        return None

    # ── Door positions (sample up to _MAX_DOOR_SAMPLES) ─────────────
    door_pixels = np.argwhere((door_map > 0) & footprint)
    if len(door_pixels) > _MAX_DOOR_SAMPLES:
        idx = np.linspace(0, len(door_pixels) - 1, _MAX_DOOR_SAMPLES, dtype=int)
        door_pixels = door_pixels[idx]
    doors = [(int(r), int(c)) for r, c in door_pixels]

    # ── Summary counts ───────────────────────────────────────────────
    cats = [r["category"] for r in rooms_out]
    bedrooms    = sum(1 for c in cats if c in BEDROOM_CATS)
    bathrooms   = sum(1 for c in cats if c in BATHROOM_CATS)
    living_rooms = sum(1 for c in cats if c in LIVING_CATS)
    special     = [SPECIAL_CATS[c] for c in cats if c in SPECIAL_CATS]

    return {
        "footprint_bbox":     (r1, c1, r2, c2),
        "footprint_area_px":  footprint_area_px,
        "rooms":              rooms_out,
        "doors":              doors,
        "bedrooms":           bedrooms,
        "bathrooms":          bathrooms,
        "living_rooms":       living_rooms,
        "special":            special,
        "source":             str(pkl_path),
    }
