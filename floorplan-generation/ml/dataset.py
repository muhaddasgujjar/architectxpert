"""
RPLAN Pickle Dataset Loader
----------------------------
Reads the pre-processed RPLAN pickle files at:
    floorplan-generation/pickle/train/   (64,630 files)
    floorplan-generation/pickle/val/     (16,158 files)

Each .pkl file contains a list of 5 elements:
    [0] wall boundary map  (256x256 uint8, 0=open 255=wall)
    [1] zone map           (256x256 uint8, 0=exterior 127/255=interior zones)
    [2] inside mask        (256x256 uint8 0/1)
    [3] door mask          (256x256 uint8 0/1)
    [4] room list          list of {category: int, centroid: (y, x)}

RPLAN room categories:
    0  LivingRoom      1  MasterBedroom   2  Kitchen
    3  Bathroom        4  DiningRoom      5  ChildRoom
    6  StudyRoom       7  SecondBedroom   8  GuestRoom
    9  Balcony         10 Entrance        11 Storage
"""

import glob
import pickle
import random
import warnings
from pathlib import Path
from typing import Tuple

import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset, DataLoader

from .config import ConditionConfig, TrainingConfig

warnings.filterwarnings("ignore", category=DeprecationWarning)

# ── RPLAN category index → human label ──────────────────────────────────────
RPLAN_CATS = {
    0: "LivingRoom",   1: "MasterBedroom", 2: "Kitchen",
    3: "Bathroom",     4: "DiningRoom",    5: "ChildRoom",
    6: "StudyRoom",    7: "SecondBedroom", 8: "GuestRoom",
    9: "Balcony",      10: "Entrance",     11: "Storage",
}

# Bedroom categories (for counting)
BEDROOM_CATS  = {1, 5, 7, 8}  # master, child, second, guest
BATHROOM_CATS = {3}
SPECIAL_MAP   = {9: "balcony", 6: "study", 11: "storage", 10: "entrance"}

# Per-room-type RGB colors for the rendered image (production quality)
ROOM_COLORS = {
    0:  (255, 220, 120),   # LivingRoom    — warm amber
    1:  (180, 210, 255),   # MasterBedroom — soft blue
    2:  (255, 190, 150),   # Kitchen       — warm peach
    3:  (180, 240, 220),   # Bathroom      — mint
    4:  (255, 240, 160),   # DiningRoom    — light yellow
    5:  (200, 220, 255),   # ChildRoom     — pale blue
    6:  (220, 200, 255),   # StudyRoom     — lavender
    7:  (185, 215, 255),   # SecondBedroom — sky blue
    8:  (195, 225, 255),   # GuestRoom     — ice blue
    9:  (180, 255, 200),   # Balcony       — light green
    10: (230, 230, 230),   # Entrance      — light grey
    11: (200, 185, 170),   # Storage       — tan
}
WALL_COLOR = (30, 30, 35)    # near-black walls
BG_COLOR   = (245, 245, 240) # off-white background


