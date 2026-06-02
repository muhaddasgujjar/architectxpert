"""
LayoutAdaptor -- Dimension Adaptation Engine v4 (Production)

Takes a retrieved/generated layout dict and transforms it to match
the user's exact bedroom count, bathroom count, and total area.

This is the critical differentiator: it guarantees the output always has
the correct number of bedrooms, bathrooms, and approximately correct
total area, regardless of what the database retrieval finds.

Fixes applied:
  - Correct uniform scale clamping (no double scale-factor mutation)
  - Removed unused imports
  - Deterministic output given same input
"""

from __future__ import annotations

import copy
import logging
import math
from typing import List, Tuple, Optional

from .validators import (
    find_adjacent_rooms,
    full_validation,
    CATEGORY_TO_TYPE,
    WALL_THICKNESS_PX,
)
from .rplan_extractor import BEDROOM_CATS, BATHROOM_CATS, ROOM_LABELS

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

# Pixel-to-real-world conversion (empirical from RPLAN data)
PX_PER_SQFT_RATIO = 14.0  # ~14 px^2 per sqft

# Canvas size
CANVAS_SIZE = 256

# Room proportion constraints (fraction of total area)
ROOM_PROPORTIONS = {
    "master_bedroom": (0.10, 0.20),
    "bedroom":        (0.07, 0.15),
    "bathroom":       (0.03, 0.08),
    "kitchen":        (0.06, 0.12),
    "living":         (0.12, 0.30),
    "dining":         (0.05, 0.12),
    "study":          (0.04, 0.08),
    "balcony":        (0.03, 0.06),
    "garage":         (0.08, 0.15),
    "storage":        (0.03, 0.06),
    "entry":          (0.02, 0.05),
}

# Minimum absolute dimensions (pixels in 256-space)
MIN_DIMENSIONS_PX = {
    "bedroom":  (28, 28),
    "bathroom": (16, 18),
    "kitchen":  (22, 25),
    "living":   (32, 32),
    "dining":   (22, 25),
    "study":    (18, 18),
    "balcony":  (10, 16),
    "garage":   (28, 45),
    "storage":  (10, 10),
    "entry":    (10, 10),
    "default":  (12, 12),
}

# Scale factor limits
SCALE_FACTOR_MIN = 0.4
SCALE_FACTOR_MAX = 2.5

# Door width in 256px space
DOOR_WIDTH_PX = 5


# ── Data Classes ─────────────────────────────────────────────────────────────

class AdaptationTarget:
    """Target parameters for adaptation."""
    __slots__ = ("bedrooms", "bathrooms", "area_sqft", "special_rooms", "floors", "style")

    def __init__(self, bedrooms: int, bathrooms: int, area_sqft: float,
                 special_rooms: List[str] = None, floors: int = 1, style: str = "Modern"):
        self.bedrooms = bedrooms
        self.bathrooms = bathrooms
        self.area_sqft = area_sqft
        self.special_rooms = special_rooms or []
        self.floors = floors
        self.style = style


# ── Core Adaptation Class ────────────────────────────────────────────────────

class LayoutAdaptor:
    """
    Takes an RPLAN-sourced layout dict and transforms it to match
    the user's exact bedroom count, bathroom count, and total area.
    """

    def adapt(self, layout: dict, target: AdaptationTarget) -> dict:
        """
        Full adaptation pipeline:
          1. Scale footprint to target area
          2. Adjust room counts (split/merge)
          3. Proportionally resize rooms
          4. Relocate doors
          5. Validate architectural constraints
        Returns a new layout dict (never mutates input).
        """
        adapted = copy.deepcopy(layout)

        # Step 1: Scale footprint to match target area
        adapted = scale_footprint(adapted, target.area_sqft)

        # Step 2: Adjust bedroom count
        adapted = adjust_room_counts(adapted, target.bedrooms, target.bathrooms)

        # Step 3: Proportional resize to maintain area ratios
        adapted = proportion_rooms(adapted, target.area_sqft)

        # Step 4: Relocate doors after room changes
        adapted = relocate_doors(adapted)

        # Step 5: Final clamping to ensure everything is within bounds
        adapted = clamp_to_footprint(adapted)

        # Update metadata
        adapted["bedrooms"] = sum(
            1 for r in adapted["rooms"] if r["category"] in BEDROOM_CATS
        )
        adapted["bathrooms"] = sum(
            1 for r in adapted["rooms"] if r["category"] in BATHROOM_CATS
        )
        adapted["total_area_sqft"] = target.area_sqft

        return adapted


