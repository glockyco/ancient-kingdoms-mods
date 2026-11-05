# Proposal

## Why

The compendium removes items the game flags `ignore_journal`, recipes the developers asked to keep out, and content tied to excluded quests. Where published content refers to them, pages either drop the entry or label it "Unpublished". A player on Discord asked for the drop chance of Sanctified Reliquary, the final Cleric epic trophy: its quest page lists no objective, Lord Vaelric's loot table omits the drop and shows "-" for every other chance, and the Game Tooltip says "Unpublished item (0/1)" under a sentence that names the item. Five Draconium armor pieces claim "No known source" although players craft them, and two players asked about that on Steam. A dropped entry reads as missing data, and "Unpublished" reads as content that is still to come rather than content left out on purpose.

## What Changes

- Every entry that refers to redacted content stays on the page as a placeholder: a dashed empty icon slot and the grey label "Redacted item", "Redacted monster", "Redacted recipe" and so on, with the hover text "Left out of the compendium at the developers' request." The label replaces every "Unpublished" label on the site and in game tooltips.
- A quest lists a redacted objective with its kind and amount, in its Objectives, its search description and its map popup.
- A monster's loot table lists a redacted drop with its chance, and a redacted drop no longer makes the monster's other chances unknown.
- An item whose recipe is redacted says it is crafted from a redacted recipe, and its mold and materials say they are used in a redacted recipe, without the product or the amounts.
- A portal whose key is redacted states that it needs a redacted item.
- A quest the configuration leaves out stays as a placeholder on the NPC that offers and completes it, the items it needs and the faction whose standing it requires, without its level, needs or standing. Vaerion Shadeborn's page lists two redacted quests instead of a Quest Giver role with no quests.
- The redacted content itself stays unpublished: no name, icon, page or identifier.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `compendium-redaction`: references to redacted content stay visible as placeholders that name the kind of content, and a redacted drop keeps its own chance without hiding the others.

## Impact

- `build-pipeline`: quest tooltips use the new label, the hidden-crafting redaction records which items a redacted recipe makes and uses before it removes the recipe, and the closure counts where a removed quest met published content before it removes the quest.
- `website`: a shared placeholder component, the quest, monster, item, NPC, faction and map pages, the probability rules for loot pools, and every "Unpublished" label.
- `redactions.toml` comments that describe what the build publishes.
