"""
Pollinations.ai Floorplan Generator — Free, no API key required.

Generates 2D architectural floor plans via Pollinations.ai FLUX model.
Zero cost, unlimited usage, no authentication needed.

The prompt is carefully engineered to produce blueprint-style output.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import time
import urllib.parse
import urllib.request
from typing import Optional, List

logger = logging.getLogger(__name__)

POLLINATIONS_BASE = "https://image.pollinations.ai/prompt"
DEFAULT_MODEL = "flux"
REQUEST_TIMEOUT = 90


def _build_floorplan_prompt(
    bedrooms: int = 3,
    bathrooms: int = 2,
    area_sqft: float = 1800,
    floors: int = 1,
    style: str = "Modern",
    special_rooms: Optional[List[str]] = None,
    location: str = "",
) -> str:
    """Build an optimized prompt for 2D floor plan generation."""
    special_rooms = special_rooms or []

    # Room list
    rooms = ["living room", "kitchen", "dining area"]
    rooms.append("master bedroom with attached bathroom")
    for i in range(1, bedrooms):
        rooms.append(f"bedroom {i + 1}")
    for i in range(bathrooms - 1):
        rooms.append("bathroom")
    for sr in special_rooms:
        rooms.append(sr.replace("_", " ").lower())
    rooms.append("hallway")

    rooms_str = ", ".join(rooms)

    # Size description
    if area_sqft <= 800:
        size = "small apartment"
    elif area_sqft <= 1500:
        size = "medium family house"
    elif area_sqft <= 3000:
        size = "large family house"
    else:
        size = "luxury residence"

    floor_str = "single story" if floors == 1 else f"{floors} story ground floor"

    prompt = (
        f"architectural floor plan drawing printed on white paper, "
        f"black ink lines only, birds eye view, "
        f"rectangular rooms with labeled names, "
        f"{rooms_str}, "
        f"{floor_str} {style.lower()} {size} {int(area_sqft)} sqft, "
        f"measured dimensions on walls, door symbols, window symbols, "
        f"professional drafting, clean architectural blueprint"
    )

    return prompt


def _generate_seed(bedrooms: int, bathrooms: int, area: float, seed: Optional[int] = None) -> int:
    """Generate a deterministic seed from parameters, or use provided seed."""
    if seed is not None:
        return seed
    h = hashlib.md5(f"{bedrooms}-{bathrooms}-{area}".encode()).hexdigest()
    return int(h[:8], 16) % 1000000


def generate_floorplan(
    bedrooms: int = 3,
    bathrooms: int = 2,
    area_sqft: float = 1800,
    floors: int = 1,
    style: str = "Modern",
    special_rooms: Optional[List[str]] = None,
    location: str = "",
    seed: Optional[int] = None,
    width: int = 1024,
    height: int = 1024,
) -> Optional[dict]:
    """
    Generate a floor plan image via Pollinations.ai.

    Returns dict with:
      - image_base64: base64-encoded PNG/JPEG image
      - width, height: image dimensions
      - prompt_used: the prompt that was sent
      - generation_time_ms: time taken
      - source: "pollinations_ai"

    Returns None on failure.
    """
    t0 = time.time()
    special_rooms = special_rooms or []

    prompt = _build_floorplan_prompt(
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        area_sqft=area_sqft,
        floors=floors,
        style=style,
        special_rooms=special_rooms,
        location=location,
    )

    actual_seed = _generate_seed(bedrooms, bathrooms, area_sqft, seed)

    encoded_prompt = urllib.parse.quote(prompt)
    url = (
        f"{POLLINATIONS_BASE}/{encoded_prompt}"
        f"?width={width}&height={height}"
        f"&nologo=true&seed={actual_seed}&model={DEFAULT_MODEL}"
    )

    logger.info(f"Pollinations request: {bedrooms}bed/{bathrooms}bath/{int(area_sqft)}sqft (seed={actual_seed})")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ArchitectXpert/1.0"})
        response = urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT)
        img_data = response.read()

        if len(img_data) < 1000:
            logger.error(f"Pollinations returned too-small response ({len(img_data)} bytes)")
            return None

        img_b64 = base64.b64encode(img_data).decode("ascii")
        content_type = response.headers.get("Content-Type", "image/jpeg")
        img_format = "png" if "png" in content_type else "jpeg"

        elapsed_ms = int((time.time() - t0) * 1000)

        logger.info(f"Pollinations generated in {elapsed_ms}ms ({len(img_data) // 1024} KB)")

        return {
            "image_base64": img_b64,
            "width": width,
            "height": height,
            "format": img_format,
            "source": "pollinations_ai",
            "prompt_used": prompt[:200],
            "seed": actual_seed,
            "generation_time_ms": elapsed_ms,
        }

    except urllib.error.HTTPError as e:
        logger.error(f"Pollinations HTTP error {e.code}: {e.reason}")
        return None
    except urllib.error.URLError as e:
        logger.error(f"Pollinations URL error: {e.reason}")
        return None
    except TimeoutError:
        logger.error("Pollinations request timed out")
        return None
    except Exception as e:
        logger.error(f"Pollinations error: {e}")
        return None


def generate_variations(
    bedrooms: int = 3,
    bathrooms: int = 2,
    area_sqft: float = 1800,
    floors: int = 1,
    style: str = "Modern",
    special_rooms: Optional[List[str]] = None,
    location: str = "",
    count: int = 4,
    width: int = 1024,
    height: int = 1024,
) -> List[dict]:
    """Generate multiple variations by using different seeds."""
    results = []
    base_seed = _generate_seed(bedrooms, bathrooms, area_sqft)

    for i in range(count):
        result = generate_floorplan(
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            area_sqft=area_sqft,
            floors=floors,
            style=style,
            special_rooms=special_rooms,
            location=location,
            seed=base_seed + i * 111,
            width=width,
            height=height,
        )
        if result:
            results.append(result)

    return results
