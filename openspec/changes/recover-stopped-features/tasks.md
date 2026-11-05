# Tasks

## 1. Turning a feature on again

- [ ] 1.1 Let a stop clear: a method on `Feature` clears `Failed` and `Failure`, and the registry enables the feature on its next update, except a feature whose `Disable` threw
- [ ] 1.2 Draw a stopped feature's settings row as "Stopped after an error." with a Report button, and let its switch turn the feature on again
- [ ] 1.3 Add tests for the registry: a stop disables the feature, clearing it enables it again, and a second stop raises a second notice

## 2. Report

- [ ] 2.1 Move the About page's report action into a shared place used by the About page, the card and the settings row

## 3. The card

- [ ] 3.1 Add the notice card on the panels canvas through `PanelHost`, first placed bottom left above the chat: the feature's title with "stopped", "An error turned it off.", Report, "Turn on again" and a close cross
- [ ] 3.2 Show a card for each stop instead of the message band and the chat line, stacking several stops in the card's place, newest on top
- [ ] 3.3 Add the General page's "Notices" row with "Show example" and its help, and draw the example card in the gold look with "Example: notices show here", "Drag this card where you want it." and Done
- [ ] 3.4 Include the card in "Lock all panels" and the panels' Reset

## 4. Documentation

- [ ] 4.1 Update `mods/PocketCompendium/README.md` and the changelog where they describe what happens when a feature stops

## 5. Verification

- [ ] 5.1 Build and deploy the mods, stop World markers in the running game on the scratch save, and check the card, its Report, "Turn on again", the row's Report and switch, a second stop's card, the example card, dragging, the lock and Reset
- [ ] 5.2 Run the Pocket Compendium tests and the mods' build
