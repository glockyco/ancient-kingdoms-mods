# Tasks

## 1. Marks

- [ ] 1.1 Add the "Augment marks" feature in `Features/AugmentMarks/`, on by default, with the sentence "Marks each item that has an augment with the augment's icon.", and register it in the Combat group after Fatecharms
- [ ] 1.2 Resolve a slot's augment only when its item is equipment and its name resolves to an `AugmentItem`
- [ ] 1.3 Draw the augment's icon in a quality-coloured frame in the top-right corner of each slot, one reused mark per slot, redrawn when the slot's augment changes
- [ ] 1.4 Cover the inventory, the equipment slots, the combined backpack, the bank and the house chest, checking in the running game that each window's `dragAndDropable.name` gives the slot's index
- [ ] 1.5 Remove the marks on Disable and clear the cache on scene unload

## 2. Documentation

- [ ] 2.1 Add the feature to `mods/PocketCompendium/README.md`

## 3. Verification

- [ ] 3.1 Build and deploy the mods, and check on the scratch save with HomeArt's augmented gear: marks and frame colours in all five places, a pet follower with a name shows no mark, moving an item to the bank moves its mark, removing an augment removes its mark, and switching the feature off removes every mark
- [ ] 3.2 Run the Pocket Compendium tests, the mods' build and strict OpenSpec validation
