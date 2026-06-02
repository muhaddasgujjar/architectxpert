"""
Professional Architectural Floorplan Renderer v6

Renders directly from RPLAN pixel data (walls, doors, rooms) to produce
realistic architectural floor plans — NOT just bounding boxes.

The key insight: each RPLAN pickle contains actual 256x256 pixel maps of
walls and doors. We render THOSE directly, scaled up to high-res, then
overlay labels/dimensions/fixtures on top.
"""

from __future__ import annotations

import math
import pickle
from pathlib import Path
from functools import lru_cache
from typing import Optional, List, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFont

try:
    from scipy.ndimage import distance_transform_edt
    _SCIPY = True
except ImportError:
    _SCIPY = False

from .rplan_extractor import ROOM_LABELS, BEDROOM_CATS, BATHROOM_CATS

# ── Visual constants ─────────────────────────────────────────────────────────

BG_COLOR        = (255, 255, 255)
WALL_COLOR      = (20,  20,  20)
DOOR_COLOR      = (255, 255, 255)  # doors are gaps in walls (white)
LABEL_COLOR     = (15,  15,  15)
DIM_COLOR       = (50,  50,  50)
FIXTURE_COLOR   = (25,  25,  25)
COMPASS_COLOR   = (80,  80,  80)
BADGE_BG        = (245, 245, 245)
BADGE_BORDER    = (200, 200, 200)
EXTERIOR_COLOR  = (250, 250, 250)

# Wall thickness multipliers (for scale-up from 256px → output)
OUTER_WALL_MULT = 3.0
INNER_WALL_MULT = 1.8

_FONT_CACHE: dict = {}


def _font(size: int) -> ImageFont.FreeTypeFont:
    if size in _FONT_CACHE:
        return _FONT_CACHE[size]
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    f = ImageFont.load_default()
    for p in candidates:
        try:
            f = ImageFont.truetype(p, size)
            break
        except Exception:
            continue
    _FONT_CACHE[size] = f
    return f


def _font_bold(size: int) -> ImageFont.FreeTypeFont:
    key = f"bold_{size}"
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    f = _font(size)
    for p in candidates:
        try:
            f = ImageFont.truetype(p, size)
            break
        except Exception:
            continue
    _FONT_CACHE[key] = f
    return f


