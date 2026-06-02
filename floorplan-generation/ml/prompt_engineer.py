"""
Groq-powered prompt engineering for SDXL floorplan generation.

Translates user parameters into SDXL-native prompts using a fast LLM (Llama 3 on Groq).
Adds ~200-400ms latency at near-zero cost ($0.0001/call).

Requires:
    GROQ_API_KEY environment variable

Falls back to the static template if Groq is unreachable.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_TIMEOUT_S = 8

SYSTEM_PROMPT = """You are an expert prompt engineer for Stable Diffusion XL (SDXL), specializing in generating 2D TOP-DOWN FLOOR PLANS.

CRITICAL: The output MUST be a flat 2D architectural floor plan viewed from DIRECTLY ABOVE. NOT a 3D render, NOT a house exterior, NOT a perspective view. Think of a blueprint you'd see on an architect's desk.

Your job: convert user specs into an SDXL prompt that produces a clean 2D floor plan with:
- Black wall lines on white background
- Rooms shown as enclosed rectangular spaces
- Door arcs (quarter circles) at doorways
- Window markers (parallel lines) on exterior walls

MANDATORY RULES:
1. The prompt MUST start with: "2D architectural floor plan, top-down view, technical blueprint, black and white CAD drawing"
2. Use ((double parentheses)) for: ((top view)), ((2D plan)), ((flat layout)), ((black lines on white paper))
3. NEVER mention: exterior, facade, roof, sky, 3D, perspective, render, house image
4. NEVER include text/label instructions — labels are added programmatically
5. Focus ONLY on wall layout, room boundaries, doors, and windows
6. Describe room arrangement spatially (e.g., "kitchen adjacent to dining area")
7. Specify: thick black wall lines, white interior spaces, no furniture, no colors

The negative prompt MUST aggressively block: 3D renders, house exteriors, perspective views, photographs, colored rooms, furniture, landscape, sky, roof, facade, isometric view.

Respond ONLY with valid JSON in this exact format:
{
  "prompt": "the optimized positive prompt",
  "negative_prompt": "the optimized negative prompt",
  "reasoning": "one sentence explaining your prompt strategy"
}"""


def _build_user_message(
    bedrooms: int,
    bathrooms: int,
    area_sqft: float,
    style: str,
    floors: int,
    special_rooms: list[str],
    location: str = "",
) -> str:
    rooms_list = []
    rooms_list.append("living room")
    rooms_list.append("kitchen")
    rooms_list.append("dining area")
    for i in range(bedrooms):
        if i == 0:
            rooms_list.append("master bedroom with attached bathroom")
        else:
            rooms_list.append(f"bedroom {i+1}")
    for i in range(bathrooms):
        if i == 0 and bedrooms > 0:
            continue
        rooms_list.append(f"bathroom {i+1}" if i > 0 else "bathroom")
    for sr in special_rooms:
        rooms_list.append(sr.replace("_", " ").strip().lower())

    return (
        f"Generate an SDXL prompt for a 2D TOP-DOWN FLOOR PLAN (like a blueprint on paper). "
        f"NOT a 3D house, NOT an exterior. Specs:\n"
        f"- Total area: {int(area_sqft)} sq ft\n"
        f"- Floors: {floors} (show ground floor plan only)\n"
        f"- Rooms: {', '.join(rooms_list)}\n"
        f"\n"
        f"CRITICAL: Output must be a FLAT 2D floor plan viewed from directly above. "
        f"Black wall lines on white paper. Door arcs shown. Window rectangles on outer walls. "
        f"NO furniture, NO colors, NO 3D, NO perspective, NO house exterior. "
        f"NO text labels in the prompt."
    )


async def engineer_prompt_async(
    bedrooms: int,
    bathrooms: int,
    area_sqft: float,
    style: str,
    floors: int = 1,
    special_rooms: Optional[list[str]] = None,
    location: str = "",
) -> tuple[str, str]:
    """
    Use Groq LLM to generate an optimized SDXL prompt pair.
    Returns (prompt, negative_prompt). Falls back to static template on failure.
    """
    if not GROQ_API_KEY:
        logger.debug("No GROQ_API_KEY set, using static prompt template")
        return _static_fallback(bedrooms, bathrooms, area_sqft, style, floors, special_rooms or [])

    user_msg = _build_user_message(
        bedrooms, bathrooms, area_sqft, style, floors, special_rooms or [], location
    )

    try:
        async with httpx.AsyncClient(timeout=GROQ_TIMEOUT_S) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 600,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()

        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        prompt = parsed.get("prompt", "")
        negative = parsed.get("negative_prompt", "")

        if not prompt or len(prompt) < 50:
            raise ValueError("Groq returned insufficient prompt")

        logger.info(f"Groq prompt engineered ({len(prompt)} chars): {parsed.get('reasoning', '')}")
        return prompt, negative

    except Exception as e:
        logger.warning(f"Groq prompt engineering failed ({e}), using static fallback")
        return _static_fallback(bedrooms, bathrooms, area_sqft, style, floors, special_rooms or [])


def engineer_prompt_sync(
    bedrooms: int,
    bathrooms: int,
    area_sqft: float,
    style: str,
    floors: int = 1,
    special_rooms: Optional[list[str]] = None,
    location: str = "",
) -> tuple[str, str]:
    """Synchronous wrapper for use in thread pool contexts."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(1) as pool:
                future = pool.submit(
                    asyncio.run,
                    engineer_prompt_async(
                        bedrooms, bathrooms, area_sqft, style, floors, special_rooms, location
                    )
                )
                return future.result(timeout=GROQ_TIMEOUT_S + 2)
        else:
            return loop.run_until_complete(
                engineer_prompt_async(
                    bedrooms, bathrooms, area_sqft, style, floors, special_rooms, location
                )
            )
    except Exception:
        return asyncio.run(
            engineer_prompt_async(
                bedrooms, bathrooms, area_sqft, style, floors, special_rooms, location
            )
        )


