# Tasks

## 1. Turning a feature on again

- [x] 1.1 Let a stop clear: a method on `Feature` clears `Failed` and `Failure`, and the registry enables the feature on its next update, except a feature whose `Disable` threw
- [x] 1.2 Draw a stopped feature's settings row as "Stopped after an error." with a Report button, and let its switch turn the feature on again
- [x] 1.3 Check the registry in the running game, because `Feature` needs MelonLoader's preferences, which the test project doesn't load: a stop disables the feature and raises one notice however many errors led to it, turning it on enables it again, and a stop after that raises a second notice

## 2. Report

- [x] 2.1 Move the About page's report action into a shared place used by the About page, the card and the settings row

## 3. The card

- [x] 3.1 Add the notice card on the panels canvas through `PanelHost`, first placed bottom left above the chat: the feature's title with "stopped", "An error turned it off.", Report, "Turn on again" and a close cross
- [x] 3.2 Show a card for each stop instead of the message band and the chat line, stacking several stops in the card's place, newest on top
- [x] 3.3 Add the General page's "Notices" row with "Show example" and its help, and draw the example card in the gold look with "Example: notices show here", "Drag this card where you want it." and Done
- [x] 3.4 Include the card in "Lock all panels" and the panels' Reset

## 4. Documentation

- [x] 4.1 Update `mods/PocketCompendium/README.md` where it describes what happens when a feature stops, and leave the changelog line to the release that ships the card, as every release writes its own lines

## 5. Verification

- [x] 5.1 Build and deploy the mods, stop World markers in the running game on the scratch save, and check the card, its Report, "Turn on again", the row's Report and switch, a second stop's card, the example card, dragging, the lock and Reset
- [x] 5.2 Run the Pocket Compendium tests and the mods' build
