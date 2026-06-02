"""
FastAPI inference server v4 -- Production-Grade Orchestrated Generation Pipeline.

Architecture:
  POST /generate     -> Orchestrator -> Retrieval+Adapt | cGAN+Adapt | Fallback
  POST /variations   -> Orchestrator -> 3-6 distinct alternatives
  GET  /health       -> System status (GPU, model, DB, uptime)

Start:
    cd floorplan-generation
    uvicorn ml.inference_server:app --host 0.0.0.0 --port 8004 --workers 1

Environment variables:
    PICKLE_DIR          - Path to pickle files (default: pickle/train)
    INDEX_FILE          - Path to layout index JSON (default: layout_index.json)
    CHECKPOINT_PATH     - Path to cGAN checkpoint (default: checkpoints/latest.pth)
    ENABLE_CGAN         - Enable cGAN engine (default: true)
    OUTPUT_SIZE_DEFAULT - Default render size (default: 900)
    OUTPUT_SIZE_MAX     - Maximum render size (default: 1600)
    REQUEST_TIMEOUT_S   - Per-request timeout (default: 30)
    LOG_LEVEL           - Logging level (default: INFO)
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import math
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Configuration (all magic numbers externalized) ───────────────────────────

PICKLE_DIR = Path(os.environ.get("PICKLE_DIR", "pickle/train"))
INDEX_FILE = Path(os.environ.get("INDEX_FILE", "layout_index.json"))
CHECKPOINT_PATH = os.environ.get("CHECKPOINT_PATH", "checkpoints/latest.pth")
ENABLE_CGAN = os.environ.get("ENABLE_CGAN", "true").lower() == "true"
OUTPUT_SIZE_DEFAULT = int(os.environ.get("OUTPUT_SIZE_DEFAULT", "900"))
OUTPUT_SIZE_MAX = int(os.environ.get("OUTPUT_SIZE_MAX", "1600"))
REQUEST_TIMEOUT_S = int(os.environ.get("REQUEST_TIMEOUT_S", "30"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# Cost estimation (PKR per sqft by city)
COST_PER_SQFT = {
    "lahore": 5000,
    "karachi": 6000,
    "islamabad": 7000,
    "rawalpindi": 6000,
    "faisalabad": 4500,
    "multan": 4000,
    "peshawar": 4500,
    "quetta": 4000,
    "sialkot": 4500,
    "gujranwala": 4000,
}

# ── Structured Logging ───────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("inference_server")

# ── Global State ─────────────────────────────────────────────────────────────

_db = None
_cgan = None
_adaptor = None
_orchestrator = None
_startup_time: float = 0.0
_boot_time: float = 0.0
_request_count: int = 0
_error_count: int = 0


# ── Lifespan (modern FastAPI startup/shutdown) ───────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown handlers."""
    global _db, _cgan, _adaptor, _orchestrator, _startup_time, _boot_time

    from .layout_db import LayoutDatabase
    from .adaptation import LayoutAdaptor
    from .gan_generator import CGANEngine
    from .orchestrator import GenerationOrchestrator

    t0 = time.time()
    _boot_time = t0

    # 1. Load layout database (non-blocking index load)
    logger.info("Loading LayoutDatabase...")
    _db = LayoutDatabase(pickle_dir=PICKLE_DIR, index_file=INDEX_FILE)
    _db.load()
    logger.info(f"LayoutDatabase ready: {_db.plan_count:,} plans indexed")

    # 2. Initialize adaptor
    _adaptor = LayoutAdaptor()

    # 3. Try loading cGAN (lazy -- does not block if checkpoint missing)
    if ENABLE_CGAN:
        logger.info("Attempting to load cGAN Generator...")
        _cgan = CGANEngine(checkpoint_path=CHECKPOINT_PATH)
        # Load in background thread to avoid blocking startup
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(None, _cgan.load)
        if success:
            logger.info(f"cGAN loaded on {_cgan.device_name} (epoch {_cgan.epoch})")
        else:
            logger.warning("cGAN not available, retrieval-only mode")
            _cgan = None
    else:
        logger.info("cGAN disabled by configuration")

    # 4. Wire up orchestrator
    _orchestrator = GenerationOrchestrator(
        layout_db=_db,
        cgan_engine=_cgan,
        adaptor=_adaptor,
    )

    _startup_time = time.time() - t0
    logger.info(f"Server ready in {_startup_time:.1f}s")

    yield

    # Shutdown
    logger.info("Shutting down inference server...")
    if _cgan is not None:
        _cgan.unload()


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ArchitectXpert Floorplan",
    version="4.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request ID middleware ────────────────────────────────────────────────────

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    global _request_count, _error_count
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    request.state.request_id = request_id
    _request_count += 1

    t0 = time.time()
    try:
        response = await call_next(request)
        elapsed_ms = int((time.time() - t0) * 1000)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
        if response.status_code >= 400:
            _error_count += 1
        return response
    except Exception:
        _error_count += 1
        raise


