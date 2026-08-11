"""Derive zone thumbnail artwork from the stitched world screenshot."""

import json
import math
import sqlite3
from pathlib import Path

from PIL import Image
from rich.console import Console

from compendium.commands.tiles import blank_excluded_zones, load_excluded_zones
from compendium.denormalizers.exclusions import EXCLUDED_ZONE_IDS
from compendium.visual_assets import Encoding, insert_asset, publish_image

console = Console()

ZONE_THUMBNAIL_KIND = "thumbnail"
ZONE_THUMBNAIL_MAX_EDGE = 512
ZONE_THUMBNAIL_SOURCE_TYPE = "DerivedZoneMapCrop"
ZONE_THUMBNAIL_SOURCE_FIELD = "screenshots.metadata.world_bounds"
ZONE_THUMBNAIL_EXPORT_PATH = "screenshots/stitched/world.png"


def _load_world_bounds(metadata_path: Path) -> dict[str, float]:
    try:
        with metadata_path.open(encoding="utf-8") as metadata_file:
            metadata = json.load(metadata_file)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"Invalid screenshot metadata JSON: {metadata_path}"
        ) from error

    if not isinstance(metadata, dict):
        raise TypeError(f"Screenshot metadata must be an object: {metadata_path}")

    world_bounds = metadata.get("world_bounds")
    if not isinstance(world_bounds, dict):
        raise TypeError(f"Screenshot metadata has no world_bounds: {metadata_path}")

    required = ("min_x", "max_x", "min_z", "max_z")
    missing = [key for key in required if key not in world_bounds]
    if missing:
        raise ValueError(
            f"Screenshot world_bounds is missing {', '.join(missing)}: {metadata_path}"
        )

    try:
        bounds = {key: float(world_bounds[key]) for key in required}
    except (TypeError, ValueError) as error:
        raise ValueError(
            f"Screenshot world_bounds must be numeric: {metadata_path}"
        ) from error

    if not all(math.isfinite(value) for value in bounds.values()):
        raise ValueError(f"Screenshot world_bounds must be finite: {metadata_path}")
    if bounds["min_x"] >= bounds["max_x"] or bounds["min_z"] >= bounds["max_z"]:
        raise ValueError(
            f"Screenshot world_bounds must have positive dimensions: {metadata_path}"
        )
    return bounds


def _zone_crop_box(
    zone_id: str,
    bounds: tuple[float, float, float, float],
    world_bounds: dict[str, float],
    image_size: tuple[int, int],
) -> tuple[int, int, int, int]:
    """Convert one game's X/Z bounds to a clamped north-up source crop."""
    min_x, min_z, max_x, max_z = bounds
    if not all(math.isfinite(value) for value in bounds):
        raise ValueError(f"Zone '{zone_id}' has non-finite thumbnail bounds")
    if min_x >= max_x or min_z >= max_z:
        raise ValueError(f"Zone '{zone_id}' has invalid thumbnail bounds: {bounds}")

    world_min_x = world_bounds["min_x"]
    world_max_x = world_bounds["max_x"]
    world_min_z = world_bounds["min_z"]
    world_max_z = world_bounds["max_z"]
    if max_x <= world_min_x or min_x >= world_max_x:
        raise ValueError(
            f"Zone '{zone_id}' thumbnail bounds are outside world X bounds"
        )
    if max_z <= world_min_z or min_z >= world_max_z:
        raise ValueError(
            f"Zone '{zone_id}' thumbnail bounds are outside world Z bounds"
        )

    image_width, image_height = image_size
    world_width = world_max_x - world_min_x
    world_depth = world_max_z - world_min_z
    if world_width <= 0 or world_depth <= 0:
        raise ValueError("Screenshot world bounds must have positive dimensions")
    if image_width <= 0 or image_height <= 0:
        raise ValueError("Stitched world image must have positive dimensions")
    left = math.floor((min_x - world_min_x) / world_width * image_width)
    right = math.ceil((max_x - world_min_x) / world_width * image_width)
    # The stitched source is north-up: high game Z is at the smallest pixel row.
    top = math.floor((world_max_z - max_z) / world_depth * image_height)
    bottom = math.ceil((world_max_z - min_z) / world_depth * image_height)

    left = max(0, min(image_width, left))
    right = max(0, min(image_width, right))
    top = max(0, min(image_height, top))
    bottom = max(0, min(image_height, bottom))
    if left >= right or top >= bottom:
        raise ValueError(f"Zone '{zone_id}' thumbnail bounds have no image overlap")
    return left, top, right, bottom


def _thumbnail(crop: Image.Image) -> Image.Image:
    """Downscale a crop proportionally, without enlarging small zones."""
    width, height = crop.size
    largest_edge = max(width, height)
    if largest_edge <= ZONE_THUMBNAIL_MAX_EDGE:
        return crop

    scale = ZONE_THUMBNAIL_MAX_EDGE / largest_edge
    resized_size = (
        max(1, min(ZONE_THUMBNAIL_MAX_EDGE, round(width * scale))),
        max(1, min(ZONE_THUMBNAIL_MAX_EDGE, round(height * scale))),
    )
    return crop.resize(resized_size, Image.Resampling.LANCZOS)


def publish_zone_thumbnails(
    conn: sqlite3.Connection, export_dir: Path, static_dir: Path
) -> int:
    """Publish one north-up thumbnail for each visible, bounded zone."""
    screenshots_dir = export_dir / "screenshots"
    metadata_path = screenshots_dir / "metadata.json"
    world_path = screenshots_dir / "stitched" / "world.png"
    if not metadata_path.is_file():
        raise FileNotFoundError(
            f"Required screenshot metadata is unavailable: {metadata_path}"
        )
    if not world_path.is_file():
        raise FileNotFoundError(
            f"Required stitched world image is unavailable: {world_path}"
        )

    world_bounds = _load_world_bounds(metadata_path)
    with Image.open(world_path) as source_file:
        source = source_file.convert("RGB")

    excluded = load_excluded_zones(export_dir)
    blank_excluded_zones(source, excluded, world_bounds, (0, 0, 0))

    cursor = conn.cursor()
    rows = cursor.execute(
        """
        SELECT id, bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y
        FROM zones
        ORDER BY id
        """
    ).fetchall()
    published_count = 0
    for zone_id, min_x, min_z, max_x, max_z in rows:
        if zone_id in EXCLUDED_ZONE_IDS:
            continue
        if None in (min_x, min_z, max_x, max_z):
            continue

        crop_box = _zone_crop_box(
            zone_id,
            (float(min_x), float(min_z), float(max_x), float(max_z)),
            world_bounds,
            source.size,
        )
        thumbnail = _thumbnail(source.crop(crop_box))
        published = publish_image(
            thumbnail,
            static_dir,
            domain="zone",
            entity_id=zone_id,
            kind=ZONE_THUMBNAIL_KIND,
            encoding=Encoding.PHOTO,
        )
        insert_asset(
            cursor,
            domain="zone",
            entity_id=zone_id,
            kind=ZONE_THUMBNAIL_KIND,
            export_path=ZONE_THUMBNAIL_EXPORT_PATH,
            asset=published,
            source_field=ZONE_THUMBNAIL_SOURCE_FIELD,
            source_type=ZONE_THUMBNAIL_SOURCE_TYPE,
            source_name=zone_id,
        )
        published_count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Published {published_count} zone thumbnails")
    return published_count
