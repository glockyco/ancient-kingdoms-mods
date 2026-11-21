# Tasks

## 1. Marks

- [x] 1.1 Cut each augment icon to its visible pixels once per session through a GPU copy, and keep the game's sprite when the icon has no padding
- [x] 1.2 Size the mark as 22 of an inventory slot's 58 units, scaling with the slot
- [x] 1.3 Mark the equipment window of a mercenary or an inspected player
- [x] 1.4 Mark both offers of a player trade
- [x] 1.5 Mark the Augmenter's list and a merchant's sell, buyback, repair and essence lists by rebuilding each list in the game's order
- [x] 1.6 Mark the Sacrifice shrine's item list and offerings
- [x] 1.7 Mark items on the skillbar, resolved as the skillbar resolves them

## 2. Documentation

- [x] 2.1 Name the new windows in `mods/PocketCompendium/README.md`

## 3. Verification

- [x] 3.1 Build and deploy, and check on the scratch save every kind and quality in the bags, and Mana Shard marks in the inventory, equipment, combined backpack, bank, mercenary window, Augmenter, sell, buyback, repair and essence lists and the skillbar
- [ ] 3.3 Check the Sacrifice shrine's lists, which the scratch save could not open
- [x] 3.2 Run the Pocket Compendium tests and strict OpenSpec validation

The inspect window and both trade offers need a second player, and they are not checked in the game. Their marks share the slot code that 3.1 checked.