def _dim_str(px: float, px_per_ft: float) -> str:
    if px_per_ft <= 0:
        return ""
    ft_total = px / px_per_ft
    total_in = ft_total * 12
    ft = int(total_in // 12)
    inch = int(round(total_in % 12))
    if inch == 12:
        ft += 1
        inch = 0
    return f"{ft}' {inch}\""


def _area_str(area_px: int, fp_area_px: int, total_area_sqft: float) -> str:
    if fp_area_px <= 0 or total_area_sqft <= 0:
        return ""
    sqft = int(area_px / fp_area_px * total_area_sqft)
    return f"{sqft} sqft"


# ── Load raw RPLAN pixel data ────────────────────────────────────────────────

def _load_raw_rplan(pkl_path: str) -> Optional[dict]:
    """Load the raw 256x256 arrays from a pickle file."""
    try:
        with open(pkl_path, "rb") as f:
            data = pickle.load(f)
        boundary = np.array(data[0], dtype=np.uint8)
        walls = np.array(data[2], dtype=np.uint8)
        doors = np.array(data[3], dtype=np.uint8)
        rooms_raw = data[4]
        return {
            "boundary": boundary,
            "walls": walls,
            "doors": doors,
            "rooms_raw": rooms_raw,
        }
    except Exception:
        return None


# ── Core pixel-based renderer ────────────────────────────────────────────────

def _render_from_pixels(
    boundary: np.ndarray,
    walls: np.ndarray,
    doors: np.ndarray,
    rooms_raw: list,
    output_size: int = 900,
    total_area_sqft: float = 1500,
    title: str = "",
    unit_label: str = "",
    source: str = "",
    confidence: float = 0.0,
) -> Image.Image:
    """
    Render a professional floorplan directly from RPLAN pixel arrays.
    This produces REAL architectural walls, not rectangles.
    """
    size = boundary.shape[0]  # 256
    footprint = boundary > 127

    if not footprint.any():
        img = Image.new("RGB", (output_size, output_size), BG_COLOR)
        return img

    # Find footprint bounds
    rows_any = np.any(footprint, axis=1)
    cols_any = np.any(footprint, axis=0)
    row_indices = np.where(rows_any)[0]
    col_indices = np.where(cols_any)[0]
    fp_r1 = int(row_indices[0])
    fp_r2 = int(row_indices[-1])
    fp_c1 = int(col_indices[0])
    fp_c2 = int(col_indices[-1])
    fp_h = fp_r2 - fp_r1 + 1
    fp_w = fp_c2 - fp_c1 + 1
    fp_area_px = int(footprint.sum())

    # Compute scale and padding (minimal — let the plan fill the canvas)
    pad_top = 30
    pad_bottom = 35
    pad_side = 30
    avail_h = output_size - pad_top - pad_bottom
    avail_w = output_size - pad_side * 2
    scale = min(avail_h / fp_h, avail_w / fp_w)

    render_h = int(fp_h * scale)
    render_w = int(fp_w * scale)
    off_x = pad_side + (avail_w - render_w) // 2
    off_y = pad_top + (avail_h - render_h) // 2

    # px_per_ft for dimension labels
    px_per_ft = math.sqrt(max(fp_area_px, 1)) / math.sqrt(max(total_area_sqft, 1))

    # ── Build the wall image at 256px then scale up ──────────────────
    # Create a high-contrast wall rendering
    wall_img = np.ones((size, size), dtype=np.uint8) * 255  # white

    # Draw walls (thick black)
    wall_mask = (walls > 0) & footprint
    wall_img[wall_mask] = 0

    # Thicken walls by dilation
    from scipy.ndimage import binary_dilation
    struct = np.ones((3, 3), dtype=bool)
    thick_walls = binary_dilation(wall_mask, structure=struct, iterations=1)
    wall_img[thick_walls] = 0

    # Make exterior (outside footprint) white
    wall_img[~footprint] = 255

    # Cut door openings (make them white)
    door_mask = (doors > 0) & footprint
    # Widen doors slightly for visibility
    thick_doors = binary_dilation(door_mask, structure=struct, iterations=1)
    wall_img[thick_doors] = 255

    # Add outer boundary (extra thick)
    from scipy.ndimage import binary_erosion
    boundary_ring = footprint & ~binary_erosion(footprint, structure=struct, iterations=2)
    wall_img[boundary_ring] = 0

    # ── Crop to footprint bounds and scale up ────────────────────────
    cropped = wall_img[fp_r1:fp_r2+1, fp_c1:fp_c2+1]

    # Scale up to render size using nearest-neighbor (keeps crisp lines)
    pil_walls = Image.fromarray(cropped, mode="L")
    pil_walls = pil_walls.resize((render_w, render_h), Image.NEAREST)

    # ── Compose final image ──────────────────────────────────────────
    img = Image.new("RGB", (output_size, output_size), BG_COLOR)

    # Paste the wall rendering
    wall_rgb = Image.merge("RGB", (pil_walls, pil_walls, pil_walls))
    img.paste(wall_rgb, (off_x, off_y))

    draw = ImageDraw.Draw(img)

    # ── Voronoi room segmentation for labels ─────────────────────────
    room_regions = []
    if _SCIPY and rooms_raw:
        seed_map = np.zeros((size, size), dtype=np.int32)
        for i, room in enumerate(rooms_raw):
            cy, cx = room.get("centroid", (size // 2, size // 2))
            cy = max(0, min(size - 1, int(cy)))
            cx = max(0, min(size - 1, int(cx)))
            seed_map[cy, cx] = i + 1

        _, nearest = distance_transform_edt(seed_map == 0, return_indices=True)
        nr, nc = nearest
        room_map = seed_map[nr, nc] - 1

        floor_mask = footprint & (walls == 0)

        for i, room in enumerate(rooms_raw):
            cat = int(room.get("category", 0))
            mask = (room_map == i) & floor_mask
            if not mask.any():
                continue
            rr, cc = np.where(mask)
            r1_r, c1_r = int(rr.min()), int(cc.min())
            r2_r, c2_r = int(rr.max()), int(cc.max())
            area = int(mask.sum())

            room_regions.append({
                "category": cat,
                "name": ROOM_LABELS.get(cat, "ROOM"),
                "r1": r1_r, "c1": c1_r, "r2": r2_r, "c2": c2_r,
                "area_px": area,
                "centroid": (int(rr.mean()), int(cc.mean())),
            })

    # ── Font sizes ───────────────────────────────────────────────────
    fnt_room = _font_bold(max(12, int(scale * 6)))
    fnt_dim = _font(max(10, int(scale * 4.5)))
    fnt_area = _font(max(9, int(scale * 4)))
    fnt_title = _font_bold(12)
    fnt_unit = _font_bold(13)
    fnt_badge = _font(9)
    fnt_compass = _font_bold(10)

    # ── Helper to convert RPLAN coords to canvas ─────────────────────
    def to_canvas(r, c):
        x = int((c - fp_c1) * scale + off_x)
        y = int((r - fp_r1) * scale + off_y)
        return x, y

    # ── Draw fixtures in bathrooms/kitchens ──────────────────────────
    for region in room_regions:
        cat = region["category"]
        r1_r, c1_r, r2_r, c2_r = region["r1"], region["c1"], region["r2"], region["c2"]
        x1, y1 = to_canvas(r1_r, c1_r)
        x2, y2 = to_canvas(r2_r, c2_r)
        w, h = x2 - x1, y2 - y1

        if cat == 3 and w > 45 and h > 45:  # bathroom
            _draw_bathroom(draw, x1, y1, x2, y2)
        elif cat == 2 and w > 65 and h > 45:  # kitchen
            _draw_kitchen(draw, x1, y1, x2, y2)

    # ── Draw room labels (names only — clean) ──────────────────────
    for region in room_regions:
        cy, cx = region["centroid"]
        canvas_x, canvas_y = to_canvas(cy, cx)

        r1_r, c1_r, r2_r, c2_r = region["r1"], region["c1"], region["r2"], region["c2"]
        x1, y1 = to_canvas(r1_r, c1_r)
        x2, y2 = to_canvas(r2_r, c2_r)
        rw = x2 - x1
        rh = y2 - y1

        if rw < 40 or rh < 30:
            continue

        label = region["name"]
        draw.text((canvas_x, canvas_y), label,
                  fill=LABEL_COLOR, font=fnt_room, anchor="mm", align="center")

    # ── Door arcs ────────────────────────────────────────────────────
    door_positions = np.argwhere((doors > 0) & footprint)
    if len(door_positions) > 0:
        # Cluster door pixels into distinct doors
        door_clusters = _cluster_doors(door_positions, threshold=8)
        arc_r = max(10, int(scale * 5))

        for cluster_center in door_clusters:
            dr, dc = cluster_center
            dx, dy = to_canvas(dr, dc)
            # Only draw if inside the rendered area
            if off_x < dx < off_x + render_w and off_y < dy < off_y + render_h:
                # Determine arc direction
                mid_x = off_x + render_w // 2
                start = 270 if dx < mid_x else 90
                draw.arc([dx - arc_r, dy - arc_r, dx + arc_r, dy + arc_r],
                         start=start, end=start + 90, fill=(40, 40, 40), width=2)

    # ── Unit label (bottom-right) ───────────────────────────────────
    if unit_label:
        draw.text((output_size - 20, output_size - 20),
                  unit_label, fill=LABEL_COLOR, font=fnt_unit, anchor="rb")

    return img


def _cluster_doors(positions: np.ndarray, threshold: int = 8) -> List[Tuple[int, int]]:
    """Cluster nearby door pixels into single door centers."""
    if len(positions) == 0:
        return []

    clusters = []
    used = np.zeros(len(positions), dtype=bool)

    for i in range(len(positions)):
        if used[i]:
            continue
        cluster = [positions[i]]
        used[i] = True
        for j in range(i + 1, len(positions)):
            if used[j]:
                continue
            dist = abs(positions[j][0] - positions[i][0]) + abs(positions[j][1] - positions[i][1])
            if dist < threshold:
                cluster.append(positions[j])
                used[j] = True
        center = np.array(cluster).mean(axis=0).astype(int)
        clusters.append((int(center[0]), int(center[1])))

    # Limit to reasonable number
    return clusters[:20]


# ── Fixture helpers ──────────────────────────────────────────────────────────

def _draw_bathroom(draw: ImageDraw.ImageDraw,
                   x1: int, y1: int, x2: int, y2: int):
    w, h = x2 - x1, y2 - y1

    # Toilet
    tr = max(8, min(w // 4, h // 5, 15))
    tc_x = (x1 + x2) // 2
    tc_y = y2 - tr - max(8, h // 7)
    draw.rectangle([tc_x - tr, tc_y - tr // 2, tc_x + tr, tc_y],
                   outline=FIXTURE_COLOR, width=1)
    draw.arc([tc_x - tr, tc_y, tc_x + tr, tc_y + tr * 2],
             start=10, end=170, fill=FIXTURE_COLOR, width=2)
    draw.line([tc_x - tr, tc_y, tc_x - tr, tc_y + tr], fill=FIXTURE_COLOR, width=1)
    draw.line([tc_x + tr, tc_y, tc_x + tr, tc_y + tr], fill=FIXTURE_COLOR, width=1)

    # Sink
    sw, sh = max(14, w // 3), max(10, h // 6)
    sx = (x1 + x2) // 2 - sw // 2
    sy = y1 + max(10, h // 8)
    draw.rectangle([sx, sy, sx + sw, sy + sh], outline=FIXTURE_COLOR, width=1)
    m = max(2, sw // 5)
    if sx + m < sx + sw - m and sy + m < sy + sh - m:
        draw.ellipse([sx + m, sy + m, sx + sw - m, sy + sh - m],
                     outline=FIXTURE_COLOR, width=1)


def _draw_kitchen(draw: ImageDraw.ImageDraw,
                  x1: int, y1: int, x2: int, y2: int):
    w, h = x2 - x1, y2 - y1
    ct = max(14, h // 5)

    # Counter
    draw.rectangle([x1 + 5, y1 + 5, x2 - 5, y1 + ct],
                   outline=FIXTURE_COLOR, width=1)

    # 4 burners
    stove_w = min((w) // 2 - 10, 50)
    if stove_w > 20:
        sx = x1 + 7
        sy = y1 + 7
        sw, sh = stove_w, ct - 10
        br = max(3, min(sw, sh) // 4 - 1)
        for row in range(2):
            for col in range(2):
                bx = sx + col * (sw // 2) + sw // 4
                by = sy + row * (sh // 2) + sh // 4
                if br > 2:
                    draw.ellipse([bx - br, by - br, bx + br, by + br],
                                 outline=FIXTURE_COLOR, width=1)

    # Sink (right side)
    half = (x1 + x2) // 2
    draw.rectangle([half + 5, y1 + 7, x2 - 7, y1 + ct - 3],
                   outline=FIXTURE_COLOR, width=1)


# ── Public API ───────────────────────────────────────────────────────────────

def render_floorplan(
    layout: dict,
    total_area_sqft: float = 1500,
    output_size: int = 900,
    title: str = "",
    unit_label: str = "",
    source: str = "",
    confidence: float = 0.0,
) -> Image.Image:
    """
    Render from raw RPLAN data if available (source pickle path),
    otherwise fall back to bbox-based rendering.
    """
    pkl_path = layout.get("source", "")

    # Try to load raw pixel data from the original pickle
    raw = None
    if pkl_path and Path(pkl_path).exists():
        raw = _load_raw_rplan(pkl_path)

    if raw is not None:
        return _render_from_pixels(
            boundary=raw["boundary"],
            walls=raw["walls"],
            doors=raw["doors"],
            rooms_raw=raw["rooms_raw"],
            output_size=output_size,
            total_area_sqft=total_area_sqft,
            title=title,
            unit_label=unit_label,
            source=source,
            confidence=confidence,
        )

    # Fallback: bbox-based rendering for algorithmic/cgan layouts
    return _render_from_bboxes(
        layout=layout,
        total_area_sqft=total_area_sqft,
        output_size=output_size,
        title=title,
        unit_label=unit_label,
        source=source,
        confidence=confidence,
    )


def _render_from_bboxes(
    layout: dict,
    total_area_sqft: float,
    output_size: int,
    title: str,
    unit_label: str,
    source: str,
    confidence: float,
) -> Image.Image:
    """Fallback: render from room bounding boxes when no raw pixel data."""
    rooms = layout.get("rooms", [])
    fp_bbox = layout.get("footprint_bbox", (10, 10, 245, 245))
    fp_area = layout.get("footprint_area_px", 20000)

    if not rooms:
        img = Image.new("RGB", (output_size, output_size), BG_COLOR)
        ImageDraw.Draw(img).text((output_size // 2, output_size // 2),
                                  "No rooms", fill=(150, 150, 150), anchor="mm")
        return img

    pad_top = 50
    pad_side = 55
    r1, c1, r2, c2 = fp_bbox
    fp_h = max(r2 - r1, 1)
    fp_w = max(c2 - c1, 1)
    avail_h = output_size - pad_top - 55
    avail_w = output_size - pad_side * 2
    scale = min(avail_h / fp_h, avail_w / fp_w)
    render_h = fp_h * scale
    render_w = fp_w * scale
    off_x = pad_side + (avail_w - render_w) / 2
    off_y = pad_top + (avail_h - render_h) / 2

    def to_xy(row, col):
        x = int((col - c1) * scale + off_x)
        y = int((row - r1) * scale + off_y)
        return x, y

    px_per_ft = math.sqrt(max(fp_area, 1)) / math.sqrt(max(total_area_sqft, 1))

    img = Image.new("RGB", (output_size, output_size), BG_COLOR)
    draw = ImageDraw.Draw(img)

    outer_w = max(5, int(scale * 1.5))
    inner_w = max(2, int(scale * 0.8))

    fnt_room = _font_bold(max(11, int(scale * 6)))
    fnt_dim = _font(max(9, int(scale * 4.5)))
    fnt_title = _font_bold(12)
    fnt_unit = _font_bold(13)

    # Room borders
    for room in rooms:
        br1, bc1, br2, bc2 = room["bbox"]
        x1, y1 = to_xy(br1, bc1)
        x2, y2 = to_xy(br2, bc2)
        if x2 > x1 and y2 > y1:
            draw.rectangle([x1, y1, x2, y2], fill=BG_COLOR, outline=WALL_COLOR, width=inner_w)

    # Outer wall
    ox1, oy1 = to_xy(r1, c1)
    ox2, oy2 = to_xy(r2, c2)
    draw.rectangle([ox1, oy1, ox2, oy2], outline=WALL_COLOR, width=outer_w)

    # Labels
    for room in rooms:
        br1, bc1, br2, bc2 = room["bbox"]
        x1, y1 = to_xy(br1, bc1)
        x2, y2 = to_xy(br2, bc2)
        w, h = x2 - x1, y2 - y1
        if w < 40 or h < 30:
            continue
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        draw.text((cx, cy - 8), room["name"], fill=LABEL_COLOR, font=fnt_room, anchor="mm")
        if w > 60 and h > 40:
            ws = _dim_str(bc2 - bc1, px_per_ft)
            hs = _dim_str(br2 - br1, px_per_ft)
            if ws and hs:
                draw.text((cx, cy + 10), f"{ws} x {hs}", fill=DIM_COLOR, font=fnt_dim, anchor="mm")

    if title:
        draw.text((14, 12), title, fill=LABEL_COLOR, font=fnt_title, anchor="lt")
    if unit_label:
        draw.text((output_size - 14, output_size - 14), unit_label, fill=LABEL_COLOR, font=fnt_unit, anchor="rb")

    return img


def render_floorplan_preview(
    layout: dict,
    total_area_sqft: float = 1500,
    output_size: int = 400,
) -> Image.Image:
    return render_floorplan(layout, total_area_sqft, output_size)
