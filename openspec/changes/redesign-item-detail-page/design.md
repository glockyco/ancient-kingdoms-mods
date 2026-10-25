# Design

## Context

The item page renders three regions today: Basic Information above a two-column grid that starts with the tooltip, optional full-width cards, then a second two-column grid of relationship cards. Both grids place cards in source order, so a card's partner depends on which other cards exist.

The tooltip is not the game's string. The exporter calls the base `ScriptableItem.ToolTip(bool, bool, string)` overload (`mods/DataExporter/Exporters/ItemExporter.cs:PlayerNeutralTooltip`), which fills `{NAME}`, `{REQUIREDCLASS}` and `{TAGS}` but leaves every stat placeholder in place. `items.tooltip` therefore holds each item's authored template with stat placeholders. `build-pipeline/src/compendium/denormalizers/items/tooltips.py:_parse_tooltip` fills them to build `tooltip_html`. The game fills the same placeholders in `server-scripts/EquipmentItem.cs:ToolTip`. A stat appears in the tooltip with its number only where the template contains its placeholder. `speedBonus` has no placeholder.

Checks made for this design, in the running game through HotRepl and against the decompiled code:

- Cinderchant Chestplate has `hasteBonus` 0.1. Its rendered tooltip describes Cinderchant Tempo in words and gives no number.
- Cindersoul Sash has `manaBonus` 250. Its rendered tooltip never mentions mana.
- Journeyman's Boots has `speedBonus` 1, added to the base speed of 3 in `server-scripts/Player.cs:speed` while not mounted. The tooltip types "increasing movement rate by 1".
- Abyssal Tidehammer's in-game tooltip matches `tooltip_html` line for line.
- Bamboo Fishing Rod is a `WeaponItem` with `delay` 15 and category `Fishing Rod`. `server-scripts/EquipmentItem.cs:CanEquip` requires the category to start with a slot's category, and no slot accepts a tool. `server-scripts/Player.cs:GetSkillRefractoryPeriod` reads delay from equipped weapons only, so a tool's delay never applies.
- Cinderchant Armor Bonus Set is an `AugmentItem` with no category. Its in-game tooltip is empty except for the item level.
- Fisherman's Hat has category `Head`, but its template types "Slot: Chest". The fact list's slot comes from the category and stays correct.
- Loot is configured on each placed monster (`mods/DataExporter/ConfiguredWorldSnapshot.cs`). Fire Templars drop Black Pearl at 10% in Despair and 1% in Molten Sanctuary, and Ashen Key Shard only in Molten Sanctuary. Today's page lists two Fire Templar rows without zones.
- `recipe_potion_learned_name` is NULL for all 46 recipe items. Nothing in the pipeline writes it, so the Teaches Recipe card never renders.

Across all items, 4,735 stat values come from placeholders and 47 are typed into the template. Augments type stat lines such as "+10 Magic Resist", and some gear names a number inside an effect's description, such as Advisor Robe's "increases your magic resistance and poison resistance by 15". 92 equipment and weapon items have a stat that their tooltip's stat list does not include. Most are Haste, Critical Chance, Accuracy, Spell Casting Haste, Mana Regen and Fear Resist on gear with named effects. The 24 armor set bonus entries have no tooltip, and their stats are the set's attribute bonuses.

## Goals / Non-Goals

**Goals:**

- One layout that suits both tall-tooltip, few-source items such as weapons, and short-tooltip, many-source items such as materials.
- Reading order that matches visual order at every width.

**Non-Goals:**

- Other entity pages, list pages and map popups keep their layout. The same anatomy may suit them later, in a separate change.
- Card contents other than those named in the specs keep their wording.
- Chest titles. `distinguish-detail-page-titles` owns them, and chest rows use the subject it defines.

## Decisions

### The opening row pairs the tooltip with a one-column fact list