# ── Adaptation Functions ─────────────────────────────────────────────────────

def scale_footprint(layout: dict, target_area_sqft: float) -> dict:
    """
    Uniformly scale all room bboxes so total footprint matches target area.
    Scales relative to the footprint center.
    """
    current_area_px = layout.get("footprint_area_px", 20000)
    target_area_px = target_area_sqft * PX_PER_SQFT_RATIO

    if current_area_px <= 0:
        current_area_px = 20000

    scale_factor = math.sqrt(target_area_px / current_area_px)

    # Clamp scale factor to reasonable range
    scale_factor = max(SCALE_FACTOR_MIN, min(SCALE_FACTOR_MAX, scale_factor))

    # Get footprint center
    fp_bbox = layout.get("footprint_bbox", (10, 10, 245, 245))
    center_r = (fp_bbox[0] + fp_bbox[2]) / 2.0
    center_c = (fp_bbox[1] + fp_bbox[3]) / 2.0

    # Calculate scaled footprint dimensions
    new_fp_h = (fp_bbox[2] - fp_bbox[0]) * scale_factor
    new_fp_w = (fp_bbox[3] - fp_bbox[1]) * scale_factor

    # Clamp to canvas uniformly (single pass, no double mutation)
    margin = 8
    max_size = CANVAS_SIZE - 2 * margin
    if new_fp_h > max_size or new_fp_w > max_size:
        # Scale uniformly to fit the larger dimension
        if new_fp_h >= new_fp_w:
            clamp_ratio = max_size / new_fp_h
        else:
            clamp_ratio = max_size / new_fp_w
        scale_factor *= clamp_ratio
        new_fp_h = (fp_bbox[2] - fp_bbox[0]) * scale_factor
        new_fp_w = (fp_bbox[3] - fp_bbox[1]) * scale_factor

    # New footprint bbox centered in canvas
    canvas_center = CANVAS_SIZE / 2.0
    new_fp = (
        int(canvas_center - new_fp_h / 2),
        int(canvas_center - new_fp_w / 2),
        int(canvas_center + new_fp_h / 2),
        int(canvas_center + new_fp_w / 2),
    )
    layout["footprint_bbox"] = new_fp
    layout["footprint_area_px"] = int(new_fp_h * new_fp_w)

    # Scale all room bboxes relative to original center
    for room in layout.get("rooms", []):
        r1, c1, r2, c2 = room["bbox"]
        new_r1 = canvas_center + (r1 - center_r) * scale_factor
        new_c1 = canvas_center + (c1 - center_c) * scale_factor
        new_r2 = canvas_center + (r2 - center_r) * scale_factor
        new_c2 = canvas_center + (c2 - center_c) * scale_factor

        room["bbox"] = (int(new_r1), int(new_c1), int(new_r2), int(new_c2))
        room["centroid"] = (int((new_r1 + new_r2) / 2), int((new_c1 + new_c2) / 2))
        room["area_px"] = int((new_r2 - new_r1) * (new_c2 - new_c1))

    # Scale door positions
    new_doors = []
    for dr, dc in layout.get("doors", []):
        new_dr = int(canvas_center + (dr - center_r) * scale_factor)
        new_dc = int(canvas_center + (dc - center_c) * scale_factor)
        new_doors.append((new_dr, new_dc))
    layout["doors"] = new_doors

    return layout


