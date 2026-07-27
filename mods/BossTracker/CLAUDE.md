# BossTracker

Tracks boss, elite, and fabled monsters and displays respawn timers in a draggable UI panel.

## Features

- Tracks alive boss/elite/fabled monsters with distance and direction
- Tracks dead boss/elite/fabled monsters with respawn countdown timers
- Draggable panel (Right Shift + Left Click + Drag)
- Position persists across sessions

## How It Works

**Monster Tracking:**
- Tracks any monster flagged `isBoss`, `isElite`, or `isFabled`
- Only active in "World" scene
- Caches monster list and refreshes it only on first use, a scene change, or a player move beyond the 50-unit teleport threshold
- Maintains `Dictionary<uint, BossInfo>` keyed by monster netId
- Separate alive/dead tracking with different sort orders

**Server Time:**
- Uses `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time` for accurate respawn timers
- Critical for timer accuracy (avoids local time drift)

**Direction Calculation:**
- Uses `Atan2(direction.x, direction.y)` for 2D isometric coordinates
- Returns compass direction + degrees (e.g., "NE (45)")

## Configuration

`<game_directory>/UserData/MelonPreferences.cfg`:

```ini
[BossTracker]
PanelX = -10
PanelY = 30
PanelWidth = 420
PanelHeight = 300
FontSize = 12
```

## Gotchas

**Server time is required:** Always use `NetworkTime.time + NetworkManagerMMO.offsetNetworkTime`, never local time sources.

**UI Scaling:** Canvas scale factors can cause coordinate mismatches on high-DPI displays. Current implementation uses Right Shift + drag to avoid complex coordinate calculations.
