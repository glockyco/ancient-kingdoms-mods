# Design

## Context

The game applies "Scaling UI" in `UISettings.SetScalingUI` by setting the `localScale` of 48 game windows listed in `UISettings.scalingUIRects`, among them the HUD, the Journal, the game's settings window and its tooltip. The slider runs from 0.8 to 1.2, its default is `GameManager.defaultscalingUI` (0.9), and the value is saved in the `scalingUI` player preference. The game's canvases scale with the screen's width (`CanvasScaler` match 0, or 1 on screens of aspect 2 or more). Pocket Compendium draws on three canvases of its own, markers, panels and windows, each with a `CanvasScaler` at 1920 by 1080 and match 0.5, and on a tooltip canvas that copies the scale factor of the game's tooltip canvas. Panel drags and resizes divide by `Overlay.PanelScale`. Mod elements inside game windows, such as the Bestiary additions and the map's layers, already scale with those windows.

## Goals / Non-Goals

**Goals:**

- The same size as the game's windows at every slider value and screen shape, and today's size at the default on 16:9 screens.

**Non-Goals:**

- A separate interface scale in Pocket Compendium's settings.
- Scaling world markers and edge arrows.

## Decisions

- **Read the applied scale, not the saved one.** The interface factor is the `localScale` of a window the game scales, read each frame, divided by the default 0.9. The slider's preview changes the windows before the value is saved, and reading the window follows both. The alternative, the `scalingUI` preference, lags the preview and misses `SetScalingUI` calls from other places such as character selection.
- **Match the game's canvas, then multiply.** The panels and windows canvases copy the reference resolution and match mode of the game's main canvas, then divide the reference resolution by the factor. One `CanvasScaler` change scales every panel, window and card uniformly, positions included. Setting each panel's `localScale` would fight `PanelHost`, which owns that value for its resize grip.
- **The tooltip copies the scaled window's scale.** The mod's tooltip canvas keeps copying the game's tooltip canvas factor, and the copied frame takes the `localScale` of the game's tooltip window each frame instead of the value it was cloned with.
- **Markers stay.** The markers canvas keeps its scaler, because world-anchored marks follow the game's world names, which the slider does not scale.
- **Drag math reads the canvas.** `Overlay.PanelScale` already reads the panels canvas's scale factor, so drags and resizes stay correct once the scaler includes the factor. Saved panel positions stay in canvas units and keep their place relative to the screen's anchors.

## Risks / Trade-offs

- [The game renames or drops a scaled window] → The factor falls back to 1, today's size, and the log names the missing window once.
- [A panel saved near a screen edge at a small scale can reach past the edge at a large one] → `PanelHost.KeepOnScreen` already moves an idle panel back until at least its header shows, on every update and without saving the moved position, so it covers a factor change too.
