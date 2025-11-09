"""Configuration management for the build pipeline."""

import tomllib
from pathlib import Path
from typing import Any

from compendium.utils import get_repo_root


def load_config(config_path: Path | None = None) -> dict[str, Any]:
    """Load configuration from TOML file.

    Args:
        config_path: Path to config file. If None, loads from repository root.

    Returns:
        Configuration dictionary.

    Raises:
        FileNotFoundError: If config file doesn't exist.
        tomllib.TOMLDecodeError: If config file is invalid TOML.
    """
    if config_path is None:
        config_path = get_repo_root() / "config.toml"

    if not config_path.exists():
        raise FileNotFoundError(
            f"Config file not found: {config_path}\n"
            f"Run: cp config.toml.example config.toml"
        )

    with open(config_path, "rb") as f:
        return tomllib.load(f)


def resolve_path(config: dict[str, Any], path_str: str) -> Path:
    """Resolve a path from config, making it absolute relative to repo root.

    Args:
        config: Configuration dictionary
        path_str: Path string (may be relative)

    Returns:
        Absolute path
    """
    path = Path(path_str)

    if path.is_absolute():
        return path

    # Resolve relative to repository root
    return (get_repo_root() / path).resolve()
