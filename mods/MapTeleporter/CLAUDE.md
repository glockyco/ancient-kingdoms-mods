# MapTeleporter

Alt+click on the map to teleport to that location.

## Usage

1. Open the map (M key)
2. Hold Alt and click where you want to teleport
3. Character teleports to the clicked location

## Configuration

Config file: `<game_directory>/UserData/MelonPreferences.cfg`

```ini
[MapTeleporter]
VerboseLogging = false  # Set to true for debugging
```

## Coordinate Systems

Ancient Kingdoms uses three coordinate systems that must be properly converted:

### 1. Screen Coordinates
- **Origin:** Bottom-left of screen
- **Range:** (0, 0) to (screen width, screen height) in pixels
- **Source:** Mouse input

### 2. Map UI Coordinates
- **Origin:** Center of the map UI element
- **Range:** (-width/2, -height/2) to (+width/2, +height/2)
- **Important:** localMap RawImage is 1200×1010, inside a 1920×1080 container
- **Normalized:** (0, 0) to (1, 1) after normalization

### 3. World Coordinates
- **Origin:** Zone-specific
- **Range:** Hundreds of units, varies by zone
- **Z-axis:** Usually 0 for 2D gameplay

## Map System Architecture

```
UIMap.singleton
├── rectTransformMap (1920×1080)     - Full screen container
├── localMap (RawImage)              - The actual zone map
│   ├── RectTransform (1200×1010)    - ✓ Use this for conversions
│   └── Texture (800×800)            - Square map texture
├── MainCamera                        - Minimap camera (ortho 15)
└── mapCamera (Cinemachine)          - Full map camera (ortho = zoom)
```

### Two Camera Systems

**MainCamera (Minimap):**
- Corner HUD showing ~30 units around player
- Orthographic Size: 15
- Viewport: (0.167, 0.167, 0.667, 0.667) - center portion only
- **Do NOT use for full map conversions**

**mapCamera (Cinemachine Virtual Camera):**
- Full zone map camera
- Orthographic Size: Equals zoom level (80-210)
- **Use this for coordinate conversion**

## Conversion Pipeline

```
1. Screen Click (e.g., 1968, 889)
   ↓
2. Convert to Map Local Coordinates
   Use: RectTransformUtility.ScreenPointToLocalPointInRectangle()
   Target: localMap.RectTransform (1200×1010)
   Camera: null (Screen Space Overlay)
   ↓
3. Normalize to [0,1]
   normX = (mapLocalX + width/2) / width
   normY = (mapLocalY + height/2) / height
   ↓
4. Calculate World View Bounds
   Get: mapCamera position and ortho size
   Aspect: texture.width / texture.height (800/800 = 1.0)
   viewWidth = orthoSize × aspect × 2
   viewHeight = orthoSize × 2
   ↓
5. Map to World Position
   worldX = cameraX - viewWidth/2 + normX × viewWidth
   worldY = cameraY - viewHeight/2 + normY × viewHeight
   ↓
6. Teleport
   player.CmdPortalDestination(zoneId, worldPos, orientation)
```

## Critical Implementation Details

### 1. Use localMap RectTransform, NOT rectTransformMap

**Wrong:**
```csharp
RectTransformUtility.ScreenPointToLocalPointInRectangle(
    uiMap.rectTransformMap,  // ❌ Container (1920×1080)
    ...
);
```

**Correct:**
```csharp
var localMapRT = uiMap.localMap.GetComponent<RectTransform>();
RectTransformUtility.ScreenPointToLocalPointInRectangle(
    localMapRT,  // ✓ Actual map (1200×1010)
    ...
);
```

### 2. Use null Camera for Screen Space Overlay

**Wrong:**
```csharp
RectTransformUtility.ScreenPointToLocalPointInRectangle(
    localMapRT, screenPos,
    uiMap.MainCamera,  // ❌ Applies viewport distortion
    out mapLocalPos
);
```

**Correct:**
```csharp
RectTransformUtility.ScreenPointToLocalPointInRectangle(
    localMapRT, screenPos,
    null,  // ✓ Direct screen-space conversion
    out mapLocalPos
);
```

**Why:** Map is Screen Space Overlay UI, not rendered by a camera. MainCamera has a viewport (0.167-0.833) that would distort coordinates.

### 3. Use mapCamera (Cinemachine), NOT MainCamera

**Wrong:**
```csharp
var camera = uiMap.MainCamera;  // ❌ Minimap (ortho 15)
float orthoSize = camera.orthographicSize;
```

**Correct:**
```csharp
var camera = uiMap.mapCamera;  // ✓ Full map
float orthoSize = camera.m_Lens.OrthographicSize;  // 80-210
```

