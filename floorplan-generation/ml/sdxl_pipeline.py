"""
Real SDXL + Fooocus + LCM-LoRA Floorplan Generation Pipeline.

Architecture:
  1. Generate structural layout via retrieval/cGAN → clean line drawing (existing)
  2. Use that as img2img conditioning → SDXL base (fp16)
  3. Apply Fooocus quality patch for enhanced detail
  4. Use LCM-LoRA for fast 4-8 step inference (vs 25-50 standard)

Hardware target: RTX 3060 12GB VRAM
  - SDXL fp16 UNet: ~5GB
  - VAE fp16: ~160MB
  - LCM-LoRA: ~200MB
  - Working memory: ~4-5GB
  Total: ~10GB (fits in 12GB with headroom)

Performance: ~3-8s per image at 1024x1024 with LCM (4-8 steps)
"""

from __future__ import annotations

import gc
import logging
import math
import os
import time
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import torch

logger = logging.getLogger(__name__)

# LCM-LoRA model ID on HuggingFace
LCM_LORA_ID = "latent-consistency/lcm-lora-sdxl"
SDXL_BASE_ID = "stabilityai/stable-diffusion-xl-base-1.0"

# Generation defaults
DEFAULT_STEPS_LCM = 6
DEFAULT_GUIDANCE_LCM = 1.5
DEFAULT_STRENGTH_IMG2IMG = 0.65
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1024