def _static_fallback(
    bedrooms: int,
    bathrooms: int,
    area_sqft: float,
    style: str,
    floors: int,
    special_rooms: list[str],
) -> tuple[str, str]:
    """Static 2D floor plan prompt — used when Groq is unavailable."""
    room_list = ["living room", "kitchen", "dining area"]
    for i in range(bedrooms):
        room_list.append("master bedroom with ensuite" if i == 0 else f"bedroom {i+1}")
    for i in range(bathrooms):
        if i == 0 and bedrooms > 0:
            continue
        room_list.append("bathroom")
    for sr in special_rooms:
        room_list.append(sr.replace("_", " ").strip().lower())

    rooms_desc = ", ".join(room_list)

    if area_sqft <= 800:
        size_desc = "small apartment"
    elif area_sqft <= 1500:
        size_desc = "medium house"
    elif area_sqft <= 3000:
        size_desc = "large family house"
    else:
        size_desc = "luxury residence"

    floor_desc = "single story" if floors == 1 else f"{floors}-story, ground floor only"

    prompt = (
        f"2D architectural floor plan, top-down view, technical blueprint, "
        f"black and white CAD drawing on white paper, "
        f"((top view)), ((2D plan)), ((flat layout)), "
        f"{floor_desc} {size_desc}, {int(area_sqft)} square feet, "
        f"rooms: {rooms_desc}, "
        f"thick black walls, thin door arcs, window rectangles on exterior walls, "
        f"clean room boundaries, proportional room sizes, "
        f"architectural line drawing, engineering blueprint style, "
        f"sharp precise lines, white background, high contrast, "
        f"no furniture, no colors, no shading, monochrome line art"
    )

    negative_prompt = (
        "3D, perspective, three dimensional, depth, vanishing point, "
        "house exterior, building exterior, facade, roof, sky, clouds, "
        "landscape, garden, trees, grass, pool, driveway, street, "
        "photograph, photo, realistic, photorealistic, render, rendering, "
        "interior design, furniture, decoration, people, cars, "
        "isometric, axonometric, bird eye view of building, "
        "colored, colorful, watercolor, painting, artistic, sketch, "
        "3D model, 3D rendering, CGI, Vray, Unreal Engine, Octane, "
        "elevation view, section view, front view, side view, "
        "modern house, villa, apartment building, skyscraper, "
        "windows with glass, doors with handles, stairs perspective, "
        "shadows, reflections, ambient occlusion, lighting, sun, "
        "blurry, low quality, jpeg artifacts, noise, grain, "
        "text, letters, words, labels, numbers, watermark, logo"
    )

    return prompt, negative_prompt
