## Why

The website has a visual authority in `website/DESIGN.md`, but several live surfaces render text too small to read and state text with weak contrast. Repeated raw colors and locally rebuilt controls also let routes drift from the shared roles.

## What Changes

- Add a minimum rendered-text size and contrast rule to `website/DESIGN.md`. Repair charts, formulas, chips, controls, and state labels on the affected routes before broader consolidation.
- Reconcile declared link and achievement colors with `website/src/app.css`. Use semantic tokens for ordinary reference links and state text while retaining documented game, chart, map, and quality colors.
- Migrate demonstrated duplicate links, badges, buttons, fields, tables, and containers to existing primitives where their semantics match. Keep dense tables, formulas, and map layouts specialized.
- Consolidate duplicated color-conversion, NPC-role color, and map-drop presentation rules at their existing ownership boundaries.
- Add focused, repeatable checks for measurable drift. Review each changed page in light and dark mode at desktop and phone sizes, including keyboard, overflow, and no-JavaScript states.
- Keep combat-simulator migration independent: an owner decision may replace that route before this work lands.

## Capabilities

### New Capabilities

- `website-design-system`: Readable, theme-aware reference surfaces with shared semantic presentation and explicit exceptions for specialized content.

### Modified Capabilities

None. Existing map, profession, mechanics, and entity requirements remain in force.

## Impact

`website/DESIGN.md`, `website/src/app.css`, affected Svelte routes and components, existing UI primitives, and focused website checks. This change does not rebrand the site, create a token generator or workshop, alter game formulas, or replace static content with client-only rendering.
