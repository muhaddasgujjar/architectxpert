from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Tuple


@dataclass
class ModelConfig:
    noise_dim: int = 128
    cond_dim: int = 64
    base_channels: int = 64
    image_size: int = 256
    output_channels: int = 3


@dataclass
class TrainingConfig:
    # Paths
    data_root: str = "data/rplan"
    checkpoint_dir: str = "checkpoints"
    sample_dir: str = "samples"

    # Data
    image_size: int = 256
    num_workers: int = 0   # 0 = main process only (required on Windows for shared memory)
    pin_memory: bool = False  # pin_memory only helps with num_workers > 0

    # Training
    batch_size: int = 32
    num_epochs: int = 150
    lr_g: float = 2e-4
    lr_d: float = 1e-4
    beta1: float = 0.5
    beta2: float = 0.999
    lambda_l1: float = 10.0
    n_critic: int = 1          # Train D every n_critic G steps
    grad_clip: float = 1.0

    # Mixed precision — mandatory on RTX 3060 to fit batch 16
    use_amp: bool = True

    # Checkpointing
    save_every: int = 5        # epochs  (keeps last 3 → max 4 epochs lost on restart)
    sample_every: int = 5
    keep_last_n: int = 3

    # Resume
    resume_checkpoint: str = ""


@dataclass
class ConditionConfig:
    """All discrete categories for one-hot / multi-hot encoding."""
    styles: List[str] = field(default_factory=lambda: [
        "Modern", "Contemporary", "Traditional", "Minimalist", "Colonial"
    ])
    special_rooms: List[str] = field(default_factory=lambda: [
        "garage", "study", "prayer", "servant", "balcony", "basement", "gym", "library"
    ])
    locations: List[str] = field(default_factory=lambda: [
        "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
        "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala"
    ])

    # Scalar ranges
    bedroom_min: int = 1
    bedroom_max: int = 8
    bathroom_min: int = 1
    bathroom_max: int = 6
    floor_min: int = 1
    floor_max: int = 4
    area_min_sqft: float = 400.0
    area_max_sqft: float = 20000.0

    @property
    def input_dim(self) -> int:
        # bedrooms(1) + bathrooms(1) + area(1) + floors(1) + style(5) + special(8) + location(10)
        return 4 + len(self.styles) + len(self.special_rooms) + len(self.locations)
