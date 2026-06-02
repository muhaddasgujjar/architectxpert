"""
Conditional GAN for floorplan generation.

Generator:  noise (B,128) + condition (B,cond_dim) → image (B,3,256,256)
            U-Net-style decoder with FiLM conditioning at every upsampling block.
            Spectral norm + GroupNorm for stable training.

Discriminator: PatchGAN 70×70 receptive field with spectral normalization.
               Receives image + condition projection (projection discriminator).
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.nn.utils import spectral_norm

from .config import ModelConfig, ConditionConfig


# ─── Shared Primitives ─────────────────────────────────────────────────────────

class FiLM(nn.Module):
    """Feature-wise Linear Modulation: scale + shift per-channel from condition."""

    def __init__(self, cond_dim: int, num_features: int):
        super().__init__()
        self.gamma = nn.Linear(cond_dim, num_features, bias=True)
        self.beta = nn.Linear(cond_dim, num_features, bias=True)
        nn.init.ones_(self.gamma.weight)
        nn.init.zeros_(self.gamma.bias)
        nn.init.zeros_(self.beta.weight)
        nn.init.zeros_(self.beta.bias)

    def forward(self, x: torch.Tensor, cond: torch.Tensor) -> torch.Tensor:
        g = self.gamma(cond)[:, :, None, None]
        b = self.beta(cond)[:, :, None, None]
        return g * x + b


def sn_conv(in_ch, out_ch, **kwargs) -> nn.Conv2d:
    return spectral_norm(nn.Conv2d(in_ch, out_ch, **kwargs))


def sn_linear(in_f, out_f) -> nn.Linear:
    return spectral_norm(nn.Linear(in_f, out_f))


# ─── Condition Encoder ─────────────────────────────────────────────────────────

class ConditionEncoder(nn.Module):
    """
    Maps raw condition vector (27-dim) → dense embedding (cond_dim).
    Used by both G and D.
    """

    def __init__(self, input_dim: int, cond_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.SiLU(),
            nn.Linear(128, cond_dim),
            nn.SiLU(),
        )

    def forward(self, cond_raw: torch.Tensor) -> torch.Tensor:
        return self.net(cond_raw)


# ─── Generator Blocks ─────────────────────────────────────────────────────────

class ResBlock(nn.Module):
    def __init__(self, ch: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.GroupNorm(min(8, ch), ch),
            nn.SiLU(),
            nn.Conv2d(ch, ch, 3, padding=1),
            nn.GroupNorm(min(8, ch), ch),
            nn.SiLU(),
            nn.Conv2d(ch, ch, 3, padding=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.net(x)


class UpBlock(nn.Module):
    """Upsample × 2, then two conv layers with FiLM conditioning."""

    def __init__(self, in_ch: int, out_ch: int, cond_dim: int):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_ch, out_ch, kernel_size=4, stride=2, padding=1)
        self.norm1 = nn.GroupNorm(min(8, out_ch), out_ch)
        self.conv1 = nn.Conv2d(out_ch, out_ch, 3, padding=1)
        self.norm2 = nn.GroupNorm(min(8, out_ch), out_ch)
        self.res = ResBlock(out_ch)
        self.film = FiLM(cond_dim, out_ch)

    def forward(self, x: torch.Tensor, cond: torch.Tensor) -> torch.Tensor:
        x = F.silu(self.norm1(self.up(x)))
        x = F.silu(self.norm2(self.conv1(x)))
        x = self.res(x)
        x = self.film(x, cond)
        return x


# ─── Generator ────────────────────────────────────────────────────────────────

class Generator(nn.Module):
    """
    Noise + condition → 256×256 RGB floorplan image.

    Spatial progression: 8 → 16 → 32 → 64 → 128 → 256
    Channel progression: 512 → 256 → 128 → 64 → 32 → 16
    """

    def __init__(self, cfg: ModelConfig = None):
        super().__init__()
        if cfg is None:
            cfg = ModelConfig()

        noise_dim = cfg.noise_dim
        cond_dim = cfg.cond_dim
        base = cfg.base_channels  # 64

        # Condition encoder
        cond_cfg = ConditionConfig()
        self.cond_enc = ConditionEncoder(cond_cfg.input_dim, cond_dim)

        # Project noise + cond → initial 8×8 feature map
        self.fc = nn.Linear(noise_dim + cond_dim, base * 8 * 8 * 8)

        # Upsampling: 8→16→32→64→128→256
        ch = [base * 8, base * 4, base * 2, base, base // 2, base // 4]
        self.up_blocks = nn.ModuleList([
            UpBlock(ch[0], ch[1], cond_dim),  # 8→16,   512→256
            UpBlock(ch[1], ch[2], cond_dim),  # 16→32,  256→128
            UpBlock(ch[2], ch[3], cond_dim),  # 32→64,  128→64
            UpBlock(ch[3], ch[4], cond_dim),  # 64→128,  64→32
            UpBlock(ch[4], ch[5], cond_dim),  # 128→256, 32→16
        ])

        # Final conv to RGB
        self.out = nn.Sequential(
            nn.GroupNorm(min(8, ch[5]), ch[5]),
            nn.SiLU(),
            nn.Conv2d(ch[5], 3, 3, padding=1),
            nn.Tanh(),
        )

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, (nn.Conv2d, nn.ConvTranspose2d, nn.Linear)):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, z: torch.Tensor, cond_raw: torch.Tensor) -> torch.Tensor:
        cond = self.cond_enc(cond_raw)                    # (B, cond_dim)
        x = self.fc(torch.cat([z, cond], dim=1))          # (B, 512*8*8)
        x = x.view(z.size(0), -1, 8, 8)                   # (B, 512, 8, 8)
        for block in self.up_blocks:
            x = block(x, cond)
        return self.out(x)                                 # (B, 3, 256, 256)


# ─── Discriminator Blocks ─────────────────────────────────────────────────────

class DownBlock(nn.Module):
    """Stride-2 conv block for PatchGAN."""

    def __init__(self, in_ch: int, out_ch: int, first: bool = False):
        super().__init__()
        self.conv = sn_conv(in_ch, out_ch, kernel_size=4, stride=2, padding=1, bias=False)
        self.norm = nn.InstanceNorm2d(out_ch, affine=True) if not first else nn.Identity()
        self.act = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.act(self.norm(self.conv(x)))


# ─── Discriminator ────────────────────────────────────────────────────────────

class Discriminator(nn.Module):
    """
    PatchGAN discriminator with spectral normalization.
    Projection discriminator: condition is projected and dot-producted with
    penultimate features to produce the conditional score.

    Receptive field: 70×70 (standard PatchGAN)
    """

    def __init__(self, cfg: ModelConfig = None):
        super().__init__()
        if cfg is None:
            cfg = ModelConfig()

        cond_cfg = ConditionConfig()
        cond_dim = cfg.cond_dim
        base = cfg.base_channels  # 64

        self.cond_enc = ConditionEncoder(cond_cfg.input_dim, cond_dim)

        # 256 → 128 → 64 → 32 → 16 → patch output
        self.down = nn.Sequential(
            DownBlock(3, base, first=True),          # 256→128
            DownBlock(base, base * 2),               # 128→64
            DownBlock(base * 2, base * 4),           # 64→32
            DownBlock(base * 4, base * 8),           # 32→16
        )

        # Patch prediction head (unconditional)
        self.patch_head = sn_conv(base * 8, 1, kernel_size=4, stride=1, padding=1)

        # Projection for conditional signal: cond → (base*8,)
        self.proj = sn_linear(cond_dim, base * 8)

    def forward(self, x: torch.Tensor, cond_raw: torch.Tensor) -> torch.Tensor:
        cond = self.cond_enc(cond_raw)            # (B, cond_dim)
        feats = self.down(x)                      # (B, base*8, 16, 16)

        # Unconditional patch score
        out = self.patch_head(feats)              # (B, 1, 15, 15)

        # Projection discriminator: global condition signal (scalar per image)
        # Avoids spatial size mismatch between patch_head output and feature map
        feats_pooled = feats.mean(dim=[2, 3])     # (B, base*8)
        v = self.proj(cond)                       # (B, base*8)
        cond_score = (feats_pooled * v).sum(dim=1, keepdim=True)  # (B, 1)

        return out + cond_score[:, :, None, None]  # (B,1,1,1) → broadcast to (B,1,15,15)
