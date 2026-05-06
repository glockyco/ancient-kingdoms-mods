"""Map tile pyramid generation command.

Coordinate System
-----------------
- Game coordinates: X (horizontal), Z (forward/north), Y (height - ignored)
- deck.gl coordinates: X (same), Y = -game_Z (negated for correct north-up display)

The stitched source image has north (high game Z) at the top. When generating tiles:
1. Tile indices are calculated in deck.gl coordinates (Y = -Z)
2. Each tile's content is extracted from the source using game Z coordinates
3. Extracted content is flipped vertically because:
   - Source has high Z at top (row 0)
   - BitmapLayer maps image top to bounds maxY (which is low game Z after negation)

World bounds: Game X [-880, 920], Z [-740, 1460]
"""

import json
import math
import shutil
import typer
from pathlib import Path

from PIL import Image, ImageDraw
from rich.console import Console
from rich.progress import Progress

from compendium.denormalizers.exclusions import (
    EXCLUDED_ZONE_IDS,
    EXCLUDED_ZONE_TRIGGER_IDS,
)

console = Console()


def load_excluded_zones(export_dir: Path) -> list[dict]:
    """Load bounds for all excluded zones and sub-zones.

    Handles two exclusion levels:
    - EXCLUDED_ZONE_IDS: entire zones — finds all triggers for those zone_ids
      and combines their bounds into one rectangle per zone.
    - EXCLUDED_ZONE_TRIGGER_IDS: individual sub-zone triggers — each trigger
      produces its own rectangle using its own bounds directly.
    """
    zone_info_path = export_dir / "zone_info.json"
    zone_triggers_path = export_dir / "zone_triggers.json"

    if not zone_info_path.exists() or not zone_triggers_path.exists():
        console.print("  [yellow]Warning:[/yellow] zone data not found")
        return []

    with open(zone_info_path) as f:
        zone_info = json.load(f)
    with open(zone_triggers_path) as f:
        zone_triggers = json.load(f)

    results: list[dict] = []

    # Zone-level exclusions: map string IDs → numeric zone_ids, combine all trigger bounds
    if EXCLUDED_ZONE_IDS:
        excluded_numeric_ids: set[int] = set()
        for zone in zone_info:
            if zone.get("id") in EXCLUDED_ZONE_IDS:
                excluded_numeric_ids.add(zone["zone_id"])

        if excluded_numeric_ids:
            min_x = float("inf")
            min_y = float("inf")
            max_x = float("-inf")
            max_y = float("-inf")
            names = []

            for trigger in zone_triggers:
                if trigger.get("zone_id") in excluded_numeric_ids:
                    if trigger.get("bounds_min_x") is not None:
                        min_x = min(min_x, trigger["bounds_min_x"])
                        min_y = min(min_y, trigger["bounds_min_y"])
                        max_x = max(max_x, trigger["bounds_max_x"])
                        max_y = max(max_y, trigger["bounds_max_y"])
                        names.append(trigger.get("name", "unknown"))

            if names:
                results.append(
                    {
                        "name": " + ".join(names),
                        "bounds_min_x": min_x,
                        "bounds_min_y": min_y,
                        "bounds_max_x": max_x,
                        "bounds_max_y": max_y,
                    }
                )

    # Sub-zone trigger exclusions: each excluded trigger ID gets its own rectangle
    if EXCLUDED_ZONE_TRIGGER_IDS:
        for trigger in zone_triggers:
            if trigger.get("id") in EXCLUDED_ZONE_TRIGGER_IDS:
                if trigger.get("bounds_min_x") is not None:
                    results.append(
                        {
                            "name": trigger.get("name", trigger["id"]),
                            "bounds_min_x": trigger["bounds_min_x"],
                            "bounds_min_y": trigger["bounds_min_y"],
                            "bounds_max_x": trigger["bounds_max_x"],
                            "bounds_max_y": trigger["bounds_max_y"],
                        }
                    )

    return results


