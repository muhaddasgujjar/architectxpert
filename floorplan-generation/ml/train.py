"""
ArchitectXpert — Conditional GAN Training
==========================================
Dataset : RPLAN pickle files (pickle/train/ + pickle/val/)
         64,630 train  |  16,158 val  |  real residential floorplans
GPU     : RTX 3060 12GB  (batch=32, fp16, ~2 GB VRAM)
Runtime : ~100 epochs on real data  (~4-5 hours)

Usage:
    cd floorplan-generation
    set PYTHONIOENCODING=utf-8
    python -X utf8 -m ml.train
"""

import io
import os
import shutil
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.amp import GradScaler, autocast
from torchvision.utils import save_image

from .config import TrainingConfig, ModelConfig, ConditionConfig
from .dataset import make_dataloaders
from .model import Generator, Discriminator
from .utils import encode_condition

# Force UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


# ── Loss helpers ──────────────────────────────────────────────────────────────

def real_loss(pred):
    return F.binary_cross_entropy_with_logits(pred, torch.full_like(pred, 0.9))

def fake_loss(pred):
    return F.binary_cross_entropy_with_logits(pred, torch.zeros_like(pred))


# ── Checkpoint helpers ────────────────────────────────────────────────────────

def save_checkpoint(state, epoch, ckpt_dir: Path, keep_last_n: int):
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    path = ckpt_dir / f"ckpt_epoch_{epoch:04d}.pth"
    torch.save(state, path)
    ckpts = sorted(ckpt_dir.glob("ckpt_epoch_*.pth"))
    for old in ckpts[:-keep_last_n]:
        old.unlink()
    latest = ckpt_dir / "latest.pth"
    if latest.exists() or latest.is_symlink():
        latest.unlink()
    shutil.copy(path, latest)
    return path


def load_checkpoint(path, G, D, opt_G, opt_D, scaler_G, scaler_D, sched_G, sched_D, device):
    ckpt = torch.load(path, map_location=device, weights_only=False)
    G.load_state_dict(ckpt["G"])
    D.load_state_dict(ckpt["D"])
    opt_G.load_state_dict(ckpt["opt_G"])
    opt_D.load_state_dict(ckpt["opt_D"])
    scaler_G.load_state_dict(ckpt.get("scaler_G", scaler_G.state_dict()))
    scaler_D.load_state_dict(ckpt.get("scaler_D", scaler_D.state_dict()))
    if "sched_G" in ckpt:
        sched_G.load_state_dict(ckpt["sched_G"])
        sched_D.load_state_dict(ckpt["sched_D"])
    else:
        # Older checkpoint without scheduler state — fast-forward to correct LR
        for _ in range(ckpt["epoch"]):
            sched_G.step()
            sched_D.step()
    return ckpt["epoch"]


# ── Fixed validation batch for visual monitoring ──────────────────────────────

def make_fixed_batch(noise_dim, device):
    presets = [
        {"bedrooms": 2, "bathrooms": 1, "totalArea": 800,  "floors": 1, "style": "Modern",       "specialRooms": [],                     "location": "Lahore"},
        {"bedrooms": 3, "bathrooms": 2, "totalArea": 1500, "floors": 1, "style": "Contemporary",  "specialRooms": ["balcony"],             "location": "Karachi"},
        {"bedrooms": 4, "bathrooms": 3, "totalArea": 2500, "floors": 2, "style": "Traditional",   "specialRooms": ["garage","prayer"],     "location": "Islamabad"},
        {"bedrooms": 5, "bathrooms": 4, "totalArea": 4000, "floors": 2, "style": "Modern",        "specialRooms": ["garage","study"],      "location": "Lahore"},
        {"bedrooms": 3, "bathrooms": 2, "totalArea": 1200, "floors": 1, "style": "Minimalist",    "specialRooms": ["study"],               "location": "Rawalpindi"},
        {"bedrooms": 6, "bathrooms": 5, "totalArea": 6000, "floors": 3, "style": "Colonial",      "specialRooms": ["garage","gym"],        "location": "Karachi"},
        {"bedrooms": 2, "bathrooms": 1, "totalArea": 950,  "floors": 1, "style": "Modern",        "specialRooms": ["balcony"],             "location": "Faisalabad"},
        {"bedrooms": 4, "bathrooms": 3, "totalArea": 3200, "floors": 2, "style": "Contemporary",  "specialRooms": ["servant","prayer"],    "location": "Islamabad"},
    ]
    conds = torch.stack([encode_condition(p) for p in presets]).to(device)
    torch.manual_seed(42)
    z = torch.randn(len(presets), noise_dim, device=device)
    return z, conds


