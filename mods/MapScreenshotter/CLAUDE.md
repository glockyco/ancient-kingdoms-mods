# MapScreenshotter

Automated world map screenshot capture.

## Usage

1. Load into the game world (any zone)
2. Press **Shift+F10** to start screenshot capture
3. Wait for the process to complete (~1 minute for full world)
4. Screenshots saved to `exported-data/screenshots/`

## How It Works

Captures the entire world as a grid of orthographic screenshots:

- **Tile size:** 100 world units per screenshot
- **Grid:** ~17x20 tiles = ~340 screenshots
- **Camera:** Orthographic, looking straight down

For clean terrain, the mod temporarily hides monsters, NPCs, and gather items. Player is teleported away during capture.

## Output

```
exported-data/screenshots/
├── metadata.json              # World bounds + screenshot metadata
├── screenshot_x000_z000.png   # Top-left tile
├── screenshot_x001_z000.png
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
- `orthographicSize = tileSize / 2` (50 for 100-unit tiles)