**Why:** MainCamera is the minimap (ortho size 15, ~30 unit view). mapCamera is the full zone map with ortho size matching zoom level.

### 4. Use Texture Aspect Ratio, NOT Display Rect Aspect

**Wrong:**
```csharp
float aspect = mapRect.width / mapRect.height;  // ❌ 1.188
float viewWidth = orthoSize * aspect * 2;  // 18.8% too wide!
```

**Correct:**
```csharp
var texture = uiMap.localMap.texture;
float aspect = (float)texture.width / texture.height;  // ✓ 1.0
float viewWidth = orthoSize * aspect * 2;
```

**Why:** The texture (800×800) is square, but displayed stretched in a 1200×1010 rect. World coordinates map to texture proportions, not display proportions. Using display aspect causes 18.8% overshooting.

## Reference Implementation

```csharp
// 1. Get localMap RectTransform
var localMapRT = uiMap.localMap.GetComponent<RectTransform>();

// 2. Screen → Map Local (null camera for overlay UI)
Vector2 mapLocalPos;
RectTransformUtility.ScreenPointToLocalPointInRectangle(
    localMapRT, screenPos, null, out mapLocalPos);

// 3. Normalize
var rect = localMapRT.rect;
float normX = (mapLocalPos.x + rect.width/2) / rect.width;
float normY = (mapLocalPos.y + rect.height/2) / rect.height;

// 4. Get Cinemachine camera
var camera = uiMap.mapCamera;
Vector3 camPos = camera.transform.position;
float orthoSize = camera.m_Lens.OrthographicSize;

// 5. Calculate bounds with texture aspect
var texture = uiMap.localMap.texture;
float aspect = (float)texture.width / texture.height;
float viewWidth = orthoSize * aspect * 2;
float viewHeight = orthoSize * 2;

// 6. Map to world
Vector2 worldPos = new Vector2(
    camPos.x - viewWidth/2 + normX * viewWidth,
    camPos.y - viewHeight/2 + normY * viewHeight
);
```

## Common Issues

### Clicks Outside Map Bounds
**Symptom:** Normalized coordinates < 0 or > 1

**Cause:** Using rectTransformMap instead of localMap.RectTransform

**Solution:** Get RectTransform from the localMap RawImage

### Overshooting in Click Direction
**Symptom:** Clicking east lands too far east, west lands too far west

**Cause:** Using display rect aspect (1.188) instead of texture aspect (1.0)

**Solution:** Calculate aspect from texture dimensions: `texture.width / texture.height`

### Wrong Location / Zone Switching
**Symptom:** Teleporting hundreds of units away

**Cause:** Using MainCamera (minimap) instead of mapCamera (Cinemachine)

**Solution:** Use `uiMap.mapCamera.m_Lens.OrthographicSize`

## Debugging

### Enable Verbose Logging

Edit `UserData/MelonPreferences.cfg`:
```ini
[MapTeleporter]
VerboseLogging = true
```

Logs show:
- Screen click position
- Map local coordinates
- Normalized coordinates (should be in [0,1])
- Camera position and view bounds
- Calculated world position
- Distance from player

### Expected Behavior

- Normalized coordinates in [0, 1] range
- Clicking player icon teleports within ~1 unit
- No east/west overshooting
- Works at all zoom levels

### Diagnostic Code

Add temporary logging in `HandleMapTeleport()`:

```csharp
// Log camera and player relationship
var camPos = uiMap.mapCamera.transform.position;
var playerPos = player.transform.position;
LoggerInstance.Msg($"Player offset from camera: ({playerPos.x - camPos.x:F2}, {playerPos.y - camPos.y:F2})");

// Test without actually teleporting
if (VerboseLogging)
{
    LoggerInstance.Msg($"Would teleport to: ({worldPos.x:F2}, {worldPos.y:F2})");
    return;  // Skip teleport
}
```

### Reference Values (Everfrost, Zoom 160)

Working correctly:
```
Player World: (3.54, 688.48)
Camera: (3.97, 687.74), Ortho: 160.00

Map Rect: 1200×1010
Texture: 800×800 (aspect 1.0)

View Size: 320×320 (not 380×320!)
View Bounds: X=[-156, 164], Y=[528, 848]

Click on player icon:
  Screen: (1460, 1086)
  Normalized: (0.500, 0.503)
  World: (3.97, 688.69)
  Distance: 0.48 units ✓
```

## Validation

Correct implementation produces:
- Normalized coordinates in [0, 1] range
- Clicking player icon lands within ~1 unit
- No east/west overshooting
- Works at all zoom levels
