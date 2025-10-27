# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MapEnhancer is a MelonLoader mod for Ancient Kingdoms (IL2CPP Unity game) that enhances the map visibility.

**Key Features:**
- Removes fog of war from entire map
- Enables Veteran Awareness skill to reveal nearby monsters on map
- Shows all monsters on map with full opacity
- Color codes monsters (cyan=bosses, purple=elites, red=regular)
- Shows dead bosses/elites as greyed-out icons
- Hides regular dead monsters from map

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
- `MapEnhancer.cs` - Contains all mod logic in one file
- `MapEnhancer.csproj` - Project file with game assembly references

**Key Components:**

1. **Fog of War Removal**
   - Uses `FogOfWarTeam.SetAll()` to clear fog visibility
   - Sets both Visible and Partial fog values to 0 (fully visible)
   - Called once when entering World scene
   - Non-destructive: fog returns to normal when mod is disabled

2. **Veteran Awareness System**
   - Automatically enables Veteran Awareness on local player every frame
   - This reveals all nearby monsters on the map
   - No skill points required

3. **Map Mark Enhancement**
   - Runs in `OnUpdate()` only in "World" scene
   - Caches monster list to avoid expensive `FindObjectsOfType` calls every frame
   - Refreshes cache on scene entry and periodically (every 5 seconds) to catch new spawns
   - Forces all map marks to be visible and active
   - Sets full opacity (alpha = 1.0) for alive monsters

3. **Color Coding System**
   - **Bosses:** Cyan (0, 1, 1, 1)
   - **Elites:** Purple/default elite color with full opacity
   - **Regular:** Default monster color with full opacity
   - **Dead Bosses/Elites:** Grey (0.3, 0.3, 0.3, 0.5)
   - **Dead Regular:** Hidden from map

**IL2CPP Interop Patterns:**
- Use `Il2CppInterop.Runtime.Il2CppType.Of<T>()` for `FindObjectsOfType`
- Cast generic Unity objects with `.Cast<Il2Cpp.Type>()`
- Access game types via `Il2Cpp.` namespace prefix

## Game Integration

**Scene Handling:**
- Only active in "World" scene (actual gameplay)
- Automatically disabled in menus/loading screens

**Map Mark Management:**
- Dead bosses/elites shown as grey marks (0.3f grey, 0.5f alpha)
- Alive bosses forced to cyan (0, 1, 1, 1)
- Regular dead monsters hidden from map
- All alive marks set to full alpha (1f)

## Assembly References

**Critical Dependencies:**
- `MelonLoader.dll` - Mod loader framework
- `Il2CppInterop.Runtime.dll` - IL2CPP bridge
- `Assembly-CSharp.dll` - Game code (Monster, Player)
- `Il2CppMirror.dll` - Networking library

All assemblies located at: `$(ANCIENT_KINGDOMS_PATH)\MelonLoader\Il2CppAssemblies\`

## Performance Notes

- Runs every frame in Update
- Caches monster list to avoid expensive `FindObjectsOfType` calls
- Cache refreshes only on scene change or every 5 seconds (not every frame)
- Per-frame operations are lightweight (color/visibility changes only)