def blank_excluded_zones(
    image: Image.Image,
    zones: list[dict],
    world_bounds: dict,
    background_color: tuple[int, int, int],
) -> int:
    """Draw rectangles over excluded zones. Returns count of zones blanked."""
    if not zones:
        return 0

    draw = ImageDraw.Draw(image)
    img_width, img_height = image.size

    world_min_x = world_bounds["min_x"]
    world_max_x = world_bounds["max_x"]
    world_min_z = world_bounds["min_z"]
    world_max_z = world_bounds["max_z"]
    world_width = world_max_x - world_min_x
    world_depth = world_max_z - world_min_z

    px_per_unit_x = img_width / world_width
    px_per_unit_y = img_height / world_depth

    count = 0
    for zone in zones:
        # Zone bounds are in game coordinates (X, Z)
        # Note: bounds_min_y/max_y in DB are actually game Z coordinates
        zone_min_x = zone["bounds_min_x"]
        zone_max_x = zone["bounds_max_x"]
        zone_min_z = zone["bounds_min_y"]  # DB uses Y for game Z
        zone_max_z = zone["bounds_max_y"]

        # Convert to pixel coordinates (source has north/high Z at top)
        px_left = (zone_min_x - world_min_x) * px_per_unit_x
        px_right = (zone_max_x - world_min_x) * px_per_unit_x
        px_top = (world_max_z - zone_max_z) * px_per_unit_y
        px_bottom = (world_max_z - zone_min_z) * px_per_unit_y

        # Draw filled rectangle
        draw.rectangle(
            [int(px_left), int(px_top), int(px_right), int(px_bottom)],
            fill=background_color,
        )
        count += 1

    return count


def load_boss_spawn_validation_points(export_dir: Path) -> list[dict]:
    """Load boss/world-boss spawn points that should have visible terrain coverage."""
    monsters_path = export_dir / "monsters.json"
    spawns_path = export_dir / "monster_spawns.json"

    if not monsters_path.exists():
        raise FileNotFoundError(f"Boss-position validation requires {monsters_path}")
    if not spawns_path.exists():
        raise FileNotFoundError(f"Boss-position validation requires {spawns_path}")

    with open(monsters_path) as f:
        monsters = {monster["id"]: monster for monster in json.load(f)}
    with open(spawns_path) as f:
        spawns = json.load(f)

    points: list[dict] = []
    for spawn in spawns:
        monster = monsters.get(spawn.get("monster_id"))
        if not monster:
            continue
        if not (monster.get("is_boss") or monster.get("is_world_boss")):
            continue
        if spawn.get("zone_id") in EXCLUDED_ZONE_IDS:
            continue
        if spawn.get("sub_zone_id") in EXCLUDED_ZONE_TRIGGER_IDS:
            continue

        position = spawn.get("position") or {}
        if position.get("x") is None or position.get("y") is None:
            continue

        points.append(
            {
                "monster_id": monster["id"],
                "monster_name": monster.get("name", monster["id"]),
                "zone_id": spawn.get("zone_id", "unknown"),
                "position_x": float(position["x"]),
                # Exported Position.y is the game's horizontal Z axis.
                "position_z": float(position["y"]),
            }
        )

    return points


def game_position_to_source_pixel(
    position_x: float,
    position_z: float,
    world_bounds: dict,
    image_size: tuple[int, int],
) -> tuple[int, int] | None:
    """Convert game X/Z coordinates to stitched-source pixel coordinates."""
    world_min_x = world_bounds["min_x"]
    world_max_x = world_bounds["max_x"]
    world_min_z = world_bounds["min_z"]
    world_max_z = world_bounds["max_z"]
    world_width = world_max_x - world_min_x
    world_depth = world_max_z - world_min_z

    if world_width <= 0 or world_depth <= 0:
        raise ValueError("World bounds must have positive width and depth")
    if not (world_min_x <= position_x <= world_max_x):
        return None
    if not (world_min_z <= position_z <= world_max_z):
        return None

    image_width, image_height = image_size
    px = int(round((position_x - world_min_x) / world_width * (image_width - 1)))
    py = int(round((world_max_z - position_z) / world_depth * (image_height - 1)))
    return px, py


