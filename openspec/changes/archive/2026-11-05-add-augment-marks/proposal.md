# Proposal

## Why

The game names an item's augment only in its tooltip, so a player who wants to know which gear carries which augment has to hover over every piece in their bags, bank and chest. A mark on the slot answers that at a glance.

## What Changes

- A new feature, "Augment marks", draws the augment's icon in a small frame in the top-right corner of every item slot whose item has an augment. The frame takes the augment's quality colour, as the game colours items: green Uncommon for Small augments, blue Magic for plain ones, purple Epic for Great ones.
- The marks show in the inventory window, with its equipment slots, in the combined backpack, the bank and the house chest.
- The feature's settings row sits on the Combat page beside Fatecharms, on by default, and reads "Augment marks", "Marks each item that has an augment with the augment's icon."

## Capabilities

### New Capabilities

- `item-augment-marks`: which item slots show an augment mark, what the mark shows and when it changes.

### Modified Capabilities

- `mod-settings-layout`: the Combat group gains augment marks.

## Impact

- New feature under `mods/PocketCompendium/Features/AugmentMarks/`, registered in `PocketCompendiumMod.cs` in the Combat group.
- Reads the game's `ItemSlot.augmentName`, `AugmentItem` data and the slot views of `UIInventory`, `UIEquipment`, `UIBigBackpack`, `UIBank` and `UIChest`. It changes no game data.
- `mods/PocketCompendium/README.md` gains the feature.
