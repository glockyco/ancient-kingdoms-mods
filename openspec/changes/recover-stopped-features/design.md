# Design

## Context

`FeatureRegistry` wraps each feature's `Enable`, `Update` and scene unload in a guard. On an exception it calls `Feature.Fail`, which sets `Failed`, and `Stop`, which logs the error, raises `StoppedAfterError` and calls `Disable`. The registry keeps a feature enabled while `Switch.Value && !Failed`, and nothing clears `Failed`, so a stopped feature stays off until the game restarts. `PocketCompendiumMod` queues each stop and shows it with `Player.ShowImportantMessage`, which draws the message band and adds the chat line. The settings window draws a stopped row with a red line and a disabled switch. The About page's Report gathers the setup facts, copies the details and opens the problem form. Panels are `PanelHost` instances with saved positions, locks and a shared Reset.

## Goals / Non-Goals

**Goals:**

- One card per stop that stays until closed, whose place the player sets.
- Turning a feature on again without a restart.

**Non-Goals:**

- Retrying a stopped feature automatically.
- Showing which error stopped it on the card. The report carries the error.

## Decisions

- **A stop clears with the switch.** "Turn on again" and switching the row on both clear `Failed` and `Failure`, and the registry's next update enables the feature, because `Stop` already ran `Disable` and patches pass through while their feature is off. A feature whose `Disable` itself threw stays failed, because its state is unknown.
- **One card per stop.** The registry raises `StoppedAfterError` on every stop, and the card shows for each, so a feature that stops again after the player turned it on shows a new card. The alternative, once per session, would hide a second stop of a feature the player had just turned on.
- **The card is a panel.** The card lives on the panels canvas through `PanelHost`, so it gets dragging, a saved position, the lock, "Lock all panels" and Reset without new code, and it follows the interface scale with the other panels. Several stops stack in one card's place, newest on top, each with its own buttons.
- **One report action.** The About page's report action becomes shared, so the card's Report, the row's Report and the About page's Report gather the same details and open the same form.
- **The example is the card.** "Show example" draws the same card in its gold look with one Done button and the example texts, so its size and place are the real card's.

## Risks / Trade-offs

- [A feature that throws at once after "Turn on again" shows another card] → That is the intended notice. The card shows once per stop, and a stop needs the player's click, so cards cannot loop on their own.
- [The settings window's row and the card can both offer Report for the same stop] → Both take the same action, and the row keeps it after the card is closed.
