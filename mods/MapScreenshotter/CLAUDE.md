# MapScreenshotter

Automated world map screenshot capture for Ancient Kingdoms.

## Usage

1. Load into the game world (any zone)
2. Press **Shift+F10** to start screenshot capture
3. Wait for the process to complete (will take several minutes)
4. Screenshots saved to `DATA_EXPORT_PATH/screenshots/` (configured in `Local.props`)

## How It Works

### World Coordinates

The game world is approximately **1713 x 2001 units** based on entity positions:
- X range: [-828, 885]
- Y (Z in Unity) range: [-676, 1325]

### Screenshot Grid

The mod captures the entire world as a grid of overlapping screenshots:
- **Tile size:** 100 units per screenshot (configurable)
- **Grid dimensions:** ~17x20 tiles = ~340 screenshots
- **Capture time:** ~1 minute (0.15s per screenshot + rendering)
- **Camera:** Orthographic, looking straight down

### Entity Hiding

For clean terrain screenshots, the mod temporarily hides:
- All monsters
- All NPCs
- All gather items (plants, minerals, chests)

The player is teleported far away (999999, 999999, 999999) to avoid appearing in screenshots.

All entities and player position are restored after capture completes.

### Output Format

```
E:\ancient-kingdoms-export\screenshots\
├── metadata.json                 # World bounds + screenshot metadata
├── screenshot_x000_z000.png      # Top-left tile
├── screenshot_x000_z001.png
├── screenshot_x001_z000.png
└── ... (all tiles)
```

**metadata.json structure:**
```json
{
  "timestamp": "2025-10-31T12:34:56.0000000Z",
  "camera_height": 10.0,
  "orthographic_size": 50.0,
  "world_bounds": {
    "min_x": -828.1,
    "max_x": 884.9,
    "min_z": -676.2,
    "max_z": 1325.0
  },
  "screenshots": [
    {
      "file": "screenshot_x000_z000.png",
      "world_position": {"x": -778.1, "z": -626.2},
      "coverage": {"width": 100.0, "height": 100.0}
    }
  ]
}
```

## Implementation Details

### World Bounds Calculation

The mod calculates world bounds in two ways:

**Primary method (ZoneInfo.zones):**
- Iterates through all zones in `ZoneInfo.zones` dictionary
- Uses zone bounds: `left`, `right`, `top`, `bottom` fields
- Most accurate if zone data is available

**Fallback method (entity positions):**
- Finds all monsters and NPCs in scene
- Calculates min/max positions across all entities
- Adds 10% padding
- Used if `ZoneInfo.zones` is empty or invalid

### Camera Configuration

```csharp
mainCamera.orthographic = true;
mainCamera.orthographicSize = tileSize / 2f;  // 50 units for 100-unit tiles
mainCamera.transform.position = new Vector3(worldX, cameraZ, worldZ);
mainCamera.transform.rotation = Quaternion.Euler(0, 0, 0);  // Looking down
```

**Why orthographic?**
- No perspective distortion
- Exact world-to-pixel mapping
- Tiles stitch perfectly

**Camera height:**
- Uses original camera Z position if negative (typical: -10)
- Maintains proper render distance for terrain

### Screenshot Naming

Files are named with zero-padded grid coordinates:
- `screenshot_x000_z000.png` - top-left corner
- `screenshot_x016_z019.png` - bottom-right corner (example)

This naming scheme:
- Sorts correctly in file explorers
- Makes debugging easier
- Allows build pipeline to stitch in correct order

### Coordinate System

Ancient Kingdoms uses Unity's coordinate system:
- **X:** Horizontal (left-right)
- **Y:** Vertical (up-down, ignored for 2D map)
- **Z:** Depth (forward-back, used as map Y)

Map conversion:
- Map X = Unity X
- Map Y = Unity Z
- Unity Y is discarded (height/elevation)

## Configuration

The tile size (100 units) is currently hardcoded. To adjust:

1. Edit `MapScreenshotter.cs`
2. Change `const float tileSize = 100f;` to desired value
3. Rebuild and deploy

**Smaller tiles (e.g., 50 units):**
- More screenshots (4x as many for 50x50)
- Higher resolution final map
- Longer capture time
- Larger total file size

**Larger tiles (e.g., 200 units):**
- Fewer screenshots (1/4 as many for 200x200)
- Lower resolution final map
- Faster capture time
- Smaller total file size

**Recommended:** 100 units provides good balance between quality and practicality.

## Build Pipeline Integration

The Python build pipeline (`build_pipeline/compendium tiles`) will:
1. Read `metadata.json`
2. Stitch screenshots into single large image using world positions
3. Generate zoom pyramid (Z0-Z6) in Leaflet tile format
4. Output to `tiles/{z}/{x}/{y}.png`

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for full build pipeline details.

## Troubleshooting

### Screenshots are black/empty
- **Cause:** Camera culling mask or render distance issue
- **Fix:** Ensure camera culling mask includes terrain layers

### Missing terrain features
- **Cause:** Camera too high or orthographic size too small
- **Fix:** Adjust camera height or increase orthographic size

### Screenshots don't align when stitched
- **Cause:** Camera position calculation error
- **Fix:** Verify world bounds calculation is correct
- **Debug:** Check metadata.json for accurate world positions

### Capture freezes/crashes
- **Cause:** Too many screenshots or insufficient memory
- **Fix:** Increase tile size to reduce screenshot count

### Entities visible in screenshots
- **Cause:** Entity hiding failed
- **Fix:** Check logs for errors in `HideEntities()` method
- **Verify:** Ensure entities are being set to `SetActive(false)`

## Logging

The mod provides detailed logging:
- World bounds calculation
- Grid dimensions and tile count
- Entity hiding counts
- Progress updates every 10 tiles
- Completion/error messages

Example output:
```
[MapScreenshotter] Starting screenshot capture of entire world map...
[MapScreenshotter] Zone 'Twilight Forest': X[-395.0, 495.0] Z[-435.0, 355.0]
[MapScreenshotter] Zone 'Everfrost': X[-828.0, -28.0] Z[628.0, 1325.0]
...
[MapScreenshotter] Calculated bounds from 25 zones
[MapScreenshotter] World bounds: X[-828.1, 884.9] Z[-676.2, 1325.0]
[MapScreenshotter] Grid: 17x20 tiles (340 total)
[MapScreenshotter] Tile size: 100 units
[MapScreenshotter] World size: 1713.0 x 2001.2 units
[MapScreenshotter] Hidden: 3699 monsters, 259 NPCs, 795 gather items
[MapScreenshotter] Progress: 10/340 tiles (2%)
[MapScreenshotter] Progress: 20/340 tiles (5%)
...
[MapScreenshotter] Progress: 340/340 tiles (100%)
[MapScreenshotter] Metadata saved to: E:\ancient-kingdoms-export\screenshots\metadata.json
[MapScreenshotter] All entities restored
[MapScreenshotter] Screenshot capture complete!
```

## Performance Notes

- **Capture time:** ~1 minute for full world (340 screenshots @ 0.15s each)
- **File size:** ~170-340 MB total (0.5-1 MB per PNG screenshot)
- **Memory usage:** Minimal - only one screenshot rendered at a time
- **Game impact:** Entities frozen during capture, normal gameplay after

## Future Enhancements

Potential improvements for V2:
- [ ] Configurable tile size via config file
- [ ] Resume capability if capture interrupted
- [ ] UI overlay showing capture progress
- [ ] Option to capture only specific zones
- [ ] Configurable entity hiding (e.g., keep buildings, hide creatures)
- [ ] Multiple zoom levels captured in one pass
