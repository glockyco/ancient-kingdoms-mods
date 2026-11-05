# Tasks

## 1. Drop counts

- [ ] 1.1 Expose the found and total counts of the drops a monster's Bestiary page shows from the code that builds the page's loot, so the bar and the page share one list
- [ ] 1.2 Cache the counts per monster and rebuild them when the game's record of found drops changes or the list is shown again
- [ ] 1.3 Add tests for the counts: one entry per item, Forgotten Altar variants counted, items the page hides left out

## 2. Drops found

- [ ] 2.1 Add the "Drops found" feature to the Bestiary group, on at first start, with the sentence "Shows a bar on each monster in the Bestiary that fills as you find its drops."
- [ ] 2.2 Draw the bar along the top edge of each tile's portrait, filled by the share found, gold once all are found, and none for a monster with nothing found, rebuilt per place in the list as the countdown's overlay is
- [ ] 2.3 Register a hover on each tile's button in the game's tooltip look: the name, then "2 of 5 drops found" or "All 4 drops found", and no hover for an undiscovered monster while "Undiscovered monsters" is off
- [ ] 2.4 Remove the bars and the hovers when the feature is switched off

## 3. Undiscovered tiles

- [ ] 3.1 Add a Harmony postfix on `UIJournal.Update` for Bestiary pages that colours an undiscovered monster's tile with `UIJournal.itemDiscoveredColor` while "Undiscovered monsters" is on
- [ ] 3.2 Report a failure in the postfix through Bestiary pages' failure path

## 4. Verification

- [ ] 4.1 Build and deploy the mods, and check in the running game on the scratch save: the bar and its gold, both hovers with the mouse and with a gamepad, grey undiscovered tiles with the setting on and black ones with it off, and the bars gone with "Drops found" off
- [ ] 4.2 Run the Pocket Compendium tests and the mods' build
