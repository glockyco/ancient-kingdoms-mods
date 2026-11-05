# Proposal

## Why

The game's "Scaling UI" slider resizes its windows, HUD and tooltips, but Pocket Compendium's panels, settings window, start-screen cards and hovers keep their size. A player who enlarges the game's interface gets small mod panels beside large game windows. The mod also sizes its canvases between the screen's width and height while the game uses its width, so on screens that are not 16:9 the mod is a different size from the game at every slider value.

## What Changes

- Pocket Compendium's panels, windows, start-screen cards and hovers follow the game's "Scaling UI" slider live, including its preview while the slider moves, and take the game's own canvas scale.
- At the slider's default, they keep today's size on 16:9 screens.
- World markers and edge arrows keep their size, as the game's names over characters do.
- A panel's own resize grip keeps working on top of the slider.

## Capabilities

### New Capabilities

### Modified Capabilities

- `mod-settings-layout`: Pocket Compendium's interface follows the game's interface scale.

## Impact

- Pocket Compendium's overlay canvases, its tooltip, and the panel drag and resize math that converts screen pixels to canvas units.
