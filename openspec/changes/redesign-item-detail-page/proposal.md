# Proposal

## Why

Item pages state an item's stats up to three times, as the in-game tooltip, a Basic Information card and a Stats card. 870 of the 944 Stats cards only repeat tooltip numbers. The relationship cards are paired into two columns that leave a half-empty row on 1,389 pages, so the page has gaps beside and between its cards. Long lists such as a treasure map's 121 monster sources run in half the page width with no count. Drop rows also never name a zone, although loot is configured on each placed monster. Black Pearl therefore lists "Fire Templar (Lv 49) 10.1%" and "Fire Templar (Lv 50-55) 1.1%" without saying that the first chance applies in Despair and the second in Molten Sanctuary.

Players most often ask where to get an item and what it is for. The page should answer both without duplicate panels and without empty space that only reflects how cards were paired.

## What Changes

- The page opens with one row: the in-game tooltip beside one list of facts, both the same height. An item without a tooltip shows the facts at full width.
- The Stats card is removed. A stat the tooltip's stat list does not include joins the fact list under a heading saying so. Whether the tooltip lists a stat is read from the item's tooltip template: through the placeholder the game fills, or as a typed stat line with the stat's exact value.
- Every other section takes the full width, in a fixed order: what the item does, then where to get it, then what it is for. Each section title carries its count.
- Lists of monsters, vendors, chests, recipes and quests become tables whose columns suit the relation. A list longer than ten rows shows ten per page.
- Drop rows gain a Zone column taken from the placements that carry the drop, so rows for one monster in two zones say which zone each chance belongs to.
- Pages lose information they repeated or invented: the set listed three times on set pieces, the augment paragraph and "Common" badge on armor set bonus entries, the Mechanics line that repeats How to Use on augments, and the Attack Delay of tools, which the game never uses.
- Recipe pages show which recipe they teach. The page has always gated this on a name column that nothing fills.
- Recipe relations get a text link to the recipe instead of an unlabelled icon.

## Capabilities

### New Capabilities

- `item-detail-page`: what an item detail page shows, in what order, and which facts it states once, including the tooltip stat rule, relationship tables, zone attribution of drops and the handling of items without a tooltip.

### Modified Capabilities

None.

## Impact

- `website/src/routes/items/[id]/+page.svelte` and `+page.server.ts`, the item queries in `website/src/lib/queries/items.ts`, the item source types and readers in `website/src/lib/types/item-sources.ts` and `website/src/lib/server/item-sources.ts`.
- `build-pipeline/src/compendium/denormalizers/items/tooltips.py` records which stat fields each tooltip shows. `build-pipeline/schema.sql` gains that column and loses the never-filled `recipe_potion_learned_name`.
- All 1,757 prerendered item pages change layout. Map popups, list pages and other entity pages are unchanged.