def render_floorplan(boundary: np.ndarray,
                     wall_lines: np.ndarray,
                     rooms: list,
                     size: int = 256) -> np.ndarray:
    """
    Render a full-color RGB floorplan from RPLAN arrays.

    RPLAN data layout:
      boundary   (img[0]): 255 = inside house footprint, 0 = exterior
      wall_lines (img[2]): 1   = wall pixel (room dividers), 0 = floor

    Strategy: Voronoi coloring — each floor pixel gets the color of
    the nearest room centroid. Reliable even with 1-px thin walls.
    Walls from img[2] are drawn on top.
    """
    from scipy.ndimage import distance_transform_edt

    canvas = np.full((size, size, 3), BG_COLOR, dtype=np.uint8)

    footprint = (boundary > 127)           # inside house
    if not footprint.any() or not rooms:
        return canvas

    canvas[footprint] = (235, 232, 225)   # neutral floor base

    # --- Voronoi coloring via nearest-centroid ---
    # Build seed map: each centroid position gets a room index
    seed = np.zeros((size, size), dtype=np.int32)
    for i, room in enumerate(rooms):
        cy, cx = room.get("centroid", (size // 2, size // 2))
        cy = max(0, min(size - 1, int(cy)))
        cx = max(0, min(size - 1, int(cx)))
        seed[cy, cx] = i + 1   # 1-based index

    # For each floor pixel, find nearest seed using EDT
    no_seed = seed == 0
    _, nearest_idx = distance_transform_edt(no_seed, return_indices=True)
    # nearest_idx shape: (2, H, W) → row, col of nearest seed
    nr, nc = nearest_idx
    nearest_room_idx = seed[nr, nc] - 1  # back to 0-based

    # Vectorized: build color lookup per room index, apply in one shot
    n = len(rooms)
    color_lut = np.array(
        [ROOM_COLORS.get(rooms[i].get("category", 0), (210, 210, 210)) for i in range(n)],
        dtype=np.uint8
    )  # (n, 3)

    # nearest_room_idx is 0-based room index for every pixel
    # clamp to valid range
    idx_safe = np.clip(nearest_room_idx, 0, n - 1)
    painted = color_lut[idx_safe]            # (H, W, 3)
    canvas = np.where(footprint[:, :, None], painted, canvas)

    # Draw walls on top (thick 2px for visibility)
    wall_mask = (wall_lines > 0) & footprint
    canvas[wall_mask] = WALL_COLOR

    return canvas


def extract_condition(rooms: list, cfg: ConditionConfig) -> torch.Tensor:
    """Build the 27-dim condition vector from RPLAN room list."""
    bedrooms   = sum(1 for r in rooms if r["category"] in BEDROOM_CATS)
    bathrooms  = sum(1 for r in rooms if r["category"] in BATHROOM_CATS)
    total_area = max(400, bedrooms * 300 + bathrooms * 80 + 400)
    floors     = 1
    special    = [SPECIAL_MAP[r["category"]] for r in rooms
                  if r["category"] in SPECIAL_MAP]
    style      = "Modern"
    location   = "Lahore"

    from .utils import encode_condition
    return encode_condition({
        "bedrooms":    max(1, bedrooms),
        "bathrooms":   max(1, bathrooms),
        "totalArea":   float(total_area),
        "floors":      floors,
        "style":       style,
        "specialRooms": special,
        "location":    location,
    })


# ── Dataset ─────────────────────────────────────────────────────────────────

class RPLANPickleDataset(Dataset):
    """
    Loads RPLAN pickle files from pickle/train/ or pickle/val/.
    Returns (image_tensor [3,256,256] in [-1,1], cond_tensor [27]).
    """

    def __init__(self, root: str = "pickle", split: str = "train",
                 image_size: int = 256, augment: bool = True):
        self.split     = split
        self.image_size = image_size
        self.augment   = augment and (split == "train")
        self.cfg       = ConditionConfig()

        data_dir = Path(root) / split
        if not data_dir.exists():
            raise FileNotFoundError(
                f"Pickle directory not found: {data_dir}\n"
                f"Expected: floorplan-generation/pickle/train/ and /val/"
            )

        self.files = sorted(data_dir.glob("*.pkl"))
        if not self.files:
            raise FileNotFoundError(f"No .pkl files in {data_dir}")

        print(f"[dataset] {split}: {len(self.files):,} pickle files loaded from {data_dir}")

    def __len__(self) -> int:
        return len(self.files)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        with open(self.files[idx], "rb") as f:
            data = pickle.load(f)

        boundary = data[0].astype(np.uint8)   # 256x256 wall map
        inside   = data[2].astype(np.uint8)   # 256x256 inside mask
        rooms    = data[4]                     # list of {category, centroid}

        # Render RGB image
        img_arr = render_floorplan(boundary, inside, rooms, self.image_size)

        # Augment: random horizontal flip + 90° rotation (consistent)
        if self.augment:
            img_pil = Image.fromarray(img_arr)
            if random.random() < 0.5:
                img_pil = img_pil.transpose(Image.FLIP_LEFT_RIGHT)
                # Mirror centroids for condition consistency
                rooms = [{"category": r["category"],
                          "centroid": (r["centroid"][0],
                                       self.image_size - 1 - r["centroid"][1])}
                         for r in rooms]
            k = random.choice([0, 1, 2, 3])
            if k:
                img_pil = img_pil.rotate(k * 90, expand=False)
            img_arr = np.array(img_pil)

        # Normalize to [-1, 1]
        img_tensor = torch.from_numpy(img_arr).permute(2, 0, 1).float() / 127.5 - 1.0
        cond_tensor = extract_condition(rooms, self.cfg)

        return img_tensor, cond_tensor


# ── DataLoaders ──────────────────────────────────────────────────────────────

def make_dataloaders(cfg: TrainingConfig):
    train_ds = RPLANPickleDataset(
        root="pickle", split="train",
        image_size=cfg.image_size, augment=True
    )
    val_ds = RPLANPickleDataset(
        root="pickle", split="val",
        image_size=cfg.image_size, augment=False
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=cfg.batch_size,
        shuffle=True,
        num_workers=cfg.num_workers,
        pin_memory=cfg.pin_memory,
        drop_last=True,
        persistent_workers=False,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=cfg.batch_size,
        shuffle=False,
        num_workers=cfg.num_workers,
        pin_memory=cfg.pin_memory,
        drop_last=False,
    )

    print(f"[dataset] train={len(train_ds):,}  val={len(val_ds):,}  "
          f"batch={cfg.batch_size}  steps/epoch={len(train_loader):,}")
    return train_loader, val_loader