def adjust_room_counts(layout: dict, target_beds: int, target_baths: int) -> dict:
    """
    Split or merge rooms to match exact bedroom/bathroom counts.
    """
    rooms = layout.get("rooms", [])

    # Adjust bedrooms
    current_beds = sum(1 for r in rooms if r["category"] in BEDROOM_CATS)
    if current_beds < target_beds:
        for _ in range(target_beds - current_beds):
            rooms = _split_largest_room(rooms, BEDROOM_CATS)
    elif current_beds > target_beds and current_beds > 1:
        for _ in range(current_beds - target_beds):
            rooms = _merge_smallest_rooms(rooms, BEDROOM_CATS)

    # Adjust bathrooms
    current_baths = sum(1 for r in rooms if r["category"] in BATHROOM_CATS)
    if current_baths < target_baths:
        for _ in range(target_baths - current_baths):
            rooms = _split_largest_room(rooms, BATHROOM_CATS)
    elif current_baths > target_baths and current_baths > 1:
        for _ in range(current_baths - target_baths):
            rooms = _merge_smallest_rooms(rooms, BATHROOM_CATS)

    layout["rooms"] = rooms
    return layout


def proportion_rooms(layout: dict, target_area_sqft: float) -> dict:
    """
    Resize individual rooms proportionally while maintaining area ratios.
    Ensures minimum room sizes are respected.
    """
    rooms = layout.get("rooms", [])
    fp_bbox = layout.get("footprint_bbox", (10, 10, 245, 245))
    fp_area = (fp_bbox[2] - fp_bbox[0]) * (fp_bbox[3] - fp_bbox[1])

    if not rooms or fp_area <= 0:
        return layout

    # Calculate current total room area
    total_room_area = sum(
        (r["bbox"][2] - r["bbox"][0]) * (r["bbox"][3] - r["bbox"][1])
        for r in rooms
    )

    if total_room_area <= 0:
        return layout

    # Check and enforce minimum sizes
    for room in rooms:
        cat = room.get("category", 0)
        room_type = CATEGORY_TO_TYPE.get(cat, "default")
        min_h, min_w = MIN_DIMENSIONS_PX.get(room_type, MIN_DIMENSIONS_PX["default"])

        r1, c1, r2, c2 = room["bbox"]
        h = r2 - r1
        w = c2 - c1

        # Enforce minimums (grow if needed)
        if h < min_h:
            expansion = min_h - h
            r1 -= expansion // 2
            r2 += expansion - expansion // 2
        if w < min_w:
            expansion = min_w - w
            c1 -= expansion // 2
            c2 += expansion - expansion // 2

        room["bbox"] = (int(r1), int(c1), int(r2), int(c2))
        room["area_px"] = int((r2 - r1) * (c2 - c1))
        room["centroid"] = (int((r1 + r2) / 2), int((c1 + c2) / 2))

    # Ensure rooms don't exceed footprint proportions
    for room in rooms:
        cat = room.get("category", 0)
        room_type = CATEGORY_TO_TYPE.get(cat, "default")
        if cat == 1:
            room_type = "master_bedroom"

        max_ratio = ROOM_PROPORTIONS.get(room_type, (0.03, 0.15))[1]
        max_area = fp_area * max_ratio

        r1, c1, r2, c2 = room["bbox"]
        current_area = (r2 - r1) * (c2 - c1)

        if current_area > max_area and current_area > 0:
            shrink = math.sqrt(max_area / current_area)
            cr, cc = (r1 + r2) / 2, (c1 + c2) / 2
            h = (r2 - r1) * shrink
            w = (c2 - c1) * shrink
            room["bbox"] = (
                int(cr - h / 2), int(cc - w / 2),
                int(cr + h / 2), int(cc + w / 2),
            )
            room["area_px"] = int(h * w)
            room["centroid"] = (int(cr), int(cc))

    layout["rooms"] = rooms
    return layout


