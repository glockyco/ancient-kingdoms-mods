## 1. Shared numeric contract

- [x] 1.1 Make `website/src/lib/utils/format.ts:formatNumber` default to U+202F grouping with `.` decimals while preserving precision, trailing-zero and minus-sign behavior. Update its existing tests for default grouping of 1234567, -1234, zero and decimal values. Verify escaped Unicode expectations and unchanged rounding behavior.
- [x] 1.2 Replace the four route-local gold formatters in item detail, chest overview, chest detail and mechanics inventory with the shared formatter. Add one shared delegating gold helper only if repeated currency-specific behavior needs it. Verify existing `g`/gold labels, token names, bundle amounts and inventory's zero-price `Free` behavior remain intact. Remove the local functions rather than retaining wrappers.

## 2. Complete display migration

- [x] 2.1 Replace every bare numeric `toLocaleString()` in `website/src`, including shared table counts, map popups, route metadata and the duplicate numeric helpers in skill formatting and monster overview. Migrate all callers to the shared utility without compatibility re-exports. Verify a fresh search leaves no runtime-locale numeric display call and retain numeric sorting and filter inputs.
- [x] 2.2 Format raw numeric display values and hard-coded numeric prose across route families, tables, charts, summaries and accessible labels. Include item Max Stack 9999, Primal Essence's recipe quantities, input/output amounts, material/token amounts, XP and health. Review explicit comma separators and `grouping: false` display callers. Verify every quantity of at least 1000 uses U+202F without changing precision, compact units, prefixes, arithmetic, IDs or editable values.
- [x] 2.3 Change pipeline-added item-tooltip sell prices in `build-pipeline/src/compendium/denormalizers/items/tooltips.py` from ordinary spaces to U+202F. Add a focused sell-price assertion for 12345 that checks the exact separator, then regenerate the affected data through the normal pipeline. Verify the tooltip and site price both contain the same grouped digits without rewriting quoted game text.

## 3. Regression verification and current fixtures

- [x] 3.1 Update existing numeric expectations affected by the default, including `website/src/lib/stats.test.ts`'s health value, and run focused formatter, stats, skill and affected mechanics tests. Add tests only for plausible regressions in separator, precision, sign or display-boundary behavior, not a new database-wide suite.
- [x] 3.2 Review current mechanics fixtures for comma-grouped or raw quantities and update their expected numeric strings to U+202F, leaving calculated values unchanged. `scripts/snapshot-mechanics.mjs` and literal prose snapshots are absent, and CONTRIBUTING.md excludes them as a correctness gate. Do not recreate that workflow. If it has been restored by implementation time, use its actual update command, review the separator-only snapshot changes and run its comparison normally.
- [x] 3.3 Run the website checks, lint and full build after the migration, then inspect static HTML and the browser at 1440x900 and 390x844 in both themes. Use a decimal-comma browser locale and verify second-page table rows, sorting, filtering, item Max Stack and recipe amounts, monster health/XP, item and NPC prices, inventory costs and one fractional calculator result. Confirm U+202F digits remain together without clipping and numeric sorting remains numeric.
- [x] 3.4 Run `openspec validate unify-number-formatting --strict` and verify the completed behavior against each numeric-display scenario.

## Verification results

- Website regression tests: 110 files and 1414 tests passed. Svelte check reported no errors or warnings. ESLint passed for the migrated files.
- Pipeline checks: Ruff passed. Pytest passed 609 tests and 100 subtests. The normal database rebuild regenerated sell-price tooltips, and Cinderchant Chestplate displayed `2\u202F500` in both its tooltip and site price.
- Browser checks used the `de-DE` number locale at 1440x900 and 390x844 in light and dark themes. Across 28 route and layout combinations, grouped-digit text ranges never crossed lines and document widths stayed within the viewport. Checks covered item Max Stack, recipe amounts, vendor and item prices, monster health and XP, quest XP and inventory costs.
- Four second-page table checks retained `600\u202F000` for Xyzzith the Decayed. Numeric sorting and search filtering remained functional. Four calculator checks retained editable input `1234` and displayed `1\u202F357` with a `5.5%` result.
- The full website build and deployment-asset checks passed. After preserving separators in search normalization, the normal search-index/compression scripts and production prerender passed again. Static HTML for six representative routes contained the expected U+202F values.
