# Design

## Context

- The closure anonymizes a reference to removed content instead of deleting it when the reference is a required operand: the row keeps its amount, chance and conditions, loses the target's identity and gets a `withheld` flag (`build-pipeline/src/compendium/redactions/semantics.py`, `WITHHOLD_TARGETS`). Game 0.10.2.3 has 8 withheld quest objectives, 16 withheld loot entries on six monsters, 1 withheld portal key and 1 withheld essence-trade input.
- Pages read those rows in three ways. Some inner-join the target and drop the row, such as a quest's Objectives and a monster's loot. Some show a label, "Unpublished item", "An unpublished book" or "Unpublished class". The probability rules state every chance of a loot pool unknown when the pool holds a withheld quest-gated entry (`questUnknown` in `website/src/lib/acquisition/rules.ts`).
- The hidden-crafting redaction deletes the recipes of eight items outright (`redactions/crafting.py`). Nothing records that a recipe existed, so the five Draconium armor pieces fall back to "No known source" and their molds and materials show no use.
- The closure deletes a removed quest with every row that belongs to it or links an NPC to it. Vaerion Shadeborn offers and completes the two quests `redactions.toml` names, so his page shows the Quest Giver role and no quests, and the Draconium armor pieces and the Ancient Gods faction lose the quests that need them.
- The game adds a quest-gated drop before it counts boss equipment and never counts it as equipment (`server-scripts/Monster.cs:4253-4321`). The site's boss model does the same (`website/src/lib/calculation/boss-loot.ts`), and a non-boss pool rolls each entry on its own. A withheld entry keeps every operand these calculations read.

## Goals / Non-Goals

**Goals:**

- Every withheld reference shows a placeholder with the entry's own facts.
- One label and one look everywhere, replacing "Unpublished".
- Loot tables show every chance, the redacted rows' too.
- Hidden recipes leave a trace on the product, the mold and the materials, without the recipe's content.
- Removed quests leave a trace on the NPC that offers them, the items they need and the faction whose standing they require, without the quest's content.

**Non-Goals:**

- Linking a redacted objective to the drop that gives it. The build keeps no link between two anonymous rows, so How to Obtain Items and a monster's Related Quests stay without them.
- Rewards and given items of a removed quest, and its kill and location objectives. The two removed quests reward only the North Wing key, which goes with them, and have no such objectives.
- Quest and item text that names redacted content. It stays as the game wrote it.

## Decisions

### One placeholder component

`RedactedEntry` renders a dashed 28 px slot, the label "Redacted <kind>" in the muted colour and the hover text "Left out of the compendium at the developers' request." through `title`, as `SeasonLabel` and `MonsterTypeIcon` give their hover text. The slot keeps a placeholder's name aligned with item names in tables, and a table whose names have no icons, such as a quest list or Used in Recipes, shows the label without it. The kind is the entity kind the reference points at: item, book, monster, recipe, quest, class, skill, race, faction or location. A key is an item. Server code that builds text, such as a game tooltip or a search description, uses the same label.

Alternatives: the game's black square and "???", which needs a second name for the same thing in text; a grey bar, which reads as a table that is still loading; the word alone, which breaks the name column in tables.

### Withheld rows load with left joins

Queries that inner-join a withheld target read it with a left join and pass `withheld`, and the page renders the placeholder where it would render the link. A quest's objective lists, its meta description and its map popup take the withheld rows.

### Loot rules emit a target for each withheld entry

`calculateMethodProbabilities` treats a withheld quest gate like a published one, so a withheld entry no longer makes the other chances unknown. For each withheld item of a kill pool it emits a result computed as if the item were needed, which is the page's assumption for quest items. Entries of one withheld item share a duplicate group, and the target names the group by its first entry's ordinal, because pool keys are opaque and the item's identity is gone. `contextualMonsterDrops` turns those results into placeholder rows with the chance and the Fatecharm chance. `ProbabilityTarget` gains the kind `withheld_item`, which every existing reader already skips because it selects `item` targets.

### Hidden recipes record their items before they go

Before the hidden-crafting redaction deletes a recipe, it writes one row per item the recipe makes and per item it consumes into `redacted_recipe_items` (`item_id`, `role`, `recipes`), counting recipes. The table refers to `items`, so the closure deletes the rows of items it removes, such as the three `ignore_journal` products whose recipes are also hidden. The item page reads the table: a `result` row shows Crafted from Recipe with the placeholder and counts as a known source, and a `material` row adds one placeholder row to Used in Recipes, with the count when it is above one and without amount or product. The table's title counts every recipe the placeholder stands for.

Alternatives: keeping the recipe as a method with withheld inputs and output. The product page then lists the amounts, and the material pages would have to withhold the product but not the material, which no existing flag expresses.

### Removed quests count where they met published content

Before the closure deletes a removed quest, `redactions/quests.py` counts the published NPCs that offer or complete it, the items its objectives and book requirements need, and the factions whose standing it requires, into `redacted_quest_npcs`, `redacted_quest_items` and `redacted_quest_factions`. A count whose NPC, item or faction the closure removes too goes in the reference scrub with it. The NPC page's two quest lists, an item's Required for Quests and a faction's Quests each add one placeholder row that the heading and the meta description count. The row shows no level, need, giver or standing, because those are the quest's own content, as a hidden recipe's amounts are.

Alternatives: withholding `npc_quest_memberships.quest_id` like the other references to removed content. The NPC page would keep each membership's order, but every reader of the table, the acquisition model among them, would have to skip memberships without a quest, and items and factions would still need counts.

### Portal keys

The map's portal query passes `required_item_withheld`, and the portal popup and tooltip show the placeholder as the key. No page shows the door to the Northern Halls today, because Temple of Valaark has no published positions.

## Risks / Trade-offs

- A placeholder row reveals that something exists and, for a drop, how often it drops. The redacted content stays unnamed, which is the line `ignore_journal` and the hidden recipes draw.
- The drop-chance parity corpus for Pocket Compendium keeps skipping monsters with a withheld entry, because the mod reads the real item and the corpus has no identity to match it with.