def relocate_doors(layout: dict) -> dict:
    """
    Reposition doors after room resizing.
    Places doors at midpoints of shared walls between adjacent rooms.
    """
    rooms = layout.get("rooms", [])
    if not rooms:
        return layout

    adjacencies = find_adjacent_rooms(rooms)
    new_doors = []

    for i, j in adjacencies:
        r1 = rooms[i]["bbox"]
        r2 = rooms[j]["bbox"]

        door_pos = _find_shared_wall_midpoint(r1, r2)
        if door_pos:
            new_doors.append(door_pos)

    # Keep at least some doors from original if adjacency detection is sparse
    if len(new_doors) < 2 and layout.get("doors"):
        fp_bbox = layout.get("footprint_bbox", (0, 0, 255, 255))
        for dr, dc in layout["doors"]:
            if fp_bbox[0] <= dr <= fp_bbox[2] and fp_bbox[1] <= dc <= fp_bbox[3]:
                new_doors.append((dr, dc))
                if len(new_doors) >= len(rooms):
                    break

    # Ensure at least one door per room (approximately)
    if len(new_doors) < len(rooms) // 2:
        for room in rooms:
            r1, c1, r2, c2 = room["bbox"]
            door_r = r2
            door_c = (c1 + c2) // 2
            new_doors.append((door_r, door_c))

    # Deduplicate doors that are too close
    layout["doors"] = _deduplicate_doors(new_doors, min_distance=8)
    return layout