# ── Live status bar ───────────────────────────────────────────────────────────

def print_status(epoch, total_epochs, step, total_steps,
                 loss_g, loss_d, lr_g, elapsed, vram_mb,
                 g_avg, d_avg):
    bar_w = 30
    filled = int(bar_w * step / total_steps)
    bar = "#" * filled + "-" * (bar_w - filled)
    eta_step = (elapsed / max(step, 1)) * (total_steps - step)
    pct = 100 * step / total_steps

    line = (
        f"\r  Epoch {epoch:3d}/{total_epochs}"
        f"  [{bar}] {pct:5.1f}%"
        f"  G={loss_g:.3f}(avg:{g_avg:.3f})"
        f"  D={loss_d:.3f}(avg:{d_avg:.3f})"
        f"  lr={lr_g:.1e}"
        f"  VRAM={vram_mb:.0f}MB"
        f"  ETA={eta_step:.0f}s"
    )
    sys.stdout.write(line)
    sys.stdout.flush()


# ── Training loop ─────────────────────────────────────────────────────────────

def train():
    cfg       = TrainingConfig()
    model_cfg = ModelConfig()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print("=" * 70)
    print("  ArchitectXpert — CGAN Training on Real RPLAN Dataset")
    print("=" * 70)
    print(f"  Device  : {device}")
    if device.type == "cuda":
        props = torch.cuda.get_device_properties(0)
        print(f"  GPU     : {props.name}")
        print(f"  VRAM    : {props.total_memory / 1e9:.1f} GB")
    print(f"  Batch   : {cfg.batch_size}  |  AMP: {cfg.use_amp}  |  Workers: {cfg.num_workers}")
    print("=" * 70)

    # ── Data ──────────────────────────────────────────────────────────────────
    train_loader, val_loader = make_dataloaders(cfg)

    # ── Models ────────────────────────────────────────────────────────────────
    G = Generator(model_cfg).to(device)
    D = Discriminator(model_cfg).to(device)
    n_g = sum(p.numel() for p in G.parameters()) / 1e6
    n_d = sum(p.numel() for p in D.parameters()) / 1e6
    print(f"  Generator   : {n_g:.2f}M params")
    print(f"  Discriminator: {n_d:.2f}M params")
    print("=" * 70)

    # ── Optimizers ────────────────────────────────────────────────────────────
    opt_G = torch.optim.Adam(G.parameters(), lr=cfg.lr_g, betas=(cfg.beta1, cfg.beta2))
    opt_D = torch.optim.Adam(D.parameters(), lr=cfg.lr_d, betas=(cfg.beta1, cfg.beta2))
    sched_G = torch.optim.lr_scheduler.CosineAnnealingLR(opt_G, T_max=cfg.num_epochs, eta_min=1e-6)
    sched_D = torch.optim.lr_scheduler.CosineAnnealingLR(opt_D, T_max=cfg.num_epochs, eta_min=1e-6)
    scaler_G = GradScaler("cuda", enabled=cfg.use_amp)
    scaler_D = GradScaler("cuda", enabled=cfg.use_amp)

    # ── Resume from checkpoint ────────────────────────────────────────────────
    ckpt_dir   = Path(cfg.checkpoint_dir)
    sample_dir = Path(cfg.sample_dir)
    sample_dir.mkdir(parents=True, exist_ok=True)

    start_epoch = 0
    resume = cfg.resume_checkpoint or (
        str(ckpt_dir / "latest.pth") if (ckpt_dir / "latest.pth").exists() else ""
    )
    if resume and Path(resume).exists():
        start_epoch = load_checkpoint(resume, G, D, opt_G, opt_D, scaler_G, scaler_D, sched_G, sched_D, device)
        print(f"  Resumed from checkpoint: epoch {start_epoch}")
        print("=" * 70)

    fix_z, fix_cond = make_fixed_batch(model_cfg.noise_dim, device)

    # ── Epoch loop ────────────────────────────────────────────────────────────
    for epoch in range(start_epoch, cfg.num_epochs):
        G.train(); D.train()
        t0 = time.time()
        g_sum = d_sum = 0.0
        steps = len(train_loader)

        for step, (real_imgs, cond_raw) in enumerate(train_loader):
            real_imgs = real_imgs.to(device, non_blocking=True)
            cond_raw  = cond_raw.to(device, non_blocking=True)
            bsz = real_imgs.size(0)
            z   = torch.randn(bsz, model_cfg.noise_dim, device=device)

            # ── Discriminator ─────────────────────────────────────────────────
            opt_D.zero_grad(set_to_none=True)
            with autocast("cuda", enabled=cfg.use_amp):
                fake     = G(z, cond_raw).detach()
                loss_D   = real_loss(D(real_imgs, cond_raw)) + fake_loss(D(fake, cond_raw))
            scaler_D.scale(loss_D).backward()
            if cfg.grad_clip > 0:
                scaler_D.unscale_(opt_D)
                nn.utils.clip_grad_norm_(D.parameters(), cfg.grad_clip)
            scaler_D.step(opt_D); scaler_D.update()

            # ── Generator ─────────────────────────────────────────────────────
            if step % cfg.n_critic == 0:
                opt_G.zero_grad(set_to_none=True)
                with autocast("cuda", enabled=cfg.use_amp):
                    fake    = G(z, cond_raw)
                    loss_G  = real_loss(D(fake, cond_raw)) + F.l1_loss(fake, real_imgs) * cfg.lambda_l1
                scaler_G.scale(loss_G).backward()
                if cfg.grad_clip > 0:
                    scaler_G.unscale_(opt_G)
                    nn.utils.clip_grad_norm_(G.parameters(), cfg.grad_clip)
                scaler_G.step(opt_G); scaler_G.update()
                g_sum += loss_G.item()

            d_sum += loss_D.item()
            vram = torch.cuda.memory_allocated() / 1e6

            # Live status line (updates in place)
            print_status(
                epoch + 1, cfg.num_epochs,
                step + 1, steps,
                loss_G.item(), loss_D.item(),
                sched_G.get_last_lr()[0],
                time.time() - t0, vram,
                g_sum / max(step + 1, 1),
                d_sum / max(step + 1, 1),
            )

        sched_G.step(); sched_D.step()
        elapsed = time.time() - t0

        # End of epoch summary (new line)
        print(f"\n  [Epoch {epoch+1:4d}/{cfg.num_epochs}]"
              f"  G={g_sum/steps:.4f}  D={d_sum/steps:.4f}"
              f"  time={elapsed:.0f}s"
              f"  lr_G={sched_G.get_last_lr()[0]:.2e}"
              f"  VRAM_peak={torch.cuda.max_memory_allocated()/1e6:.0f}MB")
        torch.cuda.reset_peak_memory_stats()

        # ── Sample images ─────────────────────────────────────────────────────
        if (epoch + 1) % cfg.sample_every == 0:
            G.eval()
            with torch.no_grad():
                samples = G(fix_z, fix_cond)
            samples = (samples + 1) / 2  # normalize to [0,1]
            save_image(samples, sample_dir / f"sample_epoch_{epoch+1:04d}.png", nrow=4)
            print(f"  Samples saved -> samples/sample_epoch_{epoch+1:04d}.png")
            G.train()

        # ── Save checkpoint ───────────────────────────────────────────────────
        if (epoch + 1) % cfg.save_every == 0:
            path = save_checkpoint(
                {
                    "epoch":   epoch + 1,
                    "G":       G.state_dict(),
                    "D":       D.state_dict(),
                    "opt_G":   opt_G.state_dict(),
                    "opt_D":   opt_D.state_dict(),
                    "scaler_G": scaler_G.state_dict(),
                    "scaler_D": scaler_D.state_dict(),
                    "sched_G": sched_G.state_dict(),
                    "sched_D": sched_D.state_dict(),
                },
                epoch + 1, ckpt_dir, cfg.keep_last_n,
            )
            print(f"  Checkpoint saved -> {path}")

    print("\n" + "=" * 70)
    print("  Training complete.")
    print("=" * 70)


if __name__ == "__main__":
    train()
