# Design

## Context

- The closure anonymizes a reference to removed content instead of deleting it when the reference is a required operand: the row keeps its amount, chance and conditions, loses the target's identity and gets a `withheld` flag (`build-pipeline/src/compendium/redactions/semantics.py`, `WITHHOLD_TARGETS`). Game 0.10.2.3 has 8 withheld quest objectives, 16 withheld loot entries on six monsters, 1 withheld portal key and 1 withheld essence-trade input.
- Pages read those rows in three ways. Some inner-join the target and drop the row, such as a quest's Objectives and a monster's loot. Some show a label, "Unpublished item", "An unpublished book" or "Unpublished class". The probability rules state every chance of a loot pool unknown when the pool holds a withheld quest-gated entry (`questUnknown` in `website/src/lib/acquisition/rules.ts`).
- The hidden-crafting redaction deletes the recipes of eight items outright (`redactions/crafting.py`). Nothing records that a recipe existed, so the five Draconium armor pieces fall back to "No known source" and their molds and materials show no use.
- The game adds a quest-gated drop before it counts boss equipment and never counts it as equipment (`server-scripts/Monster.cs:4253-4321`). The site's boss model does the same (`website/src/lib/calculation/boss-loot.ts`), and a non-boss pool rolls each entry on its own. A withheld entry keeps every operand these calculations read.

## Goals / Non-Goals

**Goals:**

- Every withheld reference shows a placeholder with the entry's own facts.
- One label and one look everywhere, replacing "Unpublished".
- Loot tables show every chance, the redacted rows' too.
- Hidden recipes leave a trace on the product, the mold and the materials, without the recipe's content.

**Non-Goals:**

- Linking a redacted objective to the drop that gives it. The build keeps no link between two anonymous rows, so How to Obtain Items and a monster's Related Quests stay without them.
- The two manually excluded quests and their key. `redactions.toml` names them as quests that must not appear in any listing or relationship, and the build deletes their relationships rather than withholding them.
- Quest and item text that names redacted content. It stays as the game wrote it.

## Decisions

### One placeholder component

`RedactedEntry` renders a dashed 28 px slot, the label "Redacted <kind>" in the muted colour and the hover text "Left out of the compendium at the developers' request." through `title`, as `SeasonLabel` and `MonsterTypeIcon` give their hover text. The slot keeps a placeholder's name aligned with item names in tables. The kind is the entity kind the reference points at: item, book, monster, recipe, quest, class, skill, race, faction or location. A key is an item. Server code that builds text, such as a game tooltip or a search description, uses the same label.

Alternatives: the game's black square and "???", which needs a second name for the same thing in text; a grey bar, which reads as a table that is still loading; the word alone, which breaks the name column in tables.

### Withheld rows load with left joins

Queries that inner-join a withheld target read it with a left join and pass `withheld`, and the page renders the placeholder where it would render the link. A quest's objective lists, its meta description and its map popup take the withheld rows.

### Loot rules emit a target for each withheld entry

`calculateMethodProbabilities` treats a withheld quest gate like a published one, so a withheld entry no longer makes the other chances unknown. For each withheld item of a kill pool it emits a result computed as if the item were needed, which is the page's assumption for quest items. Entries of one withheld item share a duplicate group, and the target names the group by its first entry's ordinal, because pool keys are opaque and the item's identity is gone. `contextualMonsterDrops` turns those results into placeholder rows with the chance and the Fatecharm chance. `ProbabilityTarget` gains the kind `withheld_item`, which every existing reader already skips because it selects `item` targets.

### Hidden recipes record their items before they go

Before the hidden-crafting redaction deletes a recipe, it writes one row per item the recipe makes and per item it consumes into `redacted_recipe_items` (`item_id`, `role`, `recipes`), counting recipes. The table refers to `items`, so the closure deletes the rows of items it removes, such as the three `ignore_journal` products whose recipes are also hidden. The item page reads the table: a `result` row shows Crafted from Recipe with the placeholder and counts as a known source, and a `material` row adds one placeholder row to Used in Recipes, with the count when it is above one and without amount or product. The table's title counts every recipe the placeholder stands for.

Alternatives: keeping the recipe as a method with withheld inputs and output. The product page then lists the amounts, and the material pages would have to withhold the product but not the material, which no existing flag expresses.

### Portal keys

The map's portal query passes `required_item_withheld`, and the portal popup and tooltip show the placeholder as the key. No page shows the door to the Northern Halls today, because Temple of Valaark has no published positions.

## Risks / Trade-offs

- A placeholder row reveals that something exists and, for a drop, how often it drops. The redacted content stays unnamed, which is the line `ignore_journal` and the hidden recipes draw.
- The drop-chance parity corpus for Pocket Compendium keeps skipping monsters with a withheld entry, because the mod reads the real item and the corpus has no identity to match it with.
