# Ancient Kingdoms Mods

Quality of life mods for Ancient Kingdoms, a multiplayer action RPG.

## Available Mods

### BossTracker
Tracks boss and elite monsters with a draggable in-game UI panel showing:
- Alive bosses/elites with distance and direction
- Dead bosses/elites with respawn countdown timers
- Auto-sorts by distance or respawn time

### MapEnhancer
Enhances map visibility by:
- Enabling Veteran Awareness skill automatically
- Showing all monsters on the map with color coding
- Highlighting bosses (cyan) and elites (purple)
- Showing dead boss/elite locations as grey markers

### MonsterRespawner
Allows instant respawning of dead monsters:
- Hold **Alt** to show respawn markers at death locations
- Displays monster name, level, and countdown timer
- Left-click marker to instantly respawn the monster
- Color-coded text (cyan=boss, purple=elite, red=regular)

All mods work independently or together.

## Installation

### Prerequisites

**MelonLoader (Nightly Required)**

Ancient Kingdoms requires MelonLoader v0.7.2+ (nightly/open-beta builds):

1. Download MelonLoader v0.7.2 or newer from [MelonLoader releases](https://github.com/LavaGang/MelonLoader/releases)
2. Run the installer and point it to your Ancient Kingdoms installation
3. Launch the game once to let MelonLoader initialize

For detailed installation instructions, see the [MelonLoader documentation](https://melonwiki.xyz/#/README).

### Installing Mods

1. Download the latest mod DLLs from [Releases](#) (or build from source)
2. Copy the DLL files to `Ancient Kingdoms/Mods/`
   - `BossTracker.dll`
   - `MapEnhancer.dll`
   - `MonsterRespawner.dll`
3. Launch Ancient Kingdoms

Mods will load automatically. Check `MelonLoader/Latest.log` if you encounter issues.

## Compatibility

- **Game**: Ancient Kingdoms (Steam version)
- **Unity Version**: 6000.2.9f1
- **Tested on**: October 2025
- **MelonLoader**: v0.7.2 Open-Beta (nightly build required)

Compatibility with future game updates is not guaranteed. If mods stop working after a game update, check for updated releases or build from source.

## Usage

### BossTracker

- Automatically displays when bosses/elites are nearby
- Drag the panel: Hold **Right Shift** + **Left Click** + **Drag**
- Panel position is saved automatically

### MapEnhancer

- Works automatically - no configuration needed
- Open the in-game map to see enhanced visibility
- Monster colors: Cyan = Boss, Purple = Elite, Red = Regular

### MonsterRespawner

- Hold **Alt** to reveal respawn markers for dead monsters
- Markers show name, level, and countdown timer
- Left-click a marker to instantly respawn that monster
- Works automatically - no configuration needed

## Building from Source

**Quick Start:**
```bash
# 1. Clone the repository
# 2. Copy Local.props.example to Local.props and configure your game path
# 3. Build and deploy
dotnet run --project build-tool all
```

**Using Rider/Visual Studio:**
- Open `AncientKingdomsMods.sln` - everything works out of the box!
- Build with Ctrl+Shift+B or use the build tool run configurations

For detailed development instructions, see [CLAUDE.md](CLAUDE.md).

## Troubleshooting

**Mods not loading:**
- Ensure MelonLoader nightly is installed (not stable)
- Check `MelonLoader/Latest.log` for errors
- Verify DLLs are in the `Mods/` folder

**Game crashes on startup:**
- Remove all mods and test
- Re-add mods one at a time to identify conflicts

**Boss tracker not showing:**
- Must be in-game (World scene), not in menus
- Requires bosses/elites to be nearby or previously discovered

For development issues, see [CLAUDE.md](CLAUDE.md).
