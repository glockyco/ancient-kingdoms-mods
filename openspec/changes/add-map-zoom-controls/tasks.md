## 1. Viewport Controls

- [ ] 1.1 Add Zoom in and Zoom out buttons to `website/src/routes/map/+page.svelte`. Apply camera updates through the existing viewport path; verify both preserve center and selection, and stop at zoom -3 and 4.
- [ ] 1.2 Give the map container a named, focusable region and visible keyboard focus. Verify the browser accessibility tree exposes the region and Tab reaches it.
- [ ] 1.3 Add focused-region Plus/Equal, Minus, and arrow-key navigation without changing global search or Escape handling. Verify pan ends when input ends and viewport URLs update; typing in search and popup controls does not move the map.

## 2. Verification

- [ ] 2.1 Exercise both zoom endpoints and rapid successive inputs in the actual map. Verify buttons disable at endpoints, keyboard input clamps, and viewport state remains consistent with wheel and touch zoom.
- [ ] 2.2 Inspect and use the controls at 1440×900 and 390×844 with a map popup or mobile drawer open. Verify accessible names, touch targets, focus ring, and absence of overlap with other controls.
