# Tasks

## 1. Interface factor

- [x] 1.1 Read the game's applied interface factor each frame from a window in `UISettings.scalingUIRects`, divided by `GameManager.defaultscalingUI`, falling back to 1 and logging once when no scaled window exists
- [x] 1.2 Give the panels and windows canvases the game main canvas's reference resolution and match mode, divided by the factor, and leave the markers canvas as it is
- [x] 1.3 Make the mod's tooltip frame take the `localScale` of the game's tooltip window each frame

## 2. Panels

- [x] 2.1 Check that drags still follow the pointer at the slider's top end, where resizes share the drag's conversion from screen pixels, and that a panel near an edge stays reachable after the factor grows

## 3. Verification

- [x] 3.1 Build and deploy the mods, and check in the running game on the scratch save at the slider's default, 0.8 and 1.2: the boss list, the settings window and a hover keep their proportion to the game's windows, the windows canvas follows the game's canvas on the start screen, world markers keep their size, and the slider's preview resizes them live
- [x] 3.2 Check that the default at a 1920 by 1080 window keeps the earlier size: there the game's match of 0 and the earlier match of 0.5 both give a canvas scale of 1, and the factor is 1
- [x] 3.3 Run the Pocket Compendium tests and the mods' build
