## Why

The pipeline, the pages and the TypeScript calculators each implement game rules, and the copies disagree with the game and with each other.

- Altar reward tiers. The database stores tiers for effective levels 0, 35, 45 and 55, and the item page states "Required Level: 30-34". The game picks the tier from the activating player's level plus total veteran points, with thresholds 40, 50 and 150 (`server-scripts/DefaultEvent.cs:231-237`).
- Chest rewards. The reward loop of `ChestItem.cs` is simulated in Python for every chest and again in TypeScript for Treasure Hunter skill.
- Primal essence. The pipeline reimplements the game's eligibility. 127 Uncommon items get a value, and 113 weapons and 24 augments that the game accepts get none (`server-scripts/Utils.cs:527-539`).
- Item level. The pipeline reimplements `EquipmentItem.CalculateItemLvl`, with two suspected differences from the game.
- The experience page hardcodes the level cap, the veteran point cap and every class's attribute gains, which the progression tables already hold.

`plan-shared-game-model` decides that each rule has one owner. The planner, "Where to Get" and save import all depend on that.

## What Changes

- Rules that depend on a character run in one TypeScript module, `website/src/lib/calculation/`. A prerendered page calls it for a stated baseline, and the browser calls it again with the reader's values. The database stores the rules' inputs and parameters, never a result for a particular character.
- Facts about an item that the game computes with its own function come from the export, which calls that function. This covers primal essence and item level. The pipeline's reimplementations go.
- Altar tiers come from thresholds that the export carries with their citation. The item page, altar page, map popups and drop notes state them through one rule, and the wrong ranges go.
- Chest chances come from one reward loop in TypeScript. The pipeline stores each reward's roll order and base chance, and stops estimating chances.
- The experience page reads the caps and the class attribute gains from the progression tables.

## Capabilities

### New Capabilities

- `game-rules`: where a game rule is implemented, what the database stores for it, and the rules this change moves.

### Modified Capabilities

- None.

## Impact

- `mods/DataExporter`: the item and altar exporters.
- `build-pipeline`: `denormalizers/items/calculations.py`, `sources.py`, `special_types.py`, `source_entries.py`, `crafting_source_level.py` and `denormalizers/monsters/drops.py`.
- `website/src/lib/calculation/`: gains the chest loop and the altar tier rule.
- Pages: items, altars, chests, the Treasure Hunter and experience pages, and the map popups.

Corrected altar tiers and primal essence values change what those pages show. The design lists the changes, which are approved. `simplify-pipeline-loader-registration` and `harden-export-sessions` land first.
