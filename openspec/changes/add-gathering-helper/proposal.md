# Proposal

## Why

The game marks no herbs, ores, fishing spots or Radiant Sparks on its minimap or map, and a zone holds up to 43 nodes of one type with only 2 to 4 on screen at once, so players look up node positions on the website and walk between them by hand. The choices behind this change were made in a comparison drawn in the game (`.local/changes/gathering-gps/review/1-gathering.md`, 2026-11-06).

## What Changes

- A Gathering panel lists every herb, ore, fish and Radiant Spark in the game as compact tiles, one tab per category, with this zone's types first and the others dimmed.
- A round button on the minimap's lower left shows and hides the panel.
- Clicking a tile watches its type. Watched types get pins on the local map, icons on the minimap and one edge arrow to the nearest ready node.
- Fishing tiles are fish, and watching one marks the spots whose catch list names it.
- Sparks behave like the other types: a spark that hasn't appeared counts as respawning, with the time until it appears where the mod knows it, as in a world the player hosts.
- The helper searches the scene once per session and keeps its per-frame work to the watched nodes of the current zone, because a once-a-second search caused 1.0.2's stutter.
- A Gathering group joins the settings window. Its page switches the map pins, the minimap and the arrow, and offers Zones (All zones at first) and Respawning nodes (Show at first). The list starts hidden behind the round button, and a timer button in its header shows or hides respawning nodes.
- General's Undiscovered monsters switch becomes Undiscovered and also covers herbs, ores and fish the character hasn't gathered, which then show as the journal's silhouettes.

## Capabilities

### New Capabilities

- `gathering-helper`: the Gathering panel, its button, watching gathering types, and the pins, minimap icons and arrow for watched types.

### Modified Capabilities

- `mod-settings-layout`: the settings window gains a Gathering group, and General's undiscovered switch covers gathering types too.
- `bestiary-drops`: undiscovered pages name the renamed switch.

## Impact

- `mods/PocketCompendium/`: a new feature under `Features/Gathering/`, a `GatherItem` catalogue with a `Start` patch, new icons, and the settings groups.
- `tests/PocketCompendium.Tests` for the catalogue's grouping, readiness and nearest-node choice.
- `mods/PocketCompendium/README.md` gains a Gathering section.
