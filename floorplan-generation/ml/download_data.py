"""
Dataset acquisition helper for ArchitectXpert floorplan training.

RPLAN (~80K images, ~1.3 GB) is the primary dataset. It requires a
data-access form. This script handles two scenarios:

A) You have the RPLAN zip already — just extracts and verifies it.
B) You don't have RPLAN yet — sets up a smaller synthetic dataset
   so you can verify the training pipeline runs before waiting for
   RPLAN approval.

Usage:
    # Scenario A — you downloaded RPLAN zip:
    python -m ml.download_data --rplan-zip path/to/rplan.zip

    # Scenario B — smoke-test with synthetic data:
    python -m ml.download_data --synthetic --n 2000

Requesting RPLAN access:
    https://irc.cs.sfu.ca/RPlan/  (fill the Google Form)
    They email a download link within 1-2 days.
"""

import argparse
import random
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


# ─── RPLAN color palette (matches utils.rplan_color_to_rooms) ─────────────────

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

BG = ROOM_COLORS["background"]
WALL = ROOM_COLORS["wall"]
WALL_W = 4  # pixels


def _random_rect(rng, canvas_w, canvas_h, min_frac=0.08, max_frac=0.35):
    """Return (x0, y0, x1, y1) for a random rectangle inside canvas."""
    w = int(canvas_w * rng.uniform(min_frac, max_frac))
    h = int(canvas_h * rng.uniform(min_frac, max_frac))
    x0 = rng.randint(0, canvas_w - w)
    y0 = rng.randint(0, canvas_h - h)
    return (x0, y0, x0 + w, y0 + h)


def generate_synthetic_floorplan(seed: int, size: int = 256) -> Image.Image:
    """
    Draw a rough synthetic floorplan using colored rectangles.
    Not architecturally accurate — used only to verify the training pipeline.
    """
    rng = random.Random(seed)
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)

    bedrooms = rng.randint(1, 5)
    bathrooms = rng.randint(1, min(bedrooms + 1, 4))
    has_garage = rng.random() < 0.3
    has_balcony = rng.random() < 0.4

    # Outer boundary
    margin = size // 16
    draw.rectangle([margin, margin, size - margin, size - margin], outline=WALL, width=WALL_W)

    # Living room (large, anchored to left)
    lw = int((size - 2 * margin) * rng.uniform(0.35, 0.50))
    lh = int((size - 2 * margin) * rng.uniform(0.40, 0.60))
    draw.rectangle([margin, margin, margin + lw, margin + lh], fill=ROOM_COLORS["living_room"], outline=WALL, width=WALL_W)

    # Kitchen
    kw = int((size - 2 * margin) * rng.uniform(0.20, 0.30))
    kh = int((size - 2 * margin) * rng.uniform(0.20, 0.30))
    kx = margin + lw
    draw.rectangle([kx, margin, kx + kw, margin + kh], fill=ROOM_COLORS["kitchen"], outline=WALL, width=WALL_W)

    # Bedrooms
    bx = margin + lw + kw
    by = margin
    bw = (size - margin - bx) if (size - margin - bx) > 20 else int((size - 2 * margin) * 0.25)
    bx = max(margin, min(bx, size - margin - bw))
    bh_each = max(20, (size - 2 * margin) // max(bedrooms, 1))
    for i in range(bedrooms):
        y0 = margin + i * bh_each
        y1 = min(y0 + bh_each, size - margin)
        if y1 > y0:
            draw.rectangle([bx, y0, bx + bw, y1], fill=ROOM_COLORS["bedroom"], outline=WALL, width=WALL_W)

    # Bathrooms
    bath_w = int((size - 2 * margin) * 0.12)
    bath_h = int((size - 2 * margin) * 0.12)
    for i in range(bathrooms):
        bax = margin + i * (bath_w + WALL_W)
        bay = size - margin - bath_h
        draw.rectangle([bax, bay, bax + bath_w, bay + bath_h], fill=ROOM_COLORS["bathroom"], outline=WALL, width=WALL_W)

    if has_balcony:
        baw = int((size - 2 * margin) * 0.20)
        draw.rectangle([margin, size - margin - 20, margin + baw, size - margin], fill=ROOM_COLORS["balcony"], outline=WALL, width=WALL_W)

    if has_garage:
        draw.rectangle([size - margin - 40, size - margin - 30, size - margin, size - margin], fill=ROOM_COLORS["garage"], outline=WALL, width=WALL_W)

    return img


def setup_synthetic(output_dir: Path, n: int):
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Generating {n} synthetic floorplan images -> {output_dir}")
    for i in range(n):
        img = generate_synthetic_floorplan(seed=i)
        img.save(output_dir / f"{i:06d}.png")
        if (i + 1) % 500 == 0:
            print(f"  {i+1}/{n}")
    print(f"Done. {n} images saved to {output_dir}")


def extract_rplan(zip_path: Path, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Extracting {zip_path} -> {output_dir}")
    with zipfile.ZipFile(zip_path, "r") as zf:
        png_files = [f for f in zf.namelist() if f.endswith(".png")]
        print(f"Found {len(png_files):,} PNG files in zip")
        for i, name in enumerate(png_files):
            zf.extract(name, output_dir)
            if (i + 1) % 5000 == 0:
                print(f"  Extracted {i+1}/{len(png_files)}")
    print(f"Extraction complete. Images in {output_dir}")



def verify_dataset(data_dir: Path):
    pngs = list(data_dir.rglob("*.png"))
    print(f"\nDataset verification:")
    print(f"  Path       : {data_dir}")
    print(f"  PNG count  : {len(pngs):,}")
    if pngs:
        sample = Image.open(pngs[0])
        print(f"  Sample size: {sample.size}")
        print(f"  Status     : READY for training")
    else:
        print(f"  Status     : NO IMAGES FOUND")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ArchitectXpert dataset setup")
    parser.add_argument("--rplan-zip", type=str, default="", help="Path to RPLAN zip file")
    parser.add_argument("--synthetic", action="store_true", help="Generate synthetic dataset")
    parser.add_argument("--n", type=int, default=2000, help="Number of synthetic images")
    parser.add_argument("--output", type=str, default="data/rplan", help="Output directory")
    args = parser.parse_args()

    out = Path(args.output)

    if args.rplan_zip:
        extract_rplan(Path(args.rplan_zip), out)
    elif args.synthetic:
        setup_synthetic(out, args.n)
    else:
        print(__doc__)
        print("\nTo generate synthetic smoke-test data:")
        print("  python -m ml.download_data --synthetic --n 2000")
        print("\nTo extract RPLAN (after downloading):")
        print("  python -m ml.download_data --rplan-zip ~/Downloads/rplan.zip")

    if out.exists():
        verify_dataset(out)
