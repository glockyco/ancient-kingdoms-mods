# Proposal

## Why

When a feature stops after an error, a line flashes in the middle of the screen for a few seconds and lands in the chat, and the feature's switch greys out until the game restarts. A player who misses the line can't tell what happened, the line points to a page instead of offering the report, and nothing turns the feature on again in the session.

## What Changes

- A stopped feature shows a card that stays until the player closes it, titled with the feature, such as "World markers stopped", over "An error turned it off.", with a Report button and a "Turn on again" button. It replaces the line in the middle of the screen, and the chat gets no line.
- The card appears bottom left above the chat, on the same side as the start screen's update card. It moves like a panel, keeps its place, follows "Lock all panels" and returns to its default place with the panels' Reset.
- The General page gets a "Notices" row with a "Show example" button and the help "Shows an example card so you can move it where you want it." The example card reads "Example: notices show here" over "Drag this card where you want it." in the gold look, with one Done button.
- The feature's settings row reads "Stopped after an error." with a Report button, and its switch works again: switching it on turns the feature on again.
- **BREAKING**: the stop notice shows every time a feature stops, instead of once per session, because a feature can now stop again after it is turned on again.

## Capabilities

### New Capabilities

### Modified Capabilities

- `mod-feedback`: how a stopped feature makes itself known, and the report it offers.
- `mod-settings-layout`: a stopped feature can be turned on again, and the example card's row.

## Impact

- Pocket Compendium's feature registry, its stop notice, the settings window's feature rows and General page, the panel host, and the report action that the About page uses.
