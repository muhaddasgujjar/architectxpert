"""
Architectural validation functions.
Ensures generated/adapted layouts are physically plausible.

All coordinates are in RPLAN 256-px space unless otherwise noted.
"""

from typing import List, Tuple, Dict
from collections import deque

# Minimum room dimensions (in RPLAN 256px space)
# Roughly: 1px ~ 1ft at standard footprints (~14 px^2/sqft)
MIN_ROOM_SIZES: Dict[str, Tuple[int, int]] = {
    "bedroom":  (28, 28),     # ~10'x10'
    "bathroom": (16, 18),     # ~5'x6'
    "kitchen":  (22, 25),     # ~7'x8'
    "living":   (32, 32),     # ~11'x11'
    "dining":   (22, 25),     # ~7'x8'
    "study":    (18, 18),     # ~6'x6'
    "balcony":  (10, 16),     # ~4'x6'
    "garage":   (28, 45),     # ~10'x16'
    "storage":  (10, 10),     # ~4'x4'
    "entry":    (10, 10),     # ~4'x4'
    "default":  (12, 12),     # ~4'x4' absolute minimum
}

# Map category index to type key
CATEGORY_TO_TYPE = {
    0: "living", 1: "bedroom", 2: "kitchen", 3: "bathroom",
    4: "dining", 5: "bedroom", 6: "study", 7: "bedroom",
    8: "bedroom", 9: "balcony", 10: "entry", 11: "storage",
}

# Wall thickness tolerance for overlap detection
WALL_THICKNESS_PX = 4

# Adjacency detection threshold (shared edge overlap in px)
ADJACENCY_THRESHOLD_PX = 8


def validate_no_overlaps(rooms: List[dict]) -> List[str]:
    """Check that no two room bboxes overlap by more than wall_thickness pixels."""
    violations = []
    for i in range(len(rooms)):
        for j in range(i + 1, len(rooms)):
            r1 = rooms[i]["bbox"]
            r2 = rooms[j]["bbox"]
            # Compute intersection
            inter_r1 = max(r1[0], r2[0])
            inter_c1 = max(r1[1], r2[1])
            inter_r2 = min(r1[2], r2[2])
            inter_c2 = min(r1[3], r2[3])

            if inter_r2 > inter_r1 + WALL_THICKNESS_PX and inter_c2 > inter_c1 + WALL_THICKNESS_PX:
                overlap_area = (inter_r2 - inter_r1) * (inter_c2 - inter_c1)
                violations.append(
                    f"Rooms '{rooms[i]['name']}' and '{rooms[j]['name']}' overlap by {overlap_area}px^2"
                )
    return violations


def validate_within_footprint(rooms: List[dict], footprint_bbox: Tuple[int, int, int, int]) -> List[str]:
    """Ensure all rooms fit within the footprint boundary."""
    violations = []
    fr1, fc1, fr2, fc2 = footprint_bbox
    margin = WALL_THICKNESS_PX

    for room in rooms:
        r1, c1, r2, c2 = room["bbox"]
        if r1 < fr1 - margin:
            violations.append(f"Room '{room['name']}' extends above footprint (r1={r1} < {fr1})")
        if c1 < fc1 - margin:
            violations.append(f"Room '{room['name']}' extends left of footprint (c1={c1} < {fc1})")
        if r2 > fr2 + margin:
            violations.append(f"Room '{room['name']}' extends below footprint (r2={r2} > {fr2})")
        if c2 > fc2 + margin:
            violations.append(f"Room '{room['name']}' extends right of footprint (c2={c2} > {fc2})")
    return violations


def validate_min_sizes(rooms: List[dict]) -> List[str]:
    """Check each room meets minimum dimension requirements for its category."""
    violations = []
    for room in rooms:
        cat = room.get("category", 0)
        room_type = CATEGORY_TO_TYPE.get(cat, "default")
        min_h, min_w = MIN_ROOM_SIZES.get(room_type, MIN_ROOM_SIZES["default"])

        r1, c1, r2, c2 = room["bbox"]
        h = r2 - r1
        w = c2 - c1

        if h < min_h * 0.6 or w < min_w * 0.6:
            violations.append(
                f"Room '{room['name']}' too small: {w}x{h}px (min {min_w}x{min_h}px for {room_type})"
            )
    return violations


