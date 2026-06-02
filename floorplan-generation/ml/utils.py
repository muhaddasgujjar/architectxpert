import math
import torch
import numpy as np
from PIL import Image
from typing import Dict, Any, List
from .config import ConditionConfig


_cond_cfg = ConditionConfig()


def encode_condition(params: Dict[str, Any]) -> torch.Tensor:
    """
    Convert raw API params dict into a normalized float tensor of shape (input_dim,).

    Scalar fields are min-max normalized to [0, 1].
    Categorical fields are one-hot or multi-hot encoded.
    """
    bedrooms = float(params.get("bedrooms", 3))
    bathrooms = float(params.get("bathrooms", 2))
    total_area = float(params.get("totalArea", 1800))
    floors = float(params.get("floors", 1))
    style = params.get("style", "Modern")
    special_rooms: List[str] = params.get("specialRooms", [])
    location = params.get("location", "Lahore")

    # --- scalar normalization ---
    b_norm = (bedrooms - _cond_cfg.bedroom_min) / (_cond_cfg.bedroom_max - _cond_cfg.bedroom_min)
    ba_norm = (bathrooms - _cond_cfg.bathroom_min) / (_cond_cfg.bathroom_max - _cond_cfg.bathroom_min)
    area_norm = (math.log(max(total_area, 1)) - math.log(_cond_cfg.area_min_sqft)) / (
        math.log(_cond_cfg.area_max_sqft) - math.log(_cond_cfg.area_min_sqft)
    )
    f_norm = (floors - _cond_cfg.floor_min) / (_cond_cfg.floor_max - _cond_cfg.floor_min)

    scalars = [
        max(0.0, min(1.0, b_norm)),
        max(0.0, min(1.0, ba_norm)),
        max(0.0, min(1.0, area_norm)),
        max(0.0, min(1.0, f_norm)),
    ]

    # --- style one-hot ---
    style_vec = [0.0] * len(_cond_cfg.styles)
    if style in _cond_cfg.styles:
        style_vec[_cond_cfg.styles.index(style)] = 1.0
    else:
        style_vec[0] = 1.0  # default Modern

    # --- special rooms multi-hot ---
    special_vec = [0.0] * len(_cond_cfg.special_rooms)
    for rm in special_rooms:
        if rm in _cond_cfg.special_rooms:
            special_vec[_cond_cfg.special_rooms.index(rm)] = 1.0

    # --- location one-hot ---
    loc_vec = [0.0] * len(_cond_cfg.locations)
    if location in _cond_cfg.locations:
        loc_vec[_cond_cfg.locations.index(location)] = 1.0

    cond = torch.tensor(scalars + style_vec + special_vec + loc_vec, dtype=torch.float32)
    return cond


def rplan_color_to_rooms(img_array: np.ndarray) -> Dict[str, Any]:
    """
    Extract room metadata from an RPLAN color-coded segmentation image.
    RPLAN uses specific RGB values for each room type.
    Returns a dict compatible with encode_condition().
    """
    # RPLAN room-type color map (R, G, B)
    ROOM_COLORS = {
        "living_room": (255, 215, 0),
        "kitchen": (255, 182, 193),
        "bedroom": (0, 123, 255),
        "bathroom": (0, 255, 255),
        "balcony": (255, 128, 0),
        "study": (128, 0, 128),
        "storage": (139, 69, 19),
        "garage": (128, 128, 128),
        "dining": (255, 255, 0),
        "entrance": (0, 255, 0),
        "wall": (0, 0, 0),
        "background": (255, 255, 255),
    }
    COLOR_TOLERANCE = 30

    h, w = img_array.shape[:2]
    total_pixels = h * w

    counts = {room: 0 for room in ROOM_COLORS}

    for room, color in ROOM_COLORS.items():
        color_arr = np.array(color, dtype=np.int32)
        diff = np.abs(img_array[:, :, :3].astype(np.int32) - color_arr)
        mask = np.all(diff < COLOR_TOLERANCE, axis=2)
        counts[room] = int(mask.sum())

    # Estimate room counts
    px_per_sqft = total_pixels / 1800.0
    bedrooms = max(1, round(counts["bedroom"] / (px_per_sqft * 150)))
    bathrooms = max(1, round(counts["bathroom"] / (px_per_sqft * 60)))

    special = []
    if counts["balcony"] > 200:
        special.append("balcony")
    if counts["study"] > 200:
        special.append("study")
    if counts["garage"] > 200:
        special.append("garage")

    non_bg = total_pixels - counts["background"] - counts["wall"]
    area_sqft = max(400, min(10000, int(non_bg / px_per_sqft)))

    return {
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "totalArea": area_sqft,
        "floors": 1,
        "style": "Modern",
        "specialRooms": special,
        "location": "Lahore",
    }


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    """Convert a (3, H, W) tensor in [-1, 1] to a PIL RGB image."""
    t = tensor.detach().cpu().clamp(-1, 1)
    t = (t + 1) / 2  # → [0, 1]
    t = (t * 255).byte()
    arr = t.permute(1, 2, 0).numpy()
    return Image.fromarray(arr, mode="RGB")


def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    """Convert a PIL image to (3, H, W) float tensor in [-1, 1]."""
    arr = np.array(img.convert("RGB"), dtype=np.float32)
    t = torch.from_numpy(arr).permute(2, 0, 1)
    return t / 127.5 - 1.0