def sample_blank_ratio(
    image: Image.Image,
    center: tuple[int, int],
    sample_radius: int,
    black_threshold: int,
) -> float:
    """Return the fraction of pixels in a sample window that are near-black."""
    center_x, center_y = center
    left = max(0, center_x - sample_radius)
    top = max(0, center_y - sample_radius)
    right = min(image.size[0], center_x + sample_radius + 1)
    bottom = min(image.size[1], center_y + sample_radius + 1)
    crop = image.crop((left, top, right, bottom)).convert("RGB")
    pixels = list(crop.getdata())
    if not pixels:
        return 1.0

    blank_count = sum(
        1
        for red, green, blue in pixels
        if red <= black_threshold
        and green <= black_threshold
        and blue <= black_threshold
    )
    return blank_count / len(pixels)


def find_blank_boss_spawn_samples(
    image: Image.Image,
    export_dir: Path,
    world_bounds: dict,
    sample_radius: int = 12,
    black_threshold: int = 8,
    blank_ratio_threshold: float = 0.95,
) -> list[dict]:
    """Find boss spawn positions whose stitched screenshot sample is blank/black."""
    failures: list[dict] = []
    for point in load_boss_spawn_validation_points(export_dir):
        pixel = game_position_to_source_pixel(
            point["position_x"],
            point["position_z"],
            world_bounds,
            image.size,
        )
        if pixel is None:
            continue

        blank_ratio = sample_blank_ratio(image, pixel, sample_radius, black_threshold)
        if blank_ratio < blank_ratio_threshold:
            continue

        failures.append(
            {
                **point,
                "pixel_x": pixel[0],
                "pixel_y": pixel[1],
                "blank_ratio": round(blank_ratio, 4),
            }
        )

    return failures


def validate_boss_spawn_coverage(
    image: Image.Image,
    export_dir: Path,
    world_bounds: dict,
) -> None:
    """Fail tile generation when boss spawn samples are blank in the stitched source."""
    failures = find_blank_boss_spawn_samples(image, export_dir, world_bounds)
    if not failures:
        console.print("Boss-position screenshot validation passed")
        return

    console.print("[red]Error:[/red] Boss-position screenshot validation failed")
    for failure in failures[:10]:
        console.print(
            "  "
            f"{failure['monster_name']} ({failure['monster_id']}) "
            f"in {failure['zone_id']} at "
            f"({failure['position_x']:.1f}, {failure['position_z']:.1f}) "
            f"is {failure['blank_ratio']:.0%} black"
        )
    if len(failures) > 10:
        console.print(f"  ...and {len(failures) - 10} more")

    raise RuntimeError(
        f"Boss-position screenshot validation failed for {len(failures)} spawn(s)"
    )


# Pillow's default decompression limit is too small for our stitched image
Image.MAX_IMAGE_PIXELS = 200_000_000


def stitch_screenshots(screenshots_dir: Path, metadata: dict) -> Image.Image:
    """Stitch individual screenshots into a single world image."""
    console.print("Stitching screenshots...")

    tile_resolution = metadata["tile_resolution"]
    screenshots = metadata["screenshots"]

    # Calculate canvas size from grid dimensions
    # Screenshots are named world_xNNN_yMMM.png
    max_x_idx = max(int(s["file"].split("_")[1][1:]) for s in screenshots)
    max_y_idx = max(int(s["file"].split("_")[2][1:].split(".")[0]) for s in screenshots)
    num_cols = max_x_idx + 1
    num_rows = max_y_idx + 1

    canvas_width = num_cols * tile_resolution
    canvas_height = num_rows * tile_resolution

    console.print(
        f"  Grid: {num_cols}x{num_rows}, Canvas: {canvas_width}x{canvas_height}"
    )

    # Create canvas
    canvas = Image.new("RGB", (canvas_width, canvas_height))

    # Paste each screenshot
    # Invert Y so high Z (north) is at top of canvas
    for screenshot in screenshots:
        # Extract grid indices from filename
        parts = screenshot["file"].split("_")
        x_idx = int(parts[1][1:])  # "x000" -> 0
        y_idx = int(parts[2][1:].split(".")[0])  # "y000.png" -> 0

        # Calculate pixel position (invert Y so north is at top)
        px = x_idx * tile_resolution
        py = (max_y_idx - y_idx) * tile_resolution

        # Load and paste
        img_path = screenshots_dir / screenshot["file"]
        if img_path.exists():
            img = Image.open(img_path)
            canvas.paste(img, (px, py))
        else:
            console.print(f"  [yellow]Warning:[/yellow] Missing {screenshot['file']}")

    return canvas


