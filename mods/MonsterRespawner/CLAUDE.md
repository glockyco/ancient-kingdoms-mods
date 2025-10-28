# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MonsterRespawner is a MelonLoader mod for Ancient Kingdoms (IL2CPP Unity game) that allows instant respawning of dead monsters.

**Key Features:**
- Shows world-space text markers at dead monster locations
- Displays monster name, level, and respawn countdown timer
- Alt-key toggle to show/hide markers
- Click-to-respawn functionality
- Color-coded text (cyan=boss, purple=elite, red=regular)

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
- `MonsterRespawner.cs` - Contains all mod logic in one file
- `MonsterRespawner.csproj` - Project file with game assembly references

**Key Components:**

1. **World-Space Text Markers**
   - Uses `TextMesh` for 3D world-space text rendering
   - Each marker shows: monster name, level, and countdown timer
   - Text color hardcoded by monster type for consistency

2. **Monster Tracking System**
   - Runs in `OnUpdate()` only in "World" scene
   - Caches monster list to avoid expensive `FindObjectsOfType` calls every frame
   - Refreshes cache on scene entry and periodically (every 5 seconds)
   - Maintains `Dictionary<uint, RespawnMarker>` keyed by monster netId
   - Only tracks dead monsters with `respawn` enabled and future respawn times

3. **Server Time Synchronization**
   - Caches NetworkManagerMMO singleton (fetched once)
   - Uses `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time` for accurate server time
   - Critical for countdown timer accuracy (avoids local time drift)
   - Auto-removes markers when respawn time is reached

4. **Alt-Key Toggle System**
   - Markers only visible when Alt (left or right) is held
   - Prevents visual clutter and accidental interactions
   - Updates marker visibility every frame via `SetActive()`

5. **Click-to-Respawn System**
   - Uses `BoxCollider` on each marker for raycasting
   - Raycasts from mouse position when Alt is held and left-click occurs
   - Sets monster's `respawnTimeEnd` to past time to trigger immediate respawn
   - Game's own respawn system handles the actual spawn

**IL2CPP Interop Patterns:**
- Use `Il2CppInterop.Runtime.Il2CppType.Of<T>()` for `FindObjectsOfType`
- Cast generic Unity objects with `.Cast<Il2Cpp.Type>()`
- Access game types via `Il2Cpp.` namespace prefix
- Use Unity's new Input System (`UnityEngine.InputSystem`) not legacy Input class

## Game Integration

**Scene Handling:**
- Only active in "World" scene (actual gameplay)
- Automatically disabled in menus/loading screens
- Clears all markers and cache when leaving World scene

**Marker Creation:**
- Only creates markers for dead monsters with `respawn == true`
- Only creates markers when server time is available
- Only creates markers if `respawnTimeEnd > currentTime`
- Marker position follows monster's death location

**Respawn Mechanism:**
- Does not spawn monsters directly
- Manipulates game's existing respawn timer (`respawnTimeEnd`)
- Sets `respawnTimeEnd` to `currentTime - 1.0` to trigger immediate respawn
- Game's built-in respawn system handles the actual monster spawn

**Color Coding:**
- **Bosses**: Cyan `(0, 1, 1, 1)`
- **Elites**: Purple `(0.8, 0.4, 1, 1)`
- **Regular**: Red `(0.988, 0.192, 0.264, 1)`
- All colors hardcoded to match BossTracker/MapEnhancer conventions

## Assembly References

**Critical Dependencies:**
- `MelonLoader.dll` - Mod loader framework
- `Il2CppInterop.Runtime.dll` - IL2CPP bridge
- `Assembly-CSharp.dll` - Game code (Monster, Player, NetworkManagerMMO)
- `Il2CppMirror.dll` - Networking (NetworkTime, NetworkManagerMMO)
- `Unity.InputSystem.dll` - Input handling (Mouse, Keyboard)
- `UnityEngine.TextRenderingModule.dll` - TextMesh component

All assemblies located at: `$(ANCIENT_KINGDOMS_PATH)\MelonLoader\Il2CppAssemblies\`

## Common Issues

**Input System Errors:**
The game uses Unity's new Input System. Never use legacy `Input.mousePosition` or `Input.GetMouseButton()`. Always use:
```csharp
var mouse = UnityEngine.InputSystem.Mouse.current;
var keyboard = UnityEngine.InputSystem.Keyboard.current;
```

**Text Too Small/Large:**
Adjust both `fontSize` and `characterSize` together:
- Current values: `fontSize = 20`, `characterSize = 0.2f`
- Increase both proportionally to make text larger
- Decrease both proportionally to make text smaller

**Markers Not Clickable:**
- Ensure `BoxCollider` is added to marker GameObject
- Verify raycast is only active when Alt is held
- Check that marker GameObject is the hit object (not a child)

**Respawn Not Working:**
- Monster must have `respawn` property set to `true`
- Server time must be available (`NetworkManagerMMO` found)
- Game's respawn system handles actual spawn (not instantaneous)

**Server Time:**
Always use `NetworkTime.time + NetworkManagerMMO.offsetNetworkTime` for timers, never `Time.timeAsDouble` or local time sources.
