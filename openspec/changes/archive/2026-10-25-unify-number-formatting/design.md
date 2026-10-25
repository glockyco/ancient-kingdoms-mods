## Context

`website/src/lib/utils/format.ts:formatNumber` formats with explicit `en-US`, defaults `groupSeparator` to `,`, replaces commas with that separator and uses a true minus sign. Its precision, trailing-zero and grouping options already have focused coverage in `format.test.ts`. It has consumers throughout routes, stats, calculations and server-generated copy, so changing the default reaches more than the directly visible examples.

Three route-local `formatGold` copies insert U+202F in item detail, chest overview and chest detail. A fourth gold formatter on `/mechanics/inventory` instead calls bare `toLocaleString()` and renders zero as `Free`. Commit `90d9d25a` deliberately introduced narrow-space gold grouping. The planning inventory finds 74 bare calls in 24 Svelte files, including shared table result counts, map popups, monster health and XP, NPC fees and metadata. There is another bare numeric helper in `website/src/lib/skills/skill-format.ts`. Counts are a planning snapshot, not a fixed migration boundary.

By JavaScript semantics, a number's `toLocaleString()` without a locale uses the runtime default locale. Prerendered HTML therefore uses the build runtime's locale and later browser-rendered rows use the visitor runtime's locale. This is a consequence of the API, not an observed mismatch in a browser session.

Item Max Stack renders its raw numeric field. Recipe detail renders raw `mat.amount` and output amounts, and item relationship tables also contain raw material amounts. Mechanics pages have hard-coded comma-grouped prices and reputation thresholds alongside shared formatting. The audit examples include Max Stack 9999 and recipe quantities such as x3000 on Primal Essence.

The game has no single culture-independent number format. Its `Utils.nfi` comes from the player's current system culture. This change adopts the owner's site convention rather than claiming to reproduce every player's in-game separators.

<!-- Source: server-scripts/Utils.cs:nfi — the game's number format information comes from CultureInfo.CurrentCulture.NumberFormat. -->

The pipeline's `denormalizers/items/tooltips.py:_parse_tooltip` currently formats sell prices with Python comma grouping and replaces commas with ordinary U+0020 spaces. This agrees visually with space grouping, but not with the proposed exact U+202F code point.

## Goals / Non-Goals

Goals: Give every player-facing numeric quantity the same grouping and decimal convention at initial render and after interaction. Preserve existing precision, signs, units, values and numeric operations.

Non-goals: No locale selector, calculation changes, database numeric-schema migration, generic localization framework or table redesign. Do not format IDs, URLs, dates, versions, citations or editable control values. The design-system change owns price-cell layout, focus, typography and alignment.

## Decisions

### Extend the existing formatter instead of adding a parallel number API

Make U+202F the default `groupSeparator` in `formatNumber` while retaining explicit `en-US`, decimal precision, trailing-zero and sign handling. Keep `.` for decimal fractions. Displayed quantities use grouping even where old callers disabled it. Review those callers individually so compact units and fractional precision remain unchanged. Grouping options can remain available to genuine non-display uses, but ordinary player-facing quantities must not opt back into commas or ungrouped thousands.

Use `formatNumber` directly for gold when the only difference is a suffix outside the number. If `Free` or another repeated currency policy justifies a gold-specific helper, keep one shared helper beside `formatNumber` and have it delegate digit formatting. Remove all four route-local gold functions either way. Do not embed currency names, token links or bundle markup into the numeric formatter.

### Migrate all display boundaries without changing raw data

Replace bare numeric `toLocaleString()` throughout routes and shared components, and replace the duplicate numeric helper in `lib/skills/skill-format.ts` through direct shared imports at its callers rather than a compatibility re-export. The monster overview also defines a local `formatNumber` and must adopt the shared utility.

Audit raw interpolations, default numeric DataTable cells and hard-coded prose, not only existing formatting calls. Include Max Stack, recipe input/output quantities, item material and token amounts, XP, health, faction values, chart labels, counts, table status text, accessible descriptions and server metadata. Keep suffixes and prefixes such as `g`, `gold`, `x`, health units and bundle wording outside the formatter. A quantity below 1000 should not acquire unnecessary punctuation.

Leave numeric sorting/accessors, filters, calculations and input bindings numeric. Format at the rendering or text-generation boundary. Do not parse the resulting narrow-space strings back into numbers. Preserve compact displays such as K/M labels and meaningful fractional values.

Update the pipeline tooltip sell-price rendering to U+202F too. This small display-only pipeline change makes the exact separator match the website instead of leaving ordinary spaces as a hidden exception. Rebuild generated outputs through the normal pipeline rather than hand-editing the database.

### Verify specific regressions rather than freezing all prose

Update the existing `formatNumber` tests to assert default U+202F grouping, negatives, zero, fractions, precision and trailing-zero behavior. Keep a focused override/non-display case if that API remains. Update `website/src/lib/stats.test.ts`, whose health example currently expects `12,500`, and any other affected numeric assertions. Add a focused tooltip sell-price assertion because Python-generated text can otherwise retain a different Unicode separator. A database-wide test is not needed for a numeric-schema invariant that does not change.

Check initial static HTML and browser-rendered rows with a browser locale that normally uses decimal commas. Verify grouping remains U+202F on the second page and after sorting or filtering. Inspect item Max Stack, Primal Essence recipe amounts, monster health/XP, NPC and item prices, inventory costs and a decimal calculator result. Measure narrow-screen wrapping so grouped digits stay together without clipping.

### Reconcile the requested mechanics snapshot update with the current workflow

`scripts/snapshot-mechanics.mjs` is absent from the repository's scripts directories. A repository filename search also finds no mechanics snapshot script or `.snap` files. CONTRIBUTING.md explicitly rejects literal prose snapshots as a correctness gate. There is therefore no current snapshot file to regenerate or command to run.

The intended visible diff would replace comma-grouped or raw quantities with U+202F strings. Carry that through current numeric expectations in formatter, stats and affected mechanics tests, and update any tracked numeric fixture encountered during migration. Review changed mechanics prose and tables in the browser while keeping their arithmetic unchanged. Do not recreate the removed snapshot mechanism just to satisfy a stale path. If a snapshot workflow has been restored by implementation time, update its numeric snapshots with its actual command and review only the expected separator changes.

## Risks / Trade-offs

- U+202F resembles ordinary space in reviews. Assert its escaped code point in focused tests and inspect rendered text content.
- A formatter-default change affects existing consumers beyond the directly migrated calls. Review numeric assertions and representative shared stats, skills and calculator output.
- Non-breaking digit groups can widen table cells on phones. Check complete values at 390x844 without shrinking text or removing grouping.
- Source-authored tooltip text can contain game-supplied formatting. This change explicitly controls the pipeline-added sell-price suffix and site-authored numbers, not arbitrary replacement inside quoted game text.

## Migration Plan

Change and test the shared default, migrate existing formatters and bare calls, then repair raw quantities and authored numeric prose. Align tooltip sell prices and regenerate their data. Update affected numeric fixtures and run focused tests followed by website checks and a full prerender. Review static and interactive output in the browser. Ship a clean cutover without local formatter copies or locale-dependent fallbacks.