def generate_tiles(
    source: Image.Image,
    tiles_dir: Path,
    world_bounds: dict,
    min_zoom: int,
    max_zoom: int,
    tile_size: int,
    quality: int,
    background_color: tuple[int, int, int] = (3, 6, 22),  # website background
) -> int:
    """Generate tile pyramid from source image. Returns total tile count.

    Uses deck.gl's tile coordinate system where:
    - Tile (0,0) is at world origin (0,0)
    - Each tile at zoom z covers (tile_size / 2^z) world units
    - Negative tile indices are valid (for negative world coordinates)

    Edge tiles that extend beyond the world bounds are filled with the
    background color rather than stretched.
    """
    source_width, source_height = source.size

    # World bounds from metadata (game coordinates)
    world_min_x = world_bounds["min_x"]
    world_max_x = world_bounds["max_x"]
    world_min_z = world_bounds["min_z"]
    world_max_z = world_bounds["max_z"]
    world_width = world_max_x - world_min_x
    world_depth = world_max_z - world_min_z

    # deck.gl extent (Y = -game_z to match visualization coordinate system)
    extent_min_x = world_min_x
    extent_max_x = world_max_x
    extent_min_y = -world_max_z
    extent_max_y = -world_min_z

    # Pixels per world unit in source image
    px_per_unit_x = source_width / world_width
    px_per_unit_y = source_height / world_depth

    total_tiles = 0

    with Progress() as progress:
        for z in range(min_zoom, max_zoom + 1):
            # At zoom z, each tile covers tile_size / 2^z world units
            # (256 at z=0, 128 at z=1, 64 at z=2, ... 4 at z=6)
            # This matches standard web map tiling where higher zoom = more detail
            tile_world_size = tile_size / (2**z)

            # Calculate tile index range needed to cover our world
            tx_min = int(math.floor(extent_min_x / tile_world_size))
            tx_max = int(math.floor(extent_max_x / tile_world_size))
            ty_min = int(math.floor(extent_min_y / tile_world_size))
            ty_max = int(math.floor(extent_max_y / tile_world_size))

            num_x = tx_max - tx_min + 1
            num_y = ty_max - ty_min + 1

            task = progress.add_task(f"Zoom {z}", total=num_x * num_y)

            for tx in range(tx_min, tx_max + 1):
                for ty in range(ty_min, ty_max + 1):
                    # Full tile bounds in deck.gl world coordinates (unclamped)
                    full_tile_min_x = tx * tile_world_size
                    full_tile_max_x = (tx + 1) * tile_world_size
                    full_tile_min_y = ty * tile_world_size
                    full_tile_max_y = (ty + 1) * tile_world_size

                    # Clamped tile bounds (what actually has content)
                    clamped_min_x = max(full_tile_min_x, extent_min_x)
                    clamped_max_x = min(full_tile_max_x, extent_max_x)
                    clamped_min_y = max(full_tile_min_y, extent_min_y)
                    clamped_max_y = min(full_tile_max_y, extent_max_y)

                    # Skip if no overlap with world extent
                    if clamped_min_x >= clamped_max_x or clamped_min_y >= clamped_max_y:
                        progress.update(task, advance=1)
                        continue

                    # Convert clamped deck.gl coordinates to game coordinates
                    # deck.gl Y = -game Z
                    tile_game_min_x = clamped_min_x
                    tile_game_max_x = clamped_max_x
                    tile_game_min_z = -clamped_max_y
                    tile_game_max_z = -clamped_min_y

                    # Convert to source image pixels
                    # Source has north (high Z) at top, so invert Y
                    px_left = (tile_game_min_x - world_min_x) * px_per_unit_x
                    px_right = (tile_game_max_x - world_min_x) * px_per_unit_x
                    px_top = (world_max_z - tile_game_max_z) * px_per_unit_y
                    px_bottom = (world_max_z - tile_game_min_z) * px_per_unit_y

                    # Clamp to source image bounds (safety)
                    px_left = max(0, px_left)
                    px_right = min(source_width, px_right)
                    px_top = max(0, px_top)
                    px_bottom = min(source_height, px_bottom)

                    # Crop region from source
                    crop_box = (
                        int(px_left),
                        int(px_top),
                        int(px_right),
                        int(px_bottom),
                    )
                    cropped = source.crop(crop_box)

                    # Calculate output rectangle bounds directly from world coords
                    # This ensures offset + size exactly matches the intended region
                    out_left = int(
                        round(
                            (clamped_min_x - full_tile_min_x)
                            / tile_world_size
                            * tile_size
                        )
                    )
                    out_right = int(
                        round(
                            (clamped_max_x - full_tile_min_x)
                            / tile_world_size
                            * tile_size
                        )
                    )
                    out_top = int(
                        round(
                            (full_tile_max_y - clamped_max_y)
                            / tile_world_size
                            * tile_size
                        )
                    )
                    out_bottom = int(
                        round(
                            (full_tile_max_y - clamped_min_y)
                            / tile_world_size
                            * tile_size
                        )
                    )

                    # Derive size from bounds (guarantees no gaps)
                    out_w = out_right - out_left
                    out_h = out_bottom - out_top

                    # Flip cropped content vertically to match BitmapLayer expectations
                    # Source: north at top, BitmapLayer: maps image top to maxY (low Z)
                    flipped = cropped.transpose(Image.Transpose.FLIP_TOP_BOTTOM)

                    # Resize cropped content
                    if out_w > 0 and out_h > 0:
                        resized = flipped.resize(
                            (out_w, out_h), Image.Resampling.LANCZOS
                        )
                    else:
                        progress.update(task, advance=1)
                        continue

                    # Create output tile with background color
                    tile_img = Image.new(
                        "RGB", (tile_size, tile_size), background_color
                    )

                    # Paste resized content at calculated position
                    tile_img.paste(resized, (out_left, out_top))

                    # Save as WebP (use string for negative indices)
                    tile_path = tiles_dir / str(z) / str(tx) / f"{ty}.webp"
                    tile_path.parent.mkdir(parents=True, exist_ok=True)
                    tile_img.save(tile_path, "WEBP", quality=quality)

                    total_tiles += 1
                    progress.update(task, advance=1)

    return total_tiles


