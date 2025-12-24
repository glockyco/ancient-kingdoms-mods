"""Map tile pyramid generation command."""

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw
from rich.console import Console
from rich.progress import Progress

from compendium.denormalizers.exclusions import EXCLUDED_ZONE_IDS

console = Console()


def load_excluded_zones(zone_triggers_path: Path) -> list[dict]:
    """Load bounds for excluded zones from JSON."""
    if not zone_triggers_path.exists():
        console.print("  [yellow]Warning:[/yellow] zone_triggers.json not found")
        return []

    with open(zone_triggers_path) as f:
        all_zones = json.load(f)

    # Filter to only excluded zones with valid bounds
    excluded = []
    for zone in all_zones:
        if zone.get("id", "").replace("zone_trigger_", "") in EXCLUDED_ZONE_IDS:
            if zone.get("bounds_min_x") is not None:
                excluded.append(
                    {
                        "name": zone.get("name"),
                        "bounds_min_x": zone["bounds_min_x"],
                        "bounds_min_y": zone["bounds_min_y"],
                        "bounds_max_x": zone["bounds_max_x"],
                        "bounds_max_y": zone["bounds_max_y"],
                    }
                )

    return excluded


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

        # Convert to pixel coordinates
        px_left = (zone_min_x - world_min_x) * px_per_unit_x
        px_right = (zone_max_x - world_min_x) * px_per_unit_x
        px_top = (zone_min_z - world_min_z) * px_per_unit_y
        px_bottom = (zone_max_z - world_min_z) * px_per_unit_y

        # Draw filled rectangle
        draw.rectangle(
            [int(px_left), int(px_top), int(px_right), int(px_bottom)],
            fill=background_color,
        )
        count += 1

    return count


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
    for screenshot in screenshots:
        # Extract grid indices from filename
        parts = screenshot["file"].split("_")
        x_idx = int(parts[1][1:])  # "x000" -> 0
        y_idx = int(parts[2][1:].split(".")[0])  # "y000.png" -> 0

        # Calculate pixel position
        px = x_idx * tile_resolution
        py = y_idx * tile_resolution

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

    # deck.gl extent (Y = -game_z)
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
                    px_left = (tile_game_min_x - world_min_x) * px_per_unit_x
                    px_right = (tile_game_max_x - world_min_x) * px_per_unit_x
                    px_top = (tile_game_min_z - world_min_z) * px_per_unit_y
                    px_bottom = (tile_game_max_z - world_min_z) * px_per_unit_y

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

                    # Resize cropped content
                    if out_w > 0 and out_h > 0:
                        resized = cropped.resize(
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
    build_dir = repo_root / config["paths"]["build_dir"]
    tiles_dir = build_dir / "tiles"

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

    # Load or create stitched image
    source: Image.Image
    if stitched_path.exists():
        console.print(f"Loading stitched image: {stitched_path}")
        source = Image.open(stitched_path)
    else:
        console.print("Stitched image not found, creating from screenshots...")
        source = stitch_screenshots(screenshots_dir, metadata)
        # Save stitched image for future runs
        stitched_path.parent.mkdir(parents=True, exist_ok=True)
        source.save(stitched_path, "PNG")
        console.print(f"Saved stitched image: {stitched_path}")

    console.print(f"Source image: {source.size[0]}x{source.size[1]} pixels")

    # Flip source vertically: the stitched image has game Z increasing downward,
    # but deck.gl Y = -Z means Y increases upward. Flipping aligns the source
    # with deck.gl's coordinate system so tile (x, y_high) gets content from
    # the top of the flipped image (which was bottom of original = high Z = low Y).
    source = source.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    console.print("Flipped source for deck.gl Y-axis orientation")

    # Blank out excluded zones
    zone_triggers_path = export_dir / "zone_triggers.json"
    excluded_zones = load_excluded_zones(zone_triggers_path)
    if excluded_zones:
        blank_color = (0, 0, 0)  # black to match map background
        blanked = blank_excluded_zones(
            source, excluded_zones, world_bounds, blank_color
        )
        console.print(f"Blanked {blanked} excluded zones")

    # Clear existing tiles
    if tiles_dir.exists():
        import shutil

        shutil.rmtree(tiles_dir)
    tiles_dir.mkdir(parents=True, exist_ok=True)

    # Generate tile pyramid
    console.print(f"Generating tiles (zoom {min_zoom}-{max_zoom}, {tile_size}px)...")
    total_tiles = generate_tiles(
        source=source,
        tiles_dir=tiles_dir,
        world_bounds=world_bounds,
        min_zoom=min_zoom,
        max_zoom=max_zoom,
        tile_size=tile_size,
        quality=quality,
    )

    # Calculate total size
    total_size = sum(f.stat().st_size for f in tiles_dir.rglob("*.webp"))
    if total_size < 1024 * 1024:
        size_str = f"{total_size / 1024:.1f} KB"
    else:
        size_str = f"{total_size / (1024 * 1024):.1f} MB"

    console.print()
    console.print(f"[green]✓[/green] Generated {total_tiles:,} tiles ({size_str})")
    console.print(f"  Output: {tiles_dir}")