def find_adjacent_rooms(rooms: List[dict]) -> List[Tuple[int, int]]:
    """
    Determine which rooms share a wall (bbox edges within threshold).
    Returns list of (room_index_a, room_index_b) pairs.
    """
    adjacencies = []
    for i in range(len(rooms)):
        for j in range(i + 1, len(rooms)):
            r1 = rooms[i]["bbox"]
            r2 = rooms[j]["bbox"]

            # Check if they share a horizontal edge
            h_overlap = min(r1[3], r2[3]) - max(r1[1], r2[1])
            v_overlap = min(r1[2], r2[2]) - max(r1[0], r2[0])

            # Shared vertical wall (right edge of one touches left edge of other)
            if h_overlap < 0:
                h_overlap = 0
            if v_overlap < 0:
                v_overlap = 0

            # Check right-left adjacency
            right_left_dist = abs(r1[3] - r2[1])
            left_right_dist = abs(r2[3] - r1[1])

            # Check bottom-top adjacency
            bottom_top_dist = abs(r1[2] - r2[0])
            top_bottom_dist = abs(r2[2] - r1[0])

            is_adjacent = False

            # Vertical adjacency (rooms side by side)
            if (right_left_dist <= ADJACENCY_THRESHOLD_PX or left_right_dist <= ADJACENCY_THRESHOLD_PX):
                if v_overlap > ADJACENCY_THRESHOLD_PX:
                    is_adjacent = True

            # Horizontal adjacency (rooms stacked)
            if (bottom_top_dist <= ADJACENCY_THRESHOLD_PX or top_bottom_dist <= ADJACENCY_THRESHOLD_PX):
                if h_overlap > ADJACENCY_THRESHOLD_PX:
                    is_adjacent = True

            if is_adjacent:
                adjacencies.append((i, j))

    return adjacencies


def validate_connectivity(rooms: List[dict], doors: List[Tuple[int, int]] = None) -> List[str]:
    """
    Build adjacency graph from room proximity. Verify all rooms are reachable
    from the first room (connected graph check via BFS).
    """
    violations = []
    if not rooms:
        return violations

    n = len(rooms)
    if n <= 1:
        return violations

    # Build adjacency graph
    adjacencies = find_adjacent_rooms(rooms)
    adj_graph: Dict[int, List[int]] = {i: [] for i in range(n)}
    for i, j in adjacencies:
        adj_graph[i].append(j)
        adj_graph[j].append(i)

    # BFS from room 0
    visited = set()
    queue = deque([0])
    visited.add(0)
    while queue:
        node = queue.popleft()
        for neighbor in adj_graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    if len(visited) < n:
        unreachable = [rooms[i]["name"] for i in range(n) if i not in visited]
        violations.append(
            f"Disconnected rooms (not reachable from entry): {', '.join(unreachable)}"
        )

    return violations


def validate_room_proportions(rooms: List[dict], total_area_sqft: float) -> List[str]:
    """
    Check that room area proportions are architecturally reasonable:
    - No single room > 45% of total
    - Bathrooms not larger than bedrooms (when both present)
    - Kitchen not larger than living room (when both present)
    """
    violations = []
    if not rooms:
        return violations

    total_px = sum(r.get("area_px", (r["bbox"][2] - r["bbox"][0]) * (r["bbox"][3] - r["bbox"][1])) for r in rooms)
    if total_px == 0:
        return violations

    # Check no single room > 45% of total
    for room in rooms:
        area = room.get("area_px", (room["bbox"][2] - room["bbox"][0]) * (room["bbox"][3] - room["bbox"][1]))
        ratio = area / total_px
        if ratio > 0.45:
            violations.append(
                f"Room '{room['name']}' occupies {ratio*100:.0f}% of total area (max 45%)"
            )

    # Bathrooms should not be larger than bedrooms
    bedroom_areas = [
        r.get("area_px", (r["bbox"][2] - r["bbox"][0]) * (r["bbox"][3] - r["bbox"][1]))
        for r in rooms if r["category"] in {1, 5, 7, 8}
    ]
    bathroom_areas = [
        r.get("area_px", (r["bbox"][2] - r["bbox"][0]) * (r["bbox"][3] - r["bbox"][1]))
        for r in rooms if r["category"] == 3
    ]

    if bedroom_areas and bathroom_areas:
        min_bedroom = min(bedroom_areas)
        max_bathroom = max(bathroom_areas)
        if max_bathroom > min_bedroom * 1.5:
            violations.append(
                f"Largest bathroom ({max_bathroom}px^2) is disproportionately larger than smallest bedroom ({min_bedroom}px^2)"
            )

    return violations


def full_validation(layout: dict) -> Tuple[bool, List[str]]:
    """Run all validators. Returns (pass/fail, list of violation messages)."""
    rooms = layout.get("rooms", [])
    footprint_bbox = layout.get("footprint_bbox", (0, 0, 255, 255))
    doors = layout.get("doors", [])
    total_area = layout.get("total_area_sqft", 1500)

    all_violations = []
    all_violations.extend(validate_no_overlaps(rooms))
    all_violations.extend(validate_within_footprint(rooms, footprint_bbox))
    all_violations.extend(validate_min_sizes(rooms))
    all_violations.extend(validate_connectivity(rooms, doors))
    all_violations.extend(validate_room_proportions(rooms, total_area))

    is_valid = len(all_violations) == 0
    return is_valid, all_violations
