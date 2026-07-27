# MapScreenshotter

Automated world map screenshot capture.

## Usage

`build-tool export --screenshots` orchestrates automated screenshot capture: `compendium.export`
calls `StartScreenshotCapture()` via HotRepl after data export completes.

Press **Shift+F10** in-game for a manual capture without `build-tool`.

Screenshots are saved to `exported-data/screenshots/`.

## How It Works

Captures the entire world as a grid of orthographic screenshots:

- **Tile size:** 200 world units per screenshot
- **Grid:** 9x11 tiles = 99 screenshots
- **Camera:** Orthographic, looking straight down

For clean terrain, the mod hides monsters, NPCs, and gather items and does not restore them because `ShowEntities()` is never called. The player is deactivated during capture rather than teleported.

## Output

```
exported-data/screenshots/
├── metadata.json              # World bounds + screenshot metadata
├── world_x000_y000.png   # Top-left tile
├── world_x001_y000.png
└── ...
```

The build pipeline uses `metadata.json` to stitch screenshots and generate map tiles.

## Coordinate System

- Map X = Unity X (horizontal)
- Map Y = Unity Z (depth/forward)
- Unity Y is discarded (elevation)

## Gotchas

**World bounds calculation:**
- Primary: `ZoneInfo.zones` dictionary
- Fallback: entity positions with 10% padding

**Camera settings:**
- Must be orthographic (no perspective distortion)
- `orthographicSize = tileSize / 2` (100 for 200-unit tiles)
