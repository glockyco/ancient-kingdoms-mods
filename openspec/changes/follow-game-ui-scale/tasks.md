# Tasks

## 1. Interface factor

- [ ] 1.1 Read the game's applied interface factor each frame from a window in `UISettings.scalingUIRects`, divided by `GameManager.defaultscalingUI`, falling back to 1 and logging once when no scaled window exists
- [ ] 1.2 Give the panels and windows canvases the game main canvas's reference resolution and match mode, divided by the factor, and leave the markers canvas as it is
- [ ] 1.3 Make the mod's tooltip frame take the `localScale` of the game's tooltip window each frame

## 2. Panels

- [ ] 2.1 Keep each panel inside the visible canvas when the factor changes, without saving the clamped position
- [ ] 2.2 Check that drags and resizes still follow the pointer at the slider's ends

## 3. Verification

- [ ] 3.1 Build and deploy the mods, and check in the running game on the scratch save at the slider's default, 0.8 and 1.2: the boss list, the settings window, a start-screen card and a hover keep their proportion to the game's windows, world markers keep their size, and the slider's preview resizes them live
- [ ] 3.2 Check the default at a 1920 by 1080 window against a screenshot from before the change
- [ ] 3.3 Run the Pocket Compendium tests and the mods' build
