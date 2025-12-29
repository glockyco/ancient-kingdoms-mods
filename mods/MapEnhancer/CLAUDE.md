# MapEnhancer

Enhances map visibility by enabling Veteran Awareness and color-coding monsters.

## Features

- Removes fog of war from entire map
- Enables Veteran Awareness skill (reveals nearby monsters)
- Color-codes monsters: cyan=bosses, purple=elites, red=regular
- Shows dead bosses/elites as greyed-out icons
- Hides regular dead monsters from map

## How It Works

**Fog Removal:**
- Uses `FogOfWarTeam.SetAll()` to clear fog visibility
- Called once when entering World scene
- Non-destructive: fog returns to normal when mod is disabled

**Monster Map Marks:**
- Only active in "World" scene
- Caches monster list (refreshes every 5 seconds)
- Forces all map marks to be visible and active
- Sets full opacity (alpha = 1.0) for alive monsters

**Color Coding:**
| Type | Alive | Dead |
|------|-------|------|
| Boss | Cyan (0, 1, 1) | Grey (0.3, 0.3, 0.3, 0.5) |
| Elite | Purple | Grey (0.3, 0.3, 0.3, 0.5) |
| Regular | Default | Hidden |

## Gotchas

**Veteran Awareness:** Automatically enables on local player every frame. No skill points required.