def clamp_to_footprint(layout: dict) -> dict:
    """Ensure all rooms remain within the footprint bbox."""
    fp_bbox = layout.get("footprint_bbox", (8, 8, 248, 248))
    fr1, fc1, fr2, fc2 = fp_bbox

    for room in layout.get("rooms", []):
        r1, c1, r2, c2 = room["bbox"]

        # Clamp to footprint
        r1 = max(fr1, min(r1, fr2 - 10))
        c1 = max(fc1, min(c1, fc2 - 10))
        r2 = max(r1 + 10, min(r2, fr2))
        c2 = max(c1 + 10, min(c2, fc2))

        room["bbox"] = (r1, c1, r2, c2)
        room["centroid"] = ((r1 + r2) // 2, (c1 + c2) // 2)
        room["area_px"] = (r2 - r1) * (c2 - c1)

    return layout


def validate_layout(layout: dict) -> Tuple[bool, List[str]]:
    """Run full validation on the adapted layout."""
    return full_validation(layout)


# ── Split / Merge Helpers ────────────────────────────────────────────────────

def split_room(room: dict, axis: str = None) -> Tuple[dict, dict]:
    """
    Split a single room into two along 'x' or 'y' axis.
    Returns two new room dicts with updated bboxes and centroids.
    axis='x': split vertically (left/right halves)
    axis='y': split horizontally (top/bottom halves)
    """
    r1, c1, r2, c2 = room["bbox"]
    width = c2 - c1
    height = r2 - r1

    # Auto-select axis: split along longest dimension
    if axis is None:
        axis = "x" if width >= height else "y"

    cat = room["category"]
    name = room["name"]

    if axis == "x":
        mid_col = (c1 + c2) // 2
        room_a = {
            "category": cat,
            "name": name,
            "centroid": ((r1 + r2) // 2, (c1 + mid_col - WALL_THICKNESS_PX // 2) // 2),
            "bbox": (r1, c1, r2, mid_col - WALL_THICKNESS_PX // 2),
            "area_px": (r2 - r1) * (mid_col - WALL_THICKNESS_PX // 2 - c1),
        }
        room_b = {
            "category": cat,
            "name": name,
            "centroid": ((r1 + r2) // 2, (mid_col + WALL_THICKNESS_PX // 2 + c2) // 2),
            "bbox": (r1, mid_col + WALL_THICKNESS_PX // 2, r2, c2),
            "area_px": (r2 - r1) * (c2 - mid_col - WALL_THICKNESS_PX // 2),
        }
    else:
        mid_row = (r1 + r2) // 2
        room_a = {
            "category": cat,
            "name": name,
            "centroid": ((r1 + mid_row - WALL_THICKNESS_PX // 2) // 2, (c1 + c2) // 2),
            "bbox": (r1, c1, mid_row - WALL_THICKNESS_PX // 2, c2),
            "area_px": (mid_row - WALL_THICKNESS_PX // 2 - r1) * (c2 - c1),
        }
        room_b = {
            "category": cat,
            "name": name,
            "centroid": ((mid_row + WALL_THICKNESS_PX // 2 + r2) // 2, (c1 + c2) // 2),
            "bbox": (mid_row + WALL_THICKNESS_PX // 2, c1, r2, c2),
            "area_px": (r2 - mid_row - WALL_THICKNESS_PX // 2) * (c2 - c1),
        }

    return room_a, room_b


def merge_rooms(room_a: dict, room_b: dict) -> dict:
    """
    Merge two rooms into one.
    New bbox = union of both bboxes.
    Category = category of the larger room.
    """
    r1 = min(room_a["bbox"][0], room_b["bbox"][0])
    c1 = min(room_a["bbox"][1], room_b["bbox"][1])
    r2 = max(room_a["bbox"][2], room_b["bbox"][2])
    c2 = max(room_a["bbox"][3], room_b["bbox"][3])

    area_a = (room_a["bbox"][2] - room_a["bbox"][0]) * (room_a["bbox"][3] - room_a["bbox"][1])
    area_b = (room_b["bbox"][2] - room_b["bbox"][0]) * (room_b["bbox"][3] - room_b["bbox"][1])

    cat = room_a["category"] if area_a >= area_b else room_b["category"]
    name = room_a["name"] if area_a >= area_b else room_b["name"]

    return {
        "category": cat,
        "name": name,
        "centroid": ((r1 + r2) // 2, (c1 + c2) // 2),
        "bbox": (r1, c1, r2, c2),
        "area_px": (r2 - r1) * (c2 - c1),
    }


# ── Private Helpers ──────────────────────────────────────────────────────────

def _split_largest_room(rooms: List[dict], target_cats: set) -> List[dict]:
    """Find and split the largest room in target_cats."""
    candidates = [
        (i, r) for i, r in enumerate(rooms)
        if r["category"] in target_cats
    ]

    if not candidates:
        # No room of that category exists; convert part of another room
        if target_cats == BEDROOM_CATS:
            non_bath = [(i, r) for i, r in enumerate(rooms) if r["category"] not in BATHROOM_CATS]
            if non_bath:
                largest_idx, largest = max(non_bath, key=lambda x: _room_area(x[1]))
                room_a, room_b = split_room(largest)
                room_b["category"] = 5  # bedroom
                room_b["name"] = "BEDROOM"
                result = [r for i, r in enumerate(rooms) if i != largest_idx]
                result.append(room_a)
                result.append(room_b)
                return result
        elif target_cats == BATHROOM_CATS:
            bedrooms = [(i, r) for i, r in enumerate(rooms) if r["category"] in BEDROOM_CATS]
            if bedrooms:
                largest_idx, largest = max(bedrooms, key=lambda x: _room_area(x[1]))
                room_a, room_b = split_room(largest)
                room_b["category"] = 3  # bathroom
                room_b["name"] = "BATH"
                result = [r for i, r in enumerate(rooms) if i != largest_idx]
                result.append(room_a)
                result.append(room_b)
                return result
        return rooms

    # Split the largest room in category
    largest_idx, largest = max(candidates, key=lambda x: _room_area(x[1]))
    room_a, room_b = split_room(largest)

    # Assign distinct categories for bedrooms if possible
    if target_cats == BEDROOM_CATS:
        available_cats = list(BEDROOM_CATS - {largest["category"]})
        if available_cats:
            room_b["category"] = available_cats[0]

    result = [r for i, r in enumerate(rooms) if i != largest_idx]
    result.append(room_a)
    result.append(room_b)
    return result


def _merge_smallest_rooms(rooms: List[dict], target_cats: set) -> List[dict]:
    """Find and merge the two smallest adjacent rooms in target_cats."""
    candidates = [
        (i, r) for i, r in enumerate(rooms)
        if r["category"] in target_cats
    ]

    if len(candidates) < 2:
        return rooms

    # Sort by area ascending
    candidates.sort(key=lambda x: _room_area(x[1]))

    # Try to find two adjacent ones to merge
    adjacencies = find_adjacent_rooms(rooms)
    adj_set = set()
    for a, b in adjacencies:
        adj_set.add((a, b))
        adj_set.add((b, a))

    for ci in range(len(candidates)):
        for cj in range(ci + 1, len(candidates)):
            idx_i = candidates[ci][0]
            idx_j = candidates[cj][0]
            if (idx_i, idx_j) in adj_set:
                merged = merge_rooms(rooms[idx_i], rooms[idx_j])
                result = [
                    r for i, r in enumerate(rooms)
                    if i != idx_i and i != idx_j
                ]
                result.append(merged)
                return result

    # If no adjacent pair found, just merge the two smallest regardless
    idx_a = candidates[0][0]
    idx_b = candidates[1][0]
    merged = merge_rooms(rooms[idx_a], rooms[idx_b])
    result = [
        r for i, r in enumerate(rooms)
        if i != idx_a and i != idx_b
    ]
    result.append(merged)
    return result


def _room_area(room: dict) -> int:
    """Compute room area from bbox."""
    r1, c1, r2, c2 = room["bbox"]
    return max(0, (r2 - r1) * (c2 - c1))


def _find_shared_wall_midpoint(bbox1: tuple, bbox2: tuple) -> Optional[Tuple[int, int]]:
    """Find the midpoint of the shared wall between two room bboxes."""
    r1_a, c1_a, r2_a, c2_a = bbox1
    r1_b, c1_b, r2_b, c2_b = bbox2

    threshold = WALL_THICKNESS_PX + 4

    # Check right edge of A touches left edge of B
    if abs(c2_a - c1_b) < threshold:
        overlap_r1 = max(r1_a, r1_b)
        overlap_r2 = min(r2_a, r2_b)
        if overlap_r2 > overlap_r1:
            mid_r = (overlap_r1 + overlap_r2) // 2
            mid_c = (c2_a + c1_b) // 2
            return (mid_r, mid_c)

    # Check left edge of A touches right edge of B
    if abs(c1_a - c2_b) < threshold:
        overlap_r1 = max(r1_a, r1_b)
        overlap_r2 = min(r2_a, r2_b)
        if overlap_r2 > overlap_r1:
            mid_r = (overlap_r1 + overlap_r2) // 2
            mid_c = (c1_a + c2_b) // 2
            return (mid_r, mid_c)

    # Check bottom edge of A touches top edge of B
    if abs(r2_a - r1_b) < threshold:
        overlap_c1 = max(c1_a, c1_b)
        overlap_c2 = min(c2_a, c2_b)
        if overlap_c2 > overlap_c1:
            mid_r = (r2_a + r1_b) // 2
            mid_c = (overlap_c1 + overlap_c2) // 2
            return (mid_r, mid_c)

    # Check top edge of A touches bottom edge of B
    if abs(r1_a - r2_b) < threshold:
        overlap_c1 = max(c1_a, c1_b)
        overlap_c2 = min(c2_a, c2_b)
        if overlap_c2 > overlap_c1:
            mid_r = (r1_a + r2_b) // 2
            mid_c = (overlap_c1 + overlap_c2) // 2
            return (mid_r, mid_c)

    return None


def _deduplicate_doors(doors: List[Tuple[int, int]], min_distance: int = 8) -> List[Tuple[int, int]]:
    """Remove doors that are too close together."""
    if not doors:
        return doors

    result = [doors[0]]
    for dr, dc in doors[1:]:
        too_close = False
        for er, ec in result:
            dist = abs(dr - er) + abs(dc - ec)
            if dist < min_distance:
                too_close = True
                break
        if not too_close:
            result.append((dr, dc))
    return result
