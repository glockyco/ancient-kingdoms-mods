"""Static Unity asset indexing and image extraction."""

from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import UnityPy
from PIL import Image
from rich.console import Console

from compendium.visual_audit.models import StaticAsset

console = Console()

ASSET_TYPES = {"Sprite", "Texture2D"}


def asset_key(container_path: str, path_id: int) -> str:
    """Return the stable static-asset key used in audit manifests."""

    return f"{container_path}:{path_id}"


def iter_asset_files(game_data_dir: Path) -> list[Path]:
    """Return Unity asset files that UnityPy should attempt to load."""

    candidates: list[Path] = []
    names = {"globalgamemanagers", "globalgamemanagers.assets", "resources.assets"}
    for path in game_data_dir.rglob("*"):
        if not path.is_file():
            continue
        if (
            path.name in names
            or path.suffix in {".assets", ".bundle"}
            or path.name.startswith("level")
        ):
            candidates.append(path)
    return sorted(candidates)


def build_static_index(
    game_data_dir: Path,
    output_dir: Path,
    *,
    extract_images: bool,
    limit_files: int | None = None,
) -> tuple[list[StaticAsset], list[dict[str, Any]]]:
    """Scan Unity assets and optionally extract Sprite/Texture2D images.

    UnityPy cannot decode every object in this game corpus. Decode failures are
    returned as explicit read-error records so the audit can distinguish parser
    gaps from absent assets.
    """

    image_dir = output_dir / "images"
    if extract_images:
        image_dir.mkdir(parents=True, exist_ok=True)

    files = iter_asset_files(game_data_dir)
    if limit_files is not None:
        files = files[:limit_files]

    assets: list[StaticAsset] = []
    read_errors: list[dict[str, Any]] = []
    for file_path in files:
        rel_container = file_path.relative_to(game_data_dir).as_posix()
        try:
            env = UnityPy.load(str(file_path))
        except Exception as exc:
            read_errors.append({"container_path": rel_container, "error": repr(exc)})
            continue

        for obj in env.objects:
            type_name = obj.type.name
            if type_name not in ASSET_TYPES:
                continue
            try:
                data = obj.read()
            except Exception as exc:
                read_errors.append(
                    {
                        "container_path": rel_container,
                        "path_id": obj.path_id,
                        "asset_type": type_name,
                        "error": repr(exc),
                    }
                )
                continue

            name = getattr(data, "name", "") or ""
            width = getattr(data, "width", None)
            height = getattr(data, "height", None)
            texture_name = None
            if type_name == "Sprite":
                texture = getattr(data, "texture", None)
                if texture is not None:
                    texture_name = getattr(texture, "name", None)

            extracted_path = None
            if extract_images:
                extracted_path = _extract_image(
                    data, image_dir, rel_container, obj.path_id
                )

            assets.append(
                StaticAsset(
                    asset_key=asset_key(rel_container, obj.path_id),
                    asset_type=type_name,
                    name=name,
                    container_path=rel_container,
                    path_id=obj.path_id,
                    texture_name=texture_name,
                    width=width,
                    height=height,
                    extracted_path=extracted_path,
                )
            )

    return assets, read_errors


def write_static_index(assets: Iterable[StaticAsset], output_path: Path) -> None:
    """Write a deterministic static asset index."""

    sorted_assets = sorted(assets, key=lambda asset: asset.asset_key)
    payload = {
        "asset_count": len(sorted_assets),
        "assets": [asset.model_dump(mode="json") for asset in sorted_assets],
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n")


def write_read_errors(errors: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps({"error_count": len(errors), "errors": errors}, indent=2) + "\n"
    )


def _extract_image(
    data: Any, image_dir: Path, container_path: str, path_id: int
) -> str | None:
    image = getattr(data, "image", None)
    if image is None or not isinstance(image, Image.Image):
        return None

    safe_container = (
        container_path.replace("/", "__").replace("\\", "__").replace(":", "_")
    )
    output_path = image_dir / f"{safe_container}__{path_id}.png"
    image.save(output_path)
    return output_path.as_posix()
