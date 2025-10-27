# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BossTracker is a MelonLoader mod for Ancient Kingdoms (IL2CPP Unity game) that tracks boss/elite monsters and their respawn times.

**Key Features:**
- Tracks alive bosses/elites with distance and direction information
- Tracks dead bosses/elites with respawn countdown timers
- Draggable in-game UI panel with position persistence
- Shows boss/elite positions and directions relative to player

## Build and Deploy

Use the build tool from the repository root:

```bash
# Build and deploy from repository root
cd ../..
dotnet run --project build-tool all
```

**Note:** The game must be closed before deploying, as it locks the file when running.

## Architecture

**Single-File Mod Structure:**
- `BossTracker.cs` - Contains all mod logic in one file
- `BossTracker.csproj` - Project file with game assembly references

**Key Components:**

1. **Tracker UI System**
   - Creates Unity UI panel anchored to bottom-right
   - Uses MelonPreferences for position/size persistence
   - Draggable via Right Shift + Left Click + Drag
   - Auto-saves position on drag release

2. **Monster Tracking System**
   - Runs in `OnUpdate()` only in "World" scene
   - Caches monster list to avoid expensive `FindObjectsOfType` calls every frame
   - Refreshes cache on scene entry and periodically (every 5 seconds) to catch new spawns
   - Maintains `Dictionary<uint, BossInfo>` keyed by monster netId
   - Separate alive/dead tracking with different sort orders

3. **Server Time Synchronization**
   - Caches NetworkManagerMMO singleton (fetched once)
   - Uses `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time` for accurate server time
   - Critical for respawn timer accuracy (avoids local time drift)
   - Cleans up expired respawn timers automatically

**IL2CPP Interop Patterns:**
- Use `Il2CppInterop.Runtime.Il2CppType.Of<T>()` for `FindObjectsOfType`
- Cast generic Unity objects with `.Cast<Il2Cpp.Type>()`
- Access game types via `Il2Cpp.` namespace prefix
- Use Unity's new Input System (`UnityEngine.InputSystem`) not legacy Input class

## Game Integration

**Scene Handling:**
- Only active in "World" scene (actual gameplay)
- Automatically disabled in menus/loading screens

**Direction Calculation:**
- Uses `Atan2(direction.x, direction.y)` for 2D isometric coordinates
- X axis = horizontal (East/West)
- Y axis = vertical (North/South)
- Returns compass direction + degrees (e.g., "NE (45°)")

## Configuration

MelonPreferences config category: `BossTracker`

Stored at: `Ancient Kingdoms/UserData/MelonPreferences.cfg`

**Available settings:**
- `PanelX`, `PanelY` - UI position (anchored to bottom-right)
- `PanelWidth`, `PanelHeight` - Panel dimensions
- `FontSize` - Text size (default: 12)

## Assembly References

**Critical Dependencies:**
- `MelonLoader.dll` - Mod loader framework
- `Il2CppInterop.Runtime.dll` - IL2CPP bridge
- `Assembly-CSharp.dll` - Game code (Monster, Player, NetworkManagerMMO)
- `Il2CppMirror.dll` - Networking (NetworkTime)
- `Unity.InputSystem.dll` - Input handling (Mouse, Keyboard)
- `UnityEngine.UI.dll` - UI components (Text, Image, RectTransform)

All assemblies located at: `$(ANCIENT_KINGDOMS_PATH)\MelonLoader\Il2CppAssemblies\`

## Common Issues

**Input System Errors:**
The game uses Unity's new Input System. Never use legacy `Input.mousePosition` or `Input.GetMouseButton()`. Always use:
```csharp
var mouse = UnityEngine.InputSystem.Mouse.current;
var keyboard = UnityEngine.InputSystem.Keyboard.current;
```

**UI Scaling:**
Canvas scale factors can cause coordinate mismatches on high-DPI displays (4K). Current implementation uses simple Right Shift + drag approach to avoid complex coordinate calculations.

**Server Time:**
Always use `NetworkTime.time + NetworkManagerMMO.offsetNetworkTime` for respawn timers, never `Time.timeAsDouble` or local time sources.
