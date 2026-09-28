## Context

The map container creates one deck.gl viewport with `controller: { inertia: false }` (`website/src/routes/map/+page.svelte:970-1001`). Its current key handler listens on the window but handles only search and Escape (`website/src/routes/map/+page.svelte:650-660,1147`). The map container has no name or tab stop (`website/src/routes/map/+page.svelte:1157-1164`). `INITIAL_VIEW_STATE` limits zoom to -3 through 4, while bounds fitting stops at 2 (`website/src/lib/map/config.ts:26-36,158-166`). The current tile range ends at 3 (`website/src/lib/map/config.ts:16-21`), and the existing navigation spec allows enlargement at 4 (`openspec/specs/interactive-map-navigation/spec.md:9-28`).

## Goals / Non-Goals

**Goals:** Give button, keyboard, mouse, and touch users one consistent camera range and synchronized share URL.

**Non-Goals:** Change tile generation, bounds-fitting cap, map entity selection, search keyboard shortcuts, or the mouse/touch pan model.

## Decisions

1. Place native buttons over the map outside deck.gl's canvas, with accessible names Zoom in and Zoom out. Show them on desktop and mobile, disable a button at its zoom endpoint, and hide or disable both until the map is ready. Native buttons supply keyboard activation without inventing a custom button role. Keep touch targets comfortably usable.
2. Give the actual map container `role="region"`, a clear accessible name, a focus indicator, and a tab stop. Attach zoom and pan handlers to the focused region rather than to the existing window handler. This avoids intercepting keys while readers use search, filters, links, or a popup. Keep Cmd/Ctrl+K and Escape in the window handler.
3. Route button and keyboard changes through the same deck viewport transition used for pointer movement, then let `onViewStateChange` update `currentViewState` and the debounced URL (`website/src/routes/map/+page.svelte:282-304,987-1000`). Preserve the current center for zoom. Clamp to `INITIAL_VIEW_STATE.minZoom` and `.maxZoom`, not `FLY_TO_CONFIG.maxZoom`: the latter limits automatic bounds fitting, not manual zoom. An arrow moves a fixed screen-space distance at the current zoom and stops on key release. Deck X is game X, and deck Y is negative game Z (`rule://interactive-map`); moving right and down increases deck X and Y.
4. Treat Plus, Equal, and Minus as keyboard zoom inputs. Handle unmodified arrow keys only when the map region itself has focus; call `preventDefault()` for handled keys to avoid simultaneous page scrolling. Do not add a global arrow handler or a second camera state store. Reuse the viewport's actual state if an animation or a rapid sequence of inputs is in flight.

## Risks / Trade-offs

- [An overlay blocks the sidebar or a popup] → Check layout and hit targets at 1440×900 and 390×844, including an open mobile drawer.
- [Button state drifts from actual zoom during a transition] → Derive endpoint availability from camera updates and compare rapid inputs to pointer zoom at both limits.
- [A keyboard handler captures typing or scroll] → Scope it to the focused region, not the window or its child inputs; test search and popup focus separately.

## Migration Plan

This adds controls without changing saved URLs or map data. Removing the region handler and overlay controls restores prior pointer behavior.
