# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style Guidelines

**Logging:**
- ALWAYS add comprehensive logging when debugging or developing new features
- Log: whether objects/fields were found, current values before changes, success/failure of operations
- Don't be stingy with logging - iteration cycles are slow, so proactive logging saves time

**Comments:**
- NO historical/change comments (e.g., "Added fog removal", "Updated to fix bug")
- NO superfluous comments explaining obvious code
- ONLY add comments for complex logic that genuinely needs explanation

**Code Quality:**
- Write clean, straightforward code without unnecessary abstractions
- Prefer simple solutions over complex ones

## Project Overview

This repository contains MelonLoader mods for Ancient Kingdoms, an IL2CPP Unity game.

**Available Mods:**
- **BossTracker** - Tracks boss/elite monsters and displays respawn timers in a draggable UI panel
- **MapEnhancer** - Enhances map visibility by enabling Veteran Awareness and color-coding monsters
- **MonsterRespawner** - Allows instant respawning of dead monsters via clickable world-space markers

Each mod is independent and can be used standalone or together.

## Getting Started

### 1. Initial Setup

Copy the environment configuration file:
```bash
cp Local.props.example Local.props
```

Edit `Local.props` and set your game installation path:
```
ANCIENT_KINGDOMS_PATH=E:\SteamLibrary\steamapps\common\Ancient Kingdoms
```

The other paths are automatically derived from `ANCIENT_KINGDOMS_PATH` and usually don't need changes.

### 2. Building Mods

```bash
dotnet run --project build-tool build
```

This builds all mods in Release configuration.

### 3. Deploying Mods

```bash
dotnet run --project build-tool deploy
```

This copies the built DLLs to the game's Mods directory.

**Important:** Close the game before deploying, as it locks the DLL files while running.

### 4. Combined Build + Deploy

```bash
dotnet run --project build-tool all
```

## Project Structure

```
ancient-kingdoms-data-mining/
├── AncientKingdomsMods.sln       # Solution file (open in Rider/VS)
├── Local.props.example           # Template for local configuration
├── Local.props                   # Your local configuration (gitignored)
├── Directory.Build.props         # Shared MSBuild configuration
├── .editorconfig                 # Code style configuration
├── .gitattributes                # Git line ending configuration
├── .gitignore                    # Git ignore rules
├── README.md                     # User-facing documentation
├── CLAUDE.md                     # This file (developer documentation)
├── build-tool/                   # C# build/deploy tool
│   ├── build-tool.csproj
│   ├── Program.cs
│   └── Directory.Build.props     # Excludes build-tool from game paths
├── data-mining/                  # Data extraction scripts
│   ├── README.md                 # Usage instructions
│   └── Drops.cs                  # UnityExplorer script for drop data
└── mods/                         # Mod projects
    ├── BossTracker/              # Boss tracking mod
    │   ├── BossTracker.cs
    │   ├── BossTracker.csproj
    │   └── CLAUDE.md             # Mod-specific documentation
    ├── MapEnhancer/              # Map enhancement mod
    │   ├── MapEnhancer.cs
    │   ├── MapEnhancer.csproj
    │   └── CLAUDE.md             # Mod-specific documentation
    └── MonsterRespawner/         # Monster respawning mod
        ├── MonsterRespawner.cs
        ├── MonsterRespawner.csproj
        └── CLAUDE.md             # Mod-specific documentation
```

## Configuration

### Directory.Build.props

This file at the repository root provides shared MSBuild configuration for all mods:
- Imports MSBuild properties from `Local.props`
- Validates that required paths are set before building
- Provides common reference paths for all mod projects

### MSBuild Properties

Required property (set in `Local.props`):
- `ANCIENT_KINGDOMS_PATH` - Game installation directory

Derived properties (automatically calculated from `ANCIENT_KINGDOMS_PATH`):
- `MelonLoaderPath` - MelonLoader directory
- `Il2CppAssembliesPath` - IL2CPP assemblies directory
- `ModsPath` - Mods directory

Properties use `$(PropertyName)` syntax in MSBuild files.

## Build System

### Why Local.props instead of defaults?

The project uses explicit `Local.props` configuration with no defaults to:
- Fail fast if paths aren't configured
- Make it clear what needs to be configured
- Avoid building/deploying to wrong locations
- Work consistently across different machines

### Build Tool

The repository includes a C# build tool (`build-tool/`) that handles building and deploying mods:
- Cross-platform (works on Windows, Linux, Mac)
- Automatically loads `Local.props` configuration
- Expands variable references in paths
- Auto-discovers all mod projects in `mods/` directory
- Single source of truth - no duplicate scripts to maintain

## Development Workflow

### Adding a New Mod

1. Create a new directory in `mods/` for your mod
2. Create `ModName.csproj` - use existing mods as template
3. Create `ModName.cs` with your mod code
4. Build and test: `dotnet run --project build-tool all`

Note: The build tool auto-discovers all projects in `mods/` - no need to manually register new mods!

### Updating Assembly References

All assembly references use MSBuild properties from `Directory.Build.props`:
- `$(MelonLoaderPath)` - MelonLoader assemblies
- `$(Il2CppAssembliesPath)` - Game and Unity assemblies

Use these properties instead of absolute paths in `.csproj` files.

### Testing Changes

1. Close Ancient Kingdoms if running
2. Build and deploy: `dotnet run --project build-tool all`
3. Launch game and test

## Technical Details

### MelonLoader Framework

All mods use MelonLoader, a mod loader for IL2CPP Unity games:
- Mods inherit from `MelonMod`
- Override lifecycle methods (`OnInitializeMelon`, `OnUpdate`, etc.)
- Use `[assembly: MelonInfo(...)]` for metadata

### IL2CPP Interop

The game uses IL2CPP, requiring special interop:
- Use `Il2CppInterop.Runtime.Il2CppType.Of<T>()` for type operations
- Cast Unity objects with `.Cast<Il2Cpp.Type>()`
- Access game types via `Il2Cpp.` namespace

### Unity Input System

The game uses Unity's new Input System (not legacy Input):
```csharp
var mouse = UnityEngine.InputSystem.Mouse.current;
var keyboard = UnityEngine.InputSystem.Keyboard.current;
```

## Common Issues

### Build fails with "ANCIENT_KINGDOMS_PATH not set"

- Ensure `Local.props` file exists (copy from `Local.props.example`)
- Verify `ANCIENT_KINGDOMS_PATH` is set in `Local.props`
- Check that path points to actual game directory

### Deploy fails with "file in use"

- Close Ancient Kingdoms before deploying
- The game locks DLL files while running

### Assembly reference errors

- Verify game is installed at path in `Local.props`
- Check that MelonLoader is installed in the game directory
- Ensure IL2CPP assemblies exist in `MelonLoader\Il2CppAssemblies\`

## Mod-Specific Documentation

Each mod has its own `CLAUDE.md` with detailed information:
- **mods/BossTracker/CLAUDE.md** - Boss tracking implementation details
- **mods/MapEnhancer/CLAUDE.md** - Map enhancement details
- **mods/MonsterRespawner/CLAUDE.md** - Monster respawning implementation details

Refer to those files for mod-specific architecture and features.
