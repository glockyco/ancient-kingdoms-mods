# MapEnhancer

Enhances map visibility by enabling Veteran Awareness and color-coding monsters.

## Features

- Removes fog of war from entire map
- Enables Veteran Awareness skill (reveals nearby monsters)
- Color-codes monsters: cyan bosses, while elite and regular monsters preserve their existing mark colors with full opacity
- Shows dead bosses/elites as greyed-out icons
- Hides regular dead monsters from map

## How It Works

**Fog Removal:**
- Uses `FogOfWarTeam.SetAll()` to clear fog visibility
- Called once when entering World scene
- Does not restore fog visibility or `hasVeteranAwareness` when the mod is disabled

**Monster Map Marks:**
- Only active in "World" scene
- Caches monster list and refreshes it only on first use, a scene change, or a player move beyond the 50-unit teleport threshold
- Forces all map marks to be visible and active
- Sets full opacity (alpha = 1.0) for alive monsters

**Color Coding:**
| Type | Alive | Dead |
|------|-------|------|
| Boss | Cyan (0, 1, 1) | Grey (0.3, 0.3, 0.3, 0.5) |
| Elite | Existing mark color, alpha 1 | Grey (0.3, 0.3, 0.3, 0.5) |
| Regular | Existing mark color, alpha 1 | Hidden |

## Gotchas

**Veteran Awareness:** Automatically enables on local player every frame. No skill points required.
