## Why

The game now classifies King Darin as a Notable NPC and multiplies his positive kill reputation by 60. The compendium discards this classification, reports +90 instead of +5,400, and cannot distinguish him on NPC or map surfaces.

## What Changes

- Export and store the authoritative Notable NPC classification.
- Apply the Notable NPC multiplier to NPC kill-reputation calculations.
- Present Notable NPCs as a classification separate from NPC service roles.
- Show the classification on NPC directory, detail, search, and map surfaces.
- Give Notable NPCs a distinct map marker category and presentation.
- Correct the NPC detail page, faction pages, and reputation mechanics page.

## Capabilities

### New Capabilities

- `notable-npc-classification`: Export, calculate, search, and present Notable NPCs across the compendium and interactive map.

### Modified Capabilities

None.

## Impact

- `mods/DataExporter/`: Export the direct `Npc.isNotableNPC` field.
- `build-pipeline/`: Preserve the classification in models and SQLite output.
- `exported-data/npcs.json`: Refresh the authoritative NPC export.
- `website/src/`: Correct reputation calculations and add Notable NPC presentation to NPC, faction, mechanics, search, and map surfaces.
- Generated website data and source citations change with the new field and corrected mechanics.
