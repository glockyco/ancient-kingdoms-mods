# MapTeleporter

Alt+click on the map to teleport to that location.

## Usage

1. Open the map (M key)
2. Hold Alt and click where you want to teleport
3. Character teleports to the clicked location

## Configuration

`<game_directory>/UserData/MelonPreferences.cfg`:

```ini
[MapTeleporter]
VerboseLogging = false
```

## How It Works

Converts screen coordinates → map local → normalized [0,1] → world coordinates using the map camera's orthographic bounds.

**Key coordinate systems:**
- Screen: Mouse input (bottom-left origin)
- Map UI: `localMap` RectTransform (1200×1010, center origin)
- World: Zone-specific, hundreds of units

## Gotchas

**Use `localMap` RectTransform, not `rectTransformMap`**
- `localMap` is the actual map (1200×1010)
- `rectTransformMap` is the container (1920×1080)

**Use `null` camera for Screen Space Overlay UI**
- MainCamera has viewport distortion
- Map UI is overlay, not camera-rendered

**Use `mapCamera` (Cinemachine), not `MainCamera`**
- MainCamera is minimap (ortho 15)
- mapCamera is full map (ortho 80-210 based on zoom)

**Use texture aspect ratio (1.0), not display rect aspect (1.188)**
- Texture is 800×800 (square)
- Display rect is 1200×1010 (stretched)
- World coordinates map to texture proportions
