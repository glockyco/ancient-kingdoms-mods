## Why

The site uses commas, narrow spaces, runtime-locale separators and ungrouped quantities for the same kinds of numbers. One formatting policy will make prices, counts, XP and health consistent between prerendered pages and browser-rendered rows.

## What Changes

- Group every player-facing numeric quantity with U+202F narrow no-break spaces and retain `.` as the decimal separator, independent of build-machine or visitor locale.
- Make the existing shared `formatNumber` use this grouping by default. Preserve each caller's meaningful precision, signs, units and numeric value.
- Remove route-local gold formatters and bare numeric `toLocaleString()` calls. Use one shared gold formatter only if currency-specific behavior needs it.
- Format currently raw quantities, including item Max Stack and recipe amounts, plus hard-coded numeric prose and tables. Keep IDs, URLs, dates and editable numeric values outside display formatting.
- Align pipeline-generated tooltip sell prices with the same separator. Update focused formatting expectations and any applicable mechanics fixtures without recreating the removed literal-prose snapshot workflow.

## Capabilities

### New Capabilities

- `number-formatting`: One locale-independent display contract for numeric quantities across website surfaces and generated item tooltips. The flat capability path follows the existing `openspec/specs/` organization.

### Modified Capabilities

None. Existing calculation, quantity-meaning and typography contracts remain unchanged.

## Impact

`website/src/lib/utils/format.ts` and its existing tests, numeric consumers across routes, shared tables, map popups, skill formatting and server summaries, and the pipeline tooltip sell-price renderer. The design-system change owns shared price-cell layout and numeric alignment. This change owns their number strings. No game rules, database numeric schema, sorting semantics or user-selectable locale setting change.