# ── Request Models ───────────────────────────────────────────────────────────

class FloorplanRequest(BaseModel):
    bedrooms: int = Field(3, ge=1, le=8)
    bathrooms: int = Field(2, ge=1, le=6)
    totalArea: float = Field(1800, ge=400, le=20000)
    floors: int = Field(1, ge=1, le=4)
    style: str = "Modern"
    specialRooms: List[str] = []
    location: str = "Lahore"
    seed: Optional[int] = None
    output_size: int = Field(900, ge=256, le=1600)
    prefer_cgan: bool = False


class VariationsRequest(FloorplanRequest):
    count: int = Field(4, ge=2, le=6)


# ── Response Models ──────────────────────────────────────────────────────────

class RoomDetail(BaseModel):
    name: str
    category: int
    area_sqft: float
    dimensions: str
    bbox: List[int]


class FloorplanResponse(BaseModel):
    image_base64: str
    width: int
    height: int
    format: str
    source: str
    confidence: float
    rooms: List[RoomDetail]
    total_area_sqft: float
    bedroom_count: int
    bathroom_count: int
    special_rooms: List[str]
    cost_estimate_pkr: int
    cost_formatted: str
    generation_time_ms: int
    model_loaded: bool = True


class VariationsResponse(BaseModel):
    variations: List[FloorplanResponse]
    count: int


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Detailed system status endpoint."""
    gpu_available = False
    gpu_device = None
    gpu_vram_mb = 0

    try:
        import torch
        gpu_available = torch.cuda.is_available()
        if gpu_available:
            gpu_device = torch.cuda.get_device_name(0)
            gpu_vram_mb = torch.cuda.get_device_properties(0).total_memory // (1024 * 1024)
    except Exception:
        pass

    uptime_s = time.time() - _boot_time if _boot_time > 0 else 0

    return {
        "status": "ok" if _orchestrator is not None else "starting",
        "version": "4.0.0",
        "uptime_s": round(uptime_s, 0),
        "requests_total": _request_count,
        "errors_total": _error_count,
        "gpu_available": gpu_available,
        "gpu_device": gpu_device,
        "gpu_vram_mb": gpu_vram_mb,
        "cgan_loaded": _cgan is not None and _cgan.is_ready,
        "cgan_checkpoint": CHECKPOINT_PATH if _cgan and _cgan.is_ready else None,
        "cgan_epoch": _cgan.epoch if _cgan and _cgan.is_ready else None,
        "db_plan_count": _db.plan_count if _db else 0,
        "db_index_loaded": _db.is_ready if _db else False,
        "engines": {
            "retrieval": "ready" if (_db and _db.is_ready) else "unavailable",
            "cgan": "ready" if (_cgan and _cgan.is_ready) else "unavailable",
            "adaptation": "ready" if _adaptor else "unavailable",
        },
        "startup_time_s": round(_startup_time, 1),
    }


@app.post("/generate", response_model=FloorplanResponse)
async def generate(req: FloorplanRequest):
    """
    Main generation endpoint.
    Delegates to GenerationOrchestrator.generate() in a thread pool to avoid
    blocking the event loop.
    """
    if _orchestrator is None:
        raise HTTPException(503, "Server still starting up")

    from .orchestrator import GenerateRequest

    gen_req = GenerateRequest(
        bedrooms=req.bedrooms,
        bathrooms=req.bathrooms,
        totalArea=req.totalArea,
        floors=req.floors,
        style=req.style,
        specialRooms=req.specialRooms,
        location=req.location,
        seed=req.seed,
        output_size=min(req.output_size, OUTPUT_SIZE_MAX),
        prefer_cgan=req.prefer_cgan,
    )

    # Run CPU-bound generation in thread pool
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_orchestrator.generate, gen_req),
            timeout=REQUEST_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, f"Generation timed out after {REQUEST_TIMEOUT_S}s")
    except Exception as e:
        logger.error(f"Generation error: {e}", exc_info=True)
        raise HTTPException(500, "Internal generation error")

    if result is None or result.layout is None:
        raise HTTPException(503, "Generation failed across all engines")

    response = _build_response(result, req)
    return response


@app.post("/variations", response_model=VariationsResponse)
async def variations(req: VariationsRequest):
    """Generate multiple distinct alternatives in a thread pool."""
    if _orchestrator is None:
        raise HTTPException(503, "Server still starting up")

    from .orchestrator import GenerateRequest

    gen_req = GenerateRequest(
        bedrooms=req.bedrooms,
        bathrooms=req.bathrooms,
        totalArea=req.totalArea,
        floors=req.floors,
        style=req.style,
        specialRooms=req.specialRooms,
        location=req.location,
        seed=req.seed,
        output_size=min(req.output_size, OUTPUT_SIZE_MAX),
        prefer_cgan=req.prefer_cgan,
    )

    timeout = REQUEST_TIMEOUT_S * 2  # Variations get extra time

    try:
        results = await asyncio.wait_for(
            asyncio.to_thread(_orchestrator.generate_variations, gen_req, req.count),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, f"Variations timed out after {timeout}s")
    except Exception as e:
        logger.error(f"Variations error: {e}", exc_info=True)
        raise HTTPException(500, "Internal generation error")

    variation_responses = []
    for result in results:
        response = _build_response(result, req)
        variation_responses.append(response)

    return VariationsResponse(
        variations=variation_responses,
        count=len(variation_responses),
    )


# Legacy endpoint for backwards compatibility
@app.post("/generate-batch")
async def generate_batch(req: FloorplanRequest, n: int = 4):
    """Generate n layout variations (legacy endpoint)."""
    n = min(n, 6)
    var_req = VariationsRequest(
        bedrooms=req.bedrooms,
        bathrooms=req.bathrooms,
        totalArea=req.totalArea,
        floors=req.floors,
        style=req.style,
        specialRooms=req.specialRooms,
        location=req.location,
        seed=req.seed,
        output_size=req.output_size,
        prefer_cgan=req.prefer_cgan,
        count=n,
    )
    result = await variations(var_req)
    return {"images": [v.image_base64 for v in result.variations]}


# ── SDXL Generation endpoint (programmatic renderer) ────────────────────────

_sdxl = None

@app.post("/generate-sdxl")
async def generate_sdxl(req: FloorplanRequest):
    """Generate production-quality architectural floor plan (programmatic renderer)."""
    global _sdxl

    # Lazy-load renderer on first request
    if _sdxl is None:
        from .sdxl_generator import SDXLFloorplanGenerator
        _sdxl = SDXLFloorplanGenerator()
        logger.info("Initializing production renderer...")
        success = await asyncio.to_thread(_sdxl.load)
        if not success:
            raise HTTPException(503, "Production renderer failed to initialize")

    if not _sdxl.is_ready:
        raise HTTPException(503, "Production renderer not ready")

    t0 = time.time()

    try:
        img_np = await asyncio.wait_for(
            asyncio.to_thread(
                _sdxl.generate,
                bedrooms=req.bedrooms,
                bathrooms=req.bathrooms,
                area_sqft=req.totalArea,
                style=req.style,
                floors=req.floors,
                special_rooms=req.specialRooms,
                location=req.location,
                seed=req.seed,
                width=1024,
                height=1024,
            ),
            timeout=REQUEST_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, "Generation timed out")
    except Exception as e:
        logger.error(f"Production render error: {e}", exc_info=True)
        raise HTTPException(500, "Generation failed")

    if img_np is None:
        raise HTTPException(500, "Generation produced no output")

    # Encode to PNG base64
    from PIL import Image as PILImage
    img = PILImage.fromarray(img_np)
    buf = io.BytesIO()
    img.save(buf, format="PNG", compress_level=1)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    generation_time_ms = int((time.time() - t0) * 1000)
    buf.close()

    # Cost estimate
    city = req.location.lower() if req.location else "lahore"
    cost_per_sqft = COST_PER_SQFT.get(city, 5000)
    cost_pkr = int(req.totalArea * cost_per_sqft)
    lac = cost_pkr / 100000
    cost_formatted = f"PKR {lac / 100:.1f} Crore" if lac >= 100 else f"PKR {lac:.1f} Lac"

    return {
        "image_base64": b64,
        "width": img.width,
        "height": img.height,
        "format": "PNG",
        "source": "production_render",
        "confidence": 0.85,
        "rooms": [],
        "total_area_sqft": req.totalArea,
        "bedroom_count": req.bedrooms,
        "bathroom_count": req.bathrooms,
        "special_rooms": req.specialRooms,
        "cost_estimate_pkr": cost_pkr,
        "cost_formatted": cost_formatted,
        "generation_time_ms": generation_time_ms,
        "model_loaded": True,
    }


# ── SDXL Diffusion endpoint (real SDXL + Fooocus + LCM-LoRA) ────────────────

_sdxl_diffusion = None
_sdxl_loading = False

class SDXLDiffusionRequest(BaseModel):
    bedrooms: int = Field(3, ge=1, le=8)
    bathrooms: int = Field(2, ge=1, le=6)
    totalArea: float = Field(1800, ge=400, le=20000)
    floors: int = Field(1, ge=1, le=4)
    style: str = "Modern"
    specialRooms: List[str] = []
    location: str = "Lahore"
    seed: Optional[int] = None
    steps: int = Field(6, ge=2, le=50)
    guidance_scale: float = Field(1.5, ge=0.0, le=20.0)
    strength: float = Field(0.65, ge=0.1, le=1.0)
    width: int = Field(1024, ge=512, le=1536)
    height: int = Field(1024, ge=512, le=1536)
    use_prompt_engineer: bool = True
    mode: str = Field("img2img", pattern="^(img2img|txt2img)$")


@app.post("/generate-diffusion")
async def generate_diffusion(req: SDXLDiffusionRequest):
    """
    Real SDXL diffusion generation with LCM-LoRA fast inference.

    Modes:
      - img2img: Uses retrieval/cGAN layout as structural condition (recommended)
      - txt2img: Pure text-to-image from white canvas

    Pipeline: SDXL base fp16 → Fooocus patch → LCM-LoRA (4-8 steps)
    Performance: ~3-8s on RTX 3060 12GB
    """
    global _sdxl_diffusion, _sdxl_loading

    # Lazy-load the diffusion pipeline
    if _sdxl_diffusion is None and not _sdxl_loading:
        _sdxl_loading = True
        try:
            from .sdxl_pipeline import SDXLDiffusionPipeline
            import torch, gc

            # Free VRAM: offload cGAN to CPU temporarily so SDXL can fit
            if _cgan is not None and _cgan.is_ready:
                logger.info("Offloading cGAN to CPU to free VRAM for SDXL...")
                _cgan.offload_to_cpu()
                torch.cuda.empty_cache()
                gc.collect()

            fooocus_path = str(Path("checkpoints/inpaint_v26.fooocus.patch"))
            _sdxl_diffusion = SDXLDiffusionPipeline(
                fooocus_patch_path=fooocus_path,
                enable_lcm=True,
            )
            logger.info("Loading SDXL diffusion pipeline (first request, ~30-60s)...")
            success = await asyncio.to_thread(_sdxl_diffusion.load)
            if not success:
                _sdxl_diffusion = None
                _sdxl_loading = False
                raise HTTPException(503, "SDXL diffusion pipeline failed to load")
        except HTTPException:
            raise
        except Exception as e:
            _sdxl_diffusion = None
            _sdxl_loading = False
            logger.error(f"SDXL pipeline load error: {e}", exc_info=True)
            raise HTTPException(503, f"SDXL pipeline init failed: {str(e)[:200]}")
        finally:
            _sdxl_loading = False

    if _sdxl_diffusion is None or not _sdxl_diffusion.is_ready:
        if _sdxl_loading:
            raise HTTPException(503, "SDXL pipeline is still loading, retry in ~60s")
        raise HTTPException(503, "SDXL diffusion pipeline not available")

    t0 = time.time()

    # Build prompt
    prompt = ""
    negative_prompt = ""
    if req.use_prompt_engineer:
        from .prompt_engineer import engineer_prompt_sync
        prompt, negative_prompt = engineer_prompt_sync(
            bedrooms=req.bedrooms,
            bathrooms=req.bathrooms,
            area_sqft=req.totalArea,
            style=req.style,
            floors=req.floors,
            special_rooms=req.specialRooms,
            location=req.location,
        )
    else:
        prompt = (
            "2D architectural floor plan, top-down view, technical blueprint, "
            "black and white CAD drawing, thick wall lines, clean room boundaries, "
            "door arcs, window markers, professional architectural drawing"
        )
        negative_prompt = (
            "3D, perspective, exterior, facade, roof, photograph, furniture, "
            "colors, landscape, blurry, low quality"
        )

    # Generate based on mode
    try:
        if req.mode == "img2img" and _orchestrator is not None:
            # Get structural layout first via orchestrator
            from .orchestrator import GenerateRequest as OrcReq
            orc_req = OrcReq(
                bedrooms=req.bedrooms,
                bathrooms=req.bathrooms,
                totalArea=req.totalArea,
                floors=req.floors,
                style=req.style,
                specialRooms=req.specialRooms,
                location=req.location,
                seed=req.seed,
                output_size=max(req.width, req.height),
                prefer_cgan=False,
            )
            layout_result = await asyncio.to_thread(_orchestrator.generate, orc_req)

            if layout_result and layout_result.layout:
                img_np = await asyncio.wait_for(
                    asyncio.to_thread(
                        _sdxl_diffusion.generate_from_layout,
                        layout=layout_result.layout,
                        prompt=prompt,
                        negative_prompt=negative_prompt,
                        steps=req.steps,
                        guidance_scale=req.guidance_scale,
                        strength=req.strength,
                        width=req.width,
                        height=req.height,
                        seed=req.seed,
                        total_area_sqft=req.totalArea,
                    ),
                    timeout=120,
                )
            else:
                # Fallback to txt2img if no layout available
                img_np = await asyncio.wait_for(
                    asyncio.to_thread(
                        _sdxl_diffusion.txt2img,
                        prompt=prompt,
                        negative_prompt=negative_prompt,
                        steps=req.steps,
                        guidance_scale=req.guidance_scale,
                        width=req.width,
                        height=req.height,
                        seed=req.seed,
                    ),
                    timeout=120,
                )
        else:
            # Pure txt2img
            img_np = await asyncio.wait_for(
                asyncio.to_thread(
                    _sdxl_diffusion.txt2img,
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    steps=req.steps,
                    guidance_scale=req.guidance_scale,
                    width=req.width,
                    height=req.height,
                    seed=req.seed,
                ),
                timeout=120,
            )

    except asyncio.TimeoutError:
        raise HTTPException(504, "SDXL generation timed out (>120s)")
    except Exception as e:
        logger.error(f"SDXL diffusion error: {e}", exc_info=True)
        raise HTTPException(500, f"SDXL generation failed: {str(e)[:200]}")

    if img_np is None:
        raise HTTPException(500, "SDXL generation produced no output (possible OOM)")

    # Encode to PNG
    from PIL import Image as PILImage
    img = PILImage.fromarray(img_np)
    buf = io.BytesIO()
    img.save(buf, format="PNG", compress_level=1)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    generation_time_ms = int((time.time() - t0) * 1000)
    buf.close()

    # Cost estimate
    city = req.location.lower() if req.location else "lahore"
    cost_per_sqft = COST_PER_SQFT.get(city, 5000)
    cost_pkr = int(req.totalArea * cost_per_sqft)
    lac = cost_pkr / 100000
    cost_formatted = f"PKR {lac / 100:.1f} Crore" if lac >= 100 else f"PKR {lac:.1f} Lac"

    return {
        "image_base64": b64,
        "width": img.width,
        "height": img.height,
        "format": "PNG",
        "source": "sdxl_lcm_diffusion",
        "pipeline": _sdxl_diffusion.get_status(),
        "prompt_used": prompt[:200],
        "confidence": 0.90,
        "rooms": [],
        "total_area_sqft": req.totalArea,
        "bedroom_count": req.bedrooms,
        "bathroom_count": req.bathrooms,
        "special_rooms": req.specialRooms,
        "cost_estimate_pkr": cost_pkr,
        "cost_formatted": cost_formatted,
        "generation_time_ms": generation_time_ms,
        "model_loaded": True,
    }


@app.get("/sdxl-status")
async def sdxl_status():
    """Get SDXL diffusion pipeline status."""
    if _sdxl_diffusion is None:
        return {
            "loaded": False,
            "loading": _sdxl_loading,
            "message": "Not loaded yet — will initialize on first /generate-diffusion request",
        }
    return {
        "loaded": True,
        "loading": False,
        **_sdxl_diffusion.get_status(),
    }


# ── Pollinations.ai Free Generation endpoint ────────────────────────────────

@app.post("/generate-ai")
async def generate_ai(req: FloorplanRequest):
    """
    Generate floor plan via Pollinations.ai (free, no API key, no GPU needed).
    Uses FLUX model with optimized architectural prompts.
    ~5-60s depending on Pollinations queue.
    """
    from .pollinations_generator import generate_floorplan as poll_generate

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(
                poll_generate,
                bedrooms=req.bedrooms,
                bathrooms=req.bathrooms,
                area_sqft=req.totalArea,
                floors=req.floors,
                style=req.style,
                special_rooms=req.specialRooms,
                location=req.location,
                seed=req.seed,
                width=1024,
                height=1024,
            ),
            timeout=120,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, "AI generation timed out (>120s)")
    except Exception as e:
        logger.error(f"Pollinations error: {e}", exc_info=True)
        raise HTTPException(500, f"AI generation failed: {str(e)[:200]}")

    if result is None:
        raise HTTPException(502, "AI generation returned no image — Pollinations may be overloaded, retry")

    # Cost estimate
    city = req.location.lower() if req.location else "lahore"
    cost_per_sqft = COST_PER_SQFT.get(city, 5000)
    cost_pkr = int(req.totalArea * cost_per_sqft)
    lac = cost_pkr / 100000
    cost_formatted = f"PKR {lac / 100:.1f} Crore" if lac >= 100 else f"PKR {lac:.1f} Lac"

    return {
        "image_base64": result["image_base64"],
        "width": result["width"],
        "height": result["height"],
        "format": result["format"],
        "source": result["source"],
        "prompt_used": result.get("prompt_used", ""),
        "confidence": 0.80,
        "rooms": [],
        "total_area_sqft": req.totalArea,
        "bedroom_count": req.bedrooms,
        "bathroom_count": req.bathrooms,
        "special_rooms": req.specialRooms,
        "cost_estimate_pkr": cost_pkr,
        "cost_formatted": cost_formatted,
        "generation_time_ms": result["generation_time_ms"],
        "model_loaded": True,
    }


@app.post("/generate-ai-variations")
async def generate_ai_variations(req: VariationsRequest):
    """Generate multiple AI floor plan variations via Pollinations.ai."""
    from .pollinations_generator import generate_variations as poll_variations

    try:
        results = await asyncio.wait_for(
            asyncio.to_thread(
                poll_variations,
                bedrooms=req.bedrooms,
                bathrooms=req.bathrooms,
                area_sqft=req.totalArea,
                floors=req.floors,
                style=req.style,
                special_rooms=req.specialRooms,
                location=req.location,
                count=req.count,
                width=1024,
                height=1024,
            ),
            timeout=300,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, "AI variations timed out")
    except Exception as e:
        logger.error(f"Pollinations variations error: {e}", exc_info=True)
        raise HTTPException(500, "AI variations failed")

    if not results:
        raise HTTPException(502, "No variations generated")

    city = req.location.lower() if req.location else "lahore"
    cost_per_sqft = COST_PER_SQFT.get(city, 5000)
    cost_pkr = int(req.totalArea * cost_per_sqft)
    lac = cost_pkr / 100000
    cost_formatted = f"PKR {lac / 100:.1f} Crore" if lac >= 100 else f"PKR {lac:.1f} Lac"

    variations = []
    for r in results:
        variations.append({
            "image_base64": r["image_base64"],
            "width": r["width"],
            "height": r["height"],
            "format": r["format"],
            "source": r["source"],
            "generation_time_ms": r["generation_time_ms"],
            "cost_estimate_pkr": cost_pkr,
            "cost_formatted": cost_formatted,
        })

    return {"variations": variations, "count": len(variations)}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _build_response(result, req: FloorplanRequest) -> FloorplanResponse:
    """Convert a GenerateResult to an API response with rendered image."""
    from .renderer import render_floorplan
    from .rplan_extractor import BEDROOM_CATS, BATHROOM_CATS

    layout = result.layout
    output_size = min(req.output_size, OUTPUT_SIZE_MAX)

    # Build title
    special_str = " | ".join(s.upper() for s in req.specialRooms) if req.specialRooms else ""
    title = f"{req.bedrooms} BED  |  {req.bathrooms} BATH  |  {int(req.totalArea):,} SQFT"
    if special_str:
        title += f"  |  {special_str}"

    unit_label = f"UNIT {req.bedrooms}B{req.bathrooms}Ba"

    # Render
    img = render_floorplan(
        layout,
        total_area_sqft=req.totalArea,
        output_size=output_size,
        title=title,
        unit_label=unit_label,
        source=result.source,
        confidence=result.confidence,
    )

    # Encode to PNG (compress_level=1 for speed)
    buf = io.BytesIO()
    img.save(buf, format="PNG", compress_level=1)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    buf.close()

    # Extract room details with correct dimension math
    rooms = layout.get("rooms", [])
    fp_area_px = layout.get("footprint_area_px", 20000)
    room_details = []

    # Correct linear scale: maps pixels to feet
    # sqrt(fp_area_px) pixels corresponds to sqrt(totalArea) feet
    px_per_ft = math.sqrt(max(fp_area_px, 1)) / math.sqrt(max(req.totalArea, 1))

    for room in rooms:
        r1, c1, r2, c2 = room["bbox"]
        room_area_px = room.get("area_px", (r2 - r1) * (c2 - c1))

        # Convert pixel area to sqft proportionally
        if fp_area_px > 0:
            room_sqft = round(room_area_px / fp_area_px * req.totalArea, 1)
        else:
            room_sqft = 0.0

        # Convert pixel dimensions to feet then to inches for display
        w_ft = (c2 - c1) / px_per_ft if px_per_ft > 0 else 0
        h_ft = (r2 - r1) / px_per_ft if px_per_ft > 0 else 0
        w_inches = w_ft * 12
        h_inches = h_ft * 12

        w_str = _format_ft_in(w_inches)
        h_str = _format_ft_in(h_inches)
        dim_str = f"{w_str} x {h_str}"

        room_details.append(RoomDetail(
            name=room["name"],
            category=room["category"],
            area_sqft=room_sqft,
            dimensions=dim_str,
            bbox=[r1, c1, r2, c2],
        ))

    # Cost estimate
    city = req.location.lower() if req.location else "lahore"
    cost_per_sqft = COST_PER_SQFT.get(city, 5000)
    cost_pkr = int(req.totalArea * cost_per_sqft)
    lac = cost_pkr / 100000
    if lac >= 100:
        cost_formatted = f"PKR {lac / 100:.1f} Crore"
    else:
        cost_formatted = f"PKR {lac:.1f} Lac"

    # Actual room counts from layout
    cats = [r["category"] for r in rooms]
    actual_beds = sum(1 for c in cats if c in BEDROOM_CATS)
    actual_baths = sum(1 for c in cats if c in BATHROOM_CATS)
    specials = list(set(layout.get("special", [])))

    return FloorplanResponse(
        image_base64=b64,
        width=img.width,
        height=img.height,
        format="PNG",
        source=result.source,
        confidence=result.confidence,
        rooms=room_details,
        total_area_sqft=req.totalArea,
        bedroom_count=actual_beds,
        bathroom_count=actual_baths,
        special_rooms=specials,
        cost_estimate_pkr=cost_pkr,
        cost_formatted=cost_formatted,
        generation_time_ms=result.generation_time_ms,
        model_loaded=True,
    )


def _format_ft_in(total_inches: float) -> str:
    """Format a measurement in total inches to ft'in\" format."""
    if total_inches <= 0:
        return "0'0\""
    ft = int(total_inches // 12)
    inches = int(round(total_inches % 12))
    if inches == 12:
        ft += 1
        inches = 0
    return f"{ft}'{inches}\""
