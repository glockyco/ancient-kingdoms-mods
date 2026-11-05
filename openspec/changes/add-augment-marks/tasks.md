# Tasks

## 1. Marks

- [x] 1.1 Add the "Augment marks" feature in `Features/AugmentMarks/`, on by default, with the sentence "Marks each item that has an augment with the augment's icon.", and register it in the Combat group after Fatecharms
- [x] 1.2 Resolve a slot's augment only when its item is equipment and its name resolves to an `AugmentItem`
- [x] 1.3 Draw the augment's icon in a quality-coloured frame in the top-right corner of each slot, one reused mark per slot, redrawn when the slot's augment changes
- [x] 1.4 Cover the inventory, the equipment slots, the combined backpack, the bank and the house chest, checking in the running game that each window's `dragAndDropable.name` gives the slot's index, and counting a slot only while it draws that item's icon, because the backpack keeps old names on unused slots
- [x] 1.5 Remove the marks on Disable and clear the cache on scene unload

## 2. Documentation

- [x] 2.1 Add the feature to `mods/PocketCompendium/README.md`

## 3. Verification

- [x] 3.1 Build and deploy the mods, and check on the scratch save with HomeArt's augmented gear: marks and frame colours in all five places, a non-equipment item whose name field holds an augment's name shows no mark, moving items to the bank, the chest and the backpack moves their marks, switching bank tabs moves the marks with the items, removing an augment removes its mark, and switching the feature off removes every mark
- [x] 3.2 Run the Pocket Compendium tests, the mods' build and strict OpenSpec validation