class SDXLDiffusionPipeline:
    """
    Real SDXL diffusion pipeline with:
      - Fooocus inpaint patch (quality enhancer applied to UNet weights)
      - LCM-LoRA for fast inference (4-8 steps)
      - img2img mode using cGAN/retrieval layout as structural guide
    """

    def __init__(
        self,
        fooocus_patch_path: str = "checkpoints/inpaint_v26.fooocus.patch",
        device: str = "auto",
        dtype: str = "fp16",
        enable_lcm: bool = True,
        offload_to_cpu: bool = False,
    ):
        self._fooocus_patch_path = Path(fooocus_patch_path)
        self._device_str = device
        self._dtype = torch.float16 if dtype == "fp16" else torch.float32
        self._enable_lcm = enable_lcm
        self._offload = offload_to_cpu

        self._pipe = None
        self._lcm_loaded = False
        self._fooocus_applied = False
        self._device: torch.device = None
        self.ready = False

    @property
    def is_ready(self) -> bool:
        return self.ready

    @property
    def device_name(self) -> str:
        if self._device and self._device.type == "cuda":
            return torch.cuda.get_device_name(self._device)
        return str(self._device) if self._device else "uninitialized"

    def load(self) -> bool:
        """
        Load SDXL pipeline with LCM-LoRA and Fooocus patch.
        Returns True on success.

        Load order (matters for VRAM):
          1. Load pipeline from disk (CPU)
          2. Load & fuse LCM-LoRA (CPU, then fused into weights)
          3. Apply Fooocus patch (CPU, replace UNet weights)
          4. Move to CUDA
          5. Enable memory optimizations
        """
        try:
            from diffusers import (
                StableDiffusionXLImg2ImgPipeline,
                LCMScheduler,
            )

            t0 = time.time()

            # Resolve device
            if self._device_str == "auto":
                self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            else:
                self._device = torch.device(self._device_str)

            # Free CUDA memory from other models before loading
            if self._device.type == "cuda":
                gc.collect()
                torch.cuda.empty_cache()
                free_vram = (torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated()) // (1024 * 1024)
                logger.info(f"Loading SDXL on {self._device} ({self._dtype}), free VRAM: {free_vram} MB")
            else:
                logger.info(f"Loading SDXL pipeline on {self._device} ({self._dtype})")

            # Step 1: Load pipeline from HuggingFace cache (stays on CPU initially)
            self._pipe = StableDiffusionXLImg2ImgPipeline.from_pretrained(
                SDXL_BASE_ID,
                torch_dtype=self._dtype,
                variant="fp16",
                use_safetensors=True,
            )
            logger.info(f"Pipeline loaded from disk in {time.time() - t0:.1f}s")

            # Step 2: Load LCM-LoRA (must be done before moving to GPU for VRAM efficiency)
            if self._enable_lcm:
                self._load_lcm_lora()

            # Step 3: Apply Fooocus patch (on CPU, before GPU transfer)
            if self._fooocus_patch_path.exists():
                self._apply_fooocus_patch()
            else:
                logger.info(f"No Fooocus patch at {self._fooocus_patch_path}, skipping")

            # Step 4: Move to device
            if self._offload and self._device.type == "cuda":
                self._pipe.enable_model_cpu_offload()
                logger.info("Model CPU offload enabled (saves ~2GB VRAM)")
            else:
                self._pipe = self._pipe.to(self._device)

            # Step 5: Memory optimizations for RTX 3060
            if self._device.type == "cuda":
                self._pipe.vae.enable_slicing()
                self._pipe.vae.enable_tiling()
                try:
                    self._pipe.enable_xformers_memory_efficient_attention()
                    logger.info("xformers memory-efficient attention enabled")
                except Exception:
                    logger.info("Using default attention (xformers not available)")

            elapsed = time.time() - t0
            self.ready = True
            logger.info(
                f"SDXL pipeline ready in {elapsed:.1f}s "
                f"(LCM: {self._lcm_loaded}, Fooocus: {self._fooocus_applied}, "
                f"device: {self.device_name})"
            )
            return True

        except torch.cuda.OutOfMemoryError:
            logger.error("CUDA OOM loading SDXL — not enough VRAM. Try enabling cpu_offload.")
            self.ready = False
            torch.cuda.empty_cache()
            gc.collect()
            return False
        except Exception as e:
            logger.error(f"Failed to load SDXL pipeline: {e}", exc_info=True)
            self.ready = False
            return False

    def _apply_fooocus_patch(self):
        """
        Apply Fooocus inpaint v26 patch to UNet weights.

        Fooocus patch format: each key → tuple(uint8_data, scale, offset)
        Dequantization: weight_fp16 = (uint8_data.float() / 255.0) * (scale - offset) + offset

        Keys use ComfyUI naming (diffusion_model.*) which maps to diffusers via
        the convert_ldm_unet_checkpoint utility or prefix stripping.
        """
        try:
            patch_path = self._fooocus_patch_path
            logger.info(f"Applying Fooocus patch from {patch_path} (~1.3GB)...")
            t0 = time.time()

            patch_state = torch.load(
                str(patch_path), map_location="cpu", weights_only=True
            )

            if not isinstance(patch_state, dict) or len(patch_state) == 0:
                logger.warning("Fooocus patch: empty or invalid checkpoint")
                return

            # Check if this is Fooocus tuple format
            first_val = next(iter(patch_state.values()))
            is_tuple_format = isinstance(first_val, tuple) and len(first_val) == 3

            if not is_tuple_format:
                logger.warning("Fooocus patch: unexpected format (not tuple-3)")
                del patch_state
                return

            # Try to use diffusers built-in LDMU key conversion
            unet_state = self._pipe.unet.state_dict()
            diffusers_keys = set(unet_state.keys())

            # Build key mapping: strip "diffusion_model." prefix
            applied = 0
            skipped = 0

            for patch_key, patch_tuple in patch_state.items():
                # Strip ComfyUI prefix
                diffusers_key = patch_key
                for prefix in ("model.diffusion_model.", "diffusion_model."):
                    if diffusers_key.startswith(prefix):
                        diffusers_key = diffusers_key[len(prefix):]
                        break

                if diffusers_key not in diffusers_keys:
                    skipped += 1
                    continue

                # Dequantize: (uint8 / 255) * (max - min) + min
                quant_data, scale, offset = patch_tuple
                target_shape = unet_state[diffusers_key].shape

                if quant_data.shape != target_shape:
                    skipped += 1
                    continue

                # Reconstruct float16 weight from quantized representation
                weight = (quant_data.float() / 255.0) * (scale.float() - offset.float()) + offset.float()
                unet_state[diffusers_key] = weight.to(dtype=self._dtype).reshape(target_shape)
                applied += 1

            if applied > 0:
                self._pipe.unet.load_state_dict(unet_state)
                self._fooocus_applied = True
                elapsed = time.time() - t0
                logger.info(f"Fooocus patch applied: {applied}/{len(patch_state)} layers in {elapsed:.1f}s")
            else:
                logger.warning(f"Fooocus patch: no matching layers (skipped {skipped})")

            del patch_state, unet_state
            gc.collect()

        except Exception as e:
            logger.warning(f"Fooocus patch failed (non-fatal): {e}")

    def _load_lcm_lora(self):
        """Load LCM-LoRA adapter for fast 4-8 step inference."""
        try:
            logger.info(f"Loading LCM-LoRA from {LCM_LORA_ID}")
            self._pipe.load_lora_weights(LCM_LORA_ID)
            self._pipe.fuse_lora()

            # Switch scheduler to LCM
            from diffusers import LCMScheduler
            self._pipe.scheduler = LCMScheduler.from_config(
                self._pipe.scheduler.config
            )

            self._lcm_loaded = True
            logger.info("LCM-LoRA loaded and fused — fast inference enabled")

        except Exception as e:
            logger.warning(f"LCM-LoRA load failed (using standard scheduler): {e}")
            self._lcm_loaded = False

    def generate(
        self,
        condition_image: np.ndarray,
        prompt: str,
        negative_prompt: str = "",
        steps: int = DEFAULT_STEPS_LCM,
        guidance_scale: float = DEFAULT_GUIDANCE_LCM,
        strength: float = DEFAULT_STRENGTH_IMG2IMG,
        width: int = DEFAULT_WIDTH,
        height: int = DEFAULT_HEIGHT,
        seed: Optional[int] = None,
    ) -> Optional[np.ndarray]:
        """
        Generate a high-quality floorplan render via SDXL img2img.

        Args:
            condition_image: Input layout image (from cGAN/retrieval renderer) as RGB numpy array.
                             Will be resized to width x height.
            prompt: SDXL prompt (from prompt_engineer).
            negative_prompt: Negative prompt.
            steps: Inference steps (4-8 with LCM, 20-30 without).
            guidance_scale: CFG scale (1.0-2.0 with LCM, 7-12 without).
            strength: img2img denoising strength (0.0=no change, 1.0=full denoise).
            width: Output width.
            height: Output height.
            seed: Random seed for reproducibility.

        Returns:
            RGB numpy array of shape (height, width, 3) or None on failure.
        """
        if not self.ready or self._pipe is None:
            logger.error("Pipeline not ready")
            return None

        try:
            from PIL import Image as PILImage

            t0 = time.time()

            # Prepare condition image
            if condition_image.ndim == 2:
                condition_image = np.stack([condition_image] * 3, axis=-1)

            cond_pil = PILImage.fromarray(condition_image.astype(np.uint8))
            cond_pil = cond_pil.resize((width, height), PILImage.LANCZOS)

            # Adjust params based on whether LCM is loaded
            if not self._lcm_loaded:
                steps = max(steps, 20)
                guidance_scale = max(guidance_scale, 7.0)

            # Generator for reproducibility
            generator = None
            if seed is not None:
                generator = torch.Generator(device=self._device).manual_seed(seed)

            # Run inference
            with torch.inference_mode():
                result = self._pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt if negative_prompt else None,
                    image=cond_pil,
                    strength=strength,
                    num_inference_steps=steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                    width=width,
                    height=height,
                )

            output_img = result.images[0]
            output_np = np.array(output_img)

            elapsed = time.time() - t0
            logger.info(
                f"SDXL generation: {elapsed:.2f}s "
                f"(steps={steps}, cfg={guidance_scale}, strength={strength})"
            )

            return output_np

        except torch.cuda.OutOfMemoryError:
            logger.error("CUDA OOM during generation — clearing cache")
            torch.cuda.empty_cache()
            gc.collect()
            return None
        except Exception as e:
            logger.error(f"SDXL generation failed: {e}", exc_info=True)
            return None

    def generate_from_layout(
        self,
        layout: dict,
        prompt: str,
        negative_prompt: str = "",
        steps: int = DEFAULT_STEPS_LCM,
        guidance_scale: float = DEFAULT_GUIDANCE_LCM,
        strength: float = DEFAULT_STRENGTH_IMG2IMG,
        width: int = DEFAULT_WIDTH,
        height: int = DEFAULT_HEIGHT,
        seed: Optional[int] = None,
        total_area_sqft: float = 1800.0,
    ) -> Optional[np.ndarray]:
        """
        Higher-level: render layout dict to condition image, then run SDXL.
        Uses the existing renderer to create the structural condition.
        """
        try:
            from .renderer import render_floorplan

            # Render the layout to a clean architectural line drawing
            condition_pil = render_floorplan(
                layout,
                total_area_sqft=total_area_sqft,
                output_size=max(width, height),
                title="",
                unit_label="",
                source="condition",
                confidence=0.0,
            )
            condition_np = np.array(condition_pil)

            return self.generate(
                condition_image=condition_np,
                prompt=prompt,
                negative_prompt=negative_prompt,
                steps=steps,
                guidance_scale=guidance_scale,
                strength=strength,
                width=width,
                height=height,
                seed=seed,
            )

        except Exception as e:
            logger.error(f"generate_from_layout failed: {e}", exc_info=True)
            return None

    def txt2img(
        self,
        prompt: str,
        negative_prompt: str = "",
        steps: int = DEFAULT_STEPS_LCM,
        guidance_scale: float = DEFAULT_GUIDANCE_LCM,
        width: int = DEFAULT_WIDTH,
        height: int = DEFAULT_HEIGHT,
        seed: Optional[int] = None,
    ) -> Optional[np.ndarray]:
        """
        Pure text-to-image (no condition image).
        Uses a white canvas as the starting point with high strength.
        """
        white = np.ones((height, width, 3), dtype=np.uint8) * 255
        return self.generate(
            condition_image=white,
            prompt=prompt,
            negative_prompt=negative_prompt,
            steps=steps,
            guidance_scale=guidance_scale,
            strength=0.95,
            width=width,
            height=height,
            seed=seed,
        )

    def unload(self):
        """Release all GPU memory."""
        if self._pipe is not None:
            del self._pipe
            self._pipe = None

        self.ready = False
        self._lcm_loaded = False
        self._fooocus_applied = False

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

        logger.info("SDXL pipeline unloaded")

    def get_status(self) -> dict:
        """Return pipeline status for health endpoint."""
        vram_used = 0
        vram_total = 0
        if torch.cuda.is_available():
            vram_used = torch.cuda.memory_allocated() // (1024 * 1024)
            vram_total = torch.cuda.get_device_properties(0).total_memory // (1024 * 1024)

        return {
            "ready": self.ready,
            "device": self.device_name,
            "dtype": str(self._dtype),
            "lcm_loaded": self._lcm_loaded,
            "fooocus_applied": self._fooocus_applied,
            "vram_used_mb": vram_used,
            "vram_total_mb": vram_total,
            "model": SDXL_BASE_ID,
            "lcm_lora": LCM_LORA_ID if self._lcm_loaded else None,
        }
