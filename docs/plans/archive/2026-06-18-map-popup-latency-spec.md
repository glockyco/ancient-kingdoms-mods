---
title: "Map Popup Latency Spec"
type: spec
status: implemented
created: 2026-06-18
parent:
superseded_by:
archived: 2026-06-25
---

# Map Popup Latency Spec

## Problem

Clicking a map marker can feel delayed before the highlight and popup appear. Investigation found two separate costs:

- Primary selection delay: deck.gl routes `onClick` through mjolnir's `click` tap recognizer. deck.gl configures that recognizer to require `dblclick` failure, and mjolnir's default tap interval is 300 ms. Clean measurement on `/map?x=0&y=0&z=-0.50`: `pointerup` at about 20 ms, popup shell at about 331 ms.
- Secondary details delay: once the popup shell is selected, `EntityPopup` loads DB-backed details via `sql.js` on the main thread. The DB is 16.5 MB and details can take hundreds of milliseconds on slower hardware.

Observed timings:

- With deck.gl's default recognizer config: pointerup at about 20 ms; popup shell at about 331 ms.
- With `eventRecognizerOptions.click.interval = 1`: popup shell at about 28 ms.
- DB-backed details: normal local browser around 330 ms; 6x CPU throttle around 450-580 ms.
- Temporary instrumentation showed selection application and layer rebuild are not the dominant cost: `applySelection` was about 5-6 ms and `createLayers`/`setProps` about 3 ms under 6x CPU.

## Decision

Keep marker selection synchronous and configure deck.gl's click recognizer with a 1 ms interval so single-click selection no longer waits for the 300 ms double-click window. Keep double-click recognition enabled; the trade-off is that a double-click can also perform the first-click selection before zooming.

Also defer `EntityPopup` detail loading to a later macrotask using `setTimeout(0)`, not a single `requestAnimationFrame`, so the browser can paint the selected marker and popup shell before DB-backed work begins.

This preserves data ownership, URL behavior, layer construction, popup styling, and spinner styling.

## Non-goals

- Do not move `sql.js` into a Web Worker in this change.
- Do not prefetch details on hover.
- Do not cache popup details yet.
- Do not change popup styling or spinner styling.
- Do not remove double-click zoom in this change.

## Acceptance Criteria

- Selecting a marker still opens the popup and highlights the selected marker synchronously.
- Popup DB-backed details load in a later macrotask, allowing the shell/highlight paint first.
- Rapidly changing selection must not let stale detail requests populate the next popup.
- Unmounting/changing entity before the deferred load starts must cancel the scheduled work.
- Existing popup loading indicators remain unchanged.
- `pnpm --filter website check` and relevant tests pass.
- Clean browser smoke shows popup shell appears without the 300 ms double-click wait.

## Future Work

If detail loading still feels chunky on slower devices, move `sql.js` initialization and query execution into a Web Worker. That is the robust fix for the 16.5 MB parse and synchronous query stepping on the UI thread.