def run(config: dict) -> None:
    """Generate map tile pyramid from screenshots."""
    console.print("[bold]Generating map tiles...[/bold]")

    # Configuration
    tile_config = config["build_pipeline"]["tiles"]
    min_zoom = tile_config["min_zoom"]
    max_zoom = tile_config["max_zoom"]
    tile_size = tile_config["tile_size"]
    quality = tile_config.get("webp_quality", tile_config.get("jpeg_quality", 85))

    # Paths
    repo_root = Path(__file__).parent.parent.parent.parent.parent
    export_dir = repo_root / config["paths"]["export_dir"]
    website_dir = repo_root / config["paths"]["website_dir"]
    final_tiles_dir = website_dir / "static" / "tiles"
    temp_tiles_dir = website_dir / "static" / ".tiles-temp"

    screenshots_dir = export_dir / "screenshots"
    stitched_path = screenshots_dir / "stitched" / "world.png"
    metadata_path = screenshots_dir / "metadata.json"

    # Validate inputs
    if not metadata_path.exists():
        console.print(f"[red]Error:[/red] Metadata not found: {metadata_path}")
        console.print("Run MapScreenshotter mod first to export screenshots")
        return

    # Load metadata
    with open(metadata_path) as f:
        metadata = json.load(f)

    world_bounds = metadata["world_bounds"]
    console.print(
        f"World bounds: X [{world_bounds['min_x']}, {world_bounds['max_x']}], "
        f"Z [{world_bounds['min_z']}, {world_bounds['max_z']}]"
    )

    # Stitch screenshots into world image
    source = stitch_screenshots(screenshots_dir, metadata)
    stitched_path.parent.mkdir(parents=True, exist_ok=True)
    source.save(stitched_path, "PNG")
    console.print(f"Saved stitched image: {stitched_path}")

    console.print(f"Source image: {source.size[0]}x{source.size[1]} pixels")
    # Validate source coverage before blanking excluded zones or publishing tiles.
    try:
        validate_boss_spawn_coverage(source, export_dir, world_bounds)
    except RuntimeError:
        raise typer.Exit(1) from None

    # Source orientation: high Z (north) at top (from stitching)
    # BitmapLayer with bounds [minX, minY, maxX, maxY] maps:
    #   image top → maxY (high deck.gl Y = low game Z)
    #   image bottom → minY (low deck.gl Y = high game Z)
    # We flip each tile crop to match this expectation.

    # Blank out excluded zones
    excluded_zones = load_excluded_zones(export_dir)
    if excluded_zones:
        blank_color = (0, 0, 0)  # black to match map background
        blanked = blank_excluded_zones(
            source, excluded_zones, world_bounds, blank_color
        )
        console.print(f"Blanked {blanked} excluded zones")

    # Clear temp directory and generate there
    if temp_tiles_dir.exists():
        shutil.rmtree(temp_tiles_dir)
    temp_tiles_dir.mkdir(parents=True, exist_ok=True)

    # Generate tile pyramid to temp directory
    console.print(f"Generating tiles (zoom {min_zoom}-{max_zoom}, {tile_size}px)...")
    total_tiles = generate_tiles(
        source=source,
        tiles_dir=temp_tiles_dir,
        world_bounds=world_bounds,
        min_zoom=min_zoom,
        max_zoom=max_zoom,
        tile_size=tile_size,
        quality=quality,
    )

    # Calculate total size and generate manifest
    console.print("Generating tiles manifest...")
    manifest: dict = {"zoom_levels": {}}
    total_size = 0

    for z in range(min_zoom, max_zoom + 1):
        zoom_dir = temp_tiles_dir / str(z)
        if not zoom_dir.exists():
            continue

        tiles_in_zoom = list(zoom_dir.rglob("*.webp"))
        zoom_size = sum(f.stat().st_size for f in tiles_in_zoom)
        total_size += zoom_size

        # Build list of tile paths relative to tiles dir
        tile_paths = [
            f"/tiles/{z}/{f.parent.name}/{f.stem}.webp" for f in tiles_in_zoom
        ]

        manifest["zoom_levels"][str(z)] = {
            "count": len(tiles_in_zoom),
            "size_bytes": zoom_size,
            "tiles": sorted(tile_paths),
        }

    manifest["total_count"] = total_tiles
    manifest["total_size_bytes"] = total_size

    # Write manifest to temp directory
    manifest_path = temp_tiles_dir / "tiles-manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    # Swap temp directory with final directory (atomic-ish)
    if final_tiles_dir.exists():
        shutil.rmtree(final_tiles_dir)
    temp_tiles_dir.rename(final_tiles_dir)

    if total_size < 1024 * 1024:
        size_str = f"{total_size / 1024:.1f} KB"
    else:
        size_str = f"{total_size / (1024 * 1024):.1f} MB"

    console.print()
    console.print(f"[green]✓[/green] Generated {total_tiles:,} tiles ({size_str})")
    console.print(f"  Output: {final_tiles_dir}")