The tooltip sits in a fixed-width column beside a fact list of label and value rows. The grid stretches both cards to the row's height. One fact per row makes the list grow with the item's complexity, as the tooltip does, so the two cards end close to each other before stretching. Prototypes on Abyssal Tidehammer, Arcane Essence and Cold Dwarven Beer showed both cards ending close together. Cinderchant Boots, whose tooltip also lists its set, left the fact list noticeably shorter. Task 3.1 measures the padding on these pages before the layout is accepted.

Alternatives considered:

- A sticky tooltip rail with everything else beside it. Rejected: weapons left the right column far shorter than the tooltip, and materials left the rail empty below the tooltip.
- Facts under the tooltip in the rail. Rejected: it fixed materials and made weapons worse.
- Equal-height relationship cards. Rejected: a one-row card stretched to a long list's height keeps the empty space and only moves it inside the card.
- Masonry or dense grid packing. Rejected: visual order stops matching keyboard and reading order.
- Tabs per relation. Rejected: they hide alternatives, overflow on phones, and can open on an empty tab.

### The pipeline records which stats the tooltip shows

`tooltips.py` already maps each stat field to its placeholder in order to fill it. It records, per item, the stat fields the tooltip lists, in a new `items.tooltip_stat_fields` JSON column. A stat is listed when the template holds its placeholder, or when the template types the exact line that placeholder would produce, such as "+10 Magic Resist" with a Magic Resist of 10. The page lists every nonzero stat outside that set, under a heading saying the tooltip's stat list does not include it. Keeping the placeholder knowledge in the one place that fills placeholders means a game update that adds a placeholder changes both at once.

A number inside an effect's description is not a stat line, so its stat is listed: the description may round, combine two stats or describe a condition. A typed stat line with a different value than the stat is not matched either, so the page shows the actual value. Reading the website's rendered HTML for any number was rejected, because prose numbers cannot be attributed to a stat reliably.

### Relationship sections use the shared data table

Relation lists become tables in the shared `DataTable`, which already pages at a set size, hides paging controls for a single page and renders the first page into the static HTML. The monster page's Loot and Spawns tables use it. Each relation gets the columns that suit it: drops get Monster, Level, Zone and Chance, vendors get NPC and Price, recipes get the result, amount and a named recipe link. The section title carries the count, as the monster page's "Abilities (1)" does.

A plain list was kept for one-row sections in the prototype and rejected: a table header over one row costs a line, while mixing lists and tables would give the same relation two shapes on different pages.

### Drop zones come from the method's providers

A drop row already reads its levels from the spawn providers of its kill method. Its zones come from the same providers, deduplicated in name order. An altar event names the altar's zone. A method without placed providers names no zone. The row grouping on the page includes the zones, so two methods with the same chance in different zones stay separate rows.

### Taught recipes resolve their name in the query

`ITEM_DETAIL_SELECT` already derives `taught_by_recipe_name` with a subquery. The taught item's name is derived the same way, and the unused `recipe_potion_learned_name` column is dropped from the schema.

### Set information lives in the set section

The set section keeps its member links and bonus links and gains a link to the set's own page. The fact list's Set Bonus row goes. The tooltip's set block stays, because it is the game's own rendering.

## Risks / Trade-offs

- [The stretched shorter card in the opening row still has some padding] → One fact per row keeps the two heights close. The residual sits inside one card at the end of the row, not between cards.
- [A full-width section with one row is visually light] → It replaces a half-empty grid row and keeps one shape for every relation.
- [Removing the Stats card changes the first screen of every item page] → Each stat remains on the page through the tooltip or the fact list, and the rule is checked against every item with stats.
- [Paging hides rows beyond ten] → The title states the total and the first page is in the static HTML. Sorting by chance puts the best sources first.

## Migration Plan

The pipeline change adds `tooltip_stat_fields` and drops `recipe_potion_learned_name`. A `compendium build` regenerates the database before the website reads the new column. The site prerenders every item page, so a deploy replaces all of them at once. Rollback is reverting the change and rebuilding.
