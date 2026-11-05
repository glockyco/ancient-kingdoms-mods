# Design

## Context

`ItemSlot.augmentName` holds one augment's item name per slot. The same field holds a friendly pet's name for pet follower items and belonging metadata for virtue belongings, so the name counts as an augment only when `GameManager.cacheItems` resolves it to an `AugmentItem` and the slot's item is equipment. The game's windows redraw their slots every frame in their own `Update` and never draw an augment.

The windows and their slot views:

| Window | Slot view | Item list |
| --- | --- | --- |
| Inventory | `UIInventory.content` children, `UIInventorySlot` | `inventory.slots` |
| Equipment, in the inventory window | `UIEquipment.GetEquipmentSlot(i)`, `UIEquipmentSlot` | `equipment.slots` |
| Combined backpack | `UIBigBackpack.content` children, `UIInventorySlot` | `inventory.slots`, through a private content-to-inventory map |
| Bank | `UIBank.content` children, `UIBankSlot` | `bank.slots` |
| House chest | `UIChest.content` children, `UIChestSlot` | `chestHouse.slots` |

## Decisions

- The feature runs in its `Update`, like Drops found, and draws only for windows whose panel is active. A Harmony postfix on each window's `Update` would run in the same frame but ties the feature to five game methods instead of reading state.
- A slot's item index comes from its `dragAndDropable.name`, which each window sets to the slot's index in its item list so dragging knows the source. This also covers the combined backpack without reading its private map. Implementation checks this per window in the running game, and falls back to the window's own map where a window doesn't set it.
- Each slot keeps one mark object, created on first need and reused. It is redrawn only when the slot's augment name changes, and hidden when the slot shows no augment. Marks are children of the slot's icon parent, so they move, scale and hide with the slot.
- The mark is the augment's sprite, `ScriptableItem.image`, inside a rounded frame tinted with the game's quality colour for the augment's quality and a dark backing, as drafted in `.local/changes/augment-marks/review.md`. Quality colours come from the game's own colour for each quality where it exposes one, otherwise from the item name colours its tooltips use.
- Disable destroys every mark. A scene unload clears the slot cache, as the windows go with the World scene.
- Failures go through the feature's failure path, so an error stops augment marks alone.

## Risks

- A window that reuses slot objects for different indices, such as a paged bank, would show a stale mark for one frame. Redrawing on a change of name, read every frame, bounds this to that frame.
- Game updates that rename the slot fields break the feature, which then stops with a notice instead of breaking the windows.
