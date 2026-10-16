## Why

The game sums 28 stats and reads four more effects from buffs when a hit or cast happens. The repository names them with five key vocabularies, decides in about seven places whether a stat is a percentage, and formats numbers with twelve local functions. Some pages use names the game never shows, and the item list prints a 5% chance as 0.05. The planned stat reference pages, the character planner and save import need one vocabulary to read from, and `plan-shared-game-model` makes this the first contract to land.

## What Changes

- The exporter declares every stat once, with the game fields that feed it, and exports the names the game's own label code produces.
- The pipeline loads that catalogue into the database. The item tooltip builder takes attribute names from it.
- The website reads one generated module for stat names, units and formats, and one number and percent formatter. The copies go: the stat names in `terminology.ts`, the key lists in `constants/stats.ts`, the item page's percentage list, both `SCALING_FIELDS`, the pet stat labels and the local formatters.
- The item list shows chance stats as percentages.
- Pages that use neither of the game's names for a stat switch to the game's name. The design lists every wording change for approval.

## Capabilities

### New Capabilities

- `stat-vocabulary`: one catalogue of the game's stats with their names, units and formats, which every page, popup, tooltip and calculator reads.

### Modified Capabilities

- None. `formula-presentation` already requires the game's names, and this change makes one catalogue supply them.

## Impact

- `mods/DataExporter`: a stat catalogue that the item and skill exporters reference, and a new export file.
- `build-pipeline`: a loader, two tables and `denormalizers/items/tooltips.py`.
- `website/src/lib`: a generated vocabulary module, the shared formatters and the consumers listed in the design.
- Pages that show stats: items, skills, monsters, NPCs, pets, mercenaries, professions and the calculators.

`simplify-pipeline-loader-registration` and `harden-export-sessions` land first, because this change adds an export file and a dataset.
