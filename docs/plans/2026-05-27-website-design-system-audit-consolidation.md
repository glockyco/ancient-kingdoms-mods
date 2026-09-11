---
title: "Website Design System Audit and Consolidation"
type: plan
status: in-progress
created: 2026-05-27
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Website Design System Audit and Consolidation

## Goal

Finish evidence-based interface consolidation without forcing the map, mechanics pages, or dense data
surfaces into one generic layout.

## Current state

`website/DESIGN.md` now defines the visual authority. It records semantic colors, typography, spacing,
shape, elevation, component roles, and static-first behavior.

Implemented foundations include:

- shared button, card, input, badge, and data-table primitives;
- `EntityLink` and typed wrappers for consistent entity references;
- `PageSections` with tests for section targets;
- `ProfessionHeader` and `MasteryCurve` for the profession migration;
- semantic design tokens in `app.css`;
- responsive, static-first route rendering;
- scoped rules for the interactive map and mechanics pages.

The original interface-inventory, blueprint, and `audit-ui-surface` deliverables do not exist. Do not
recreate them as historical prerequisites. The current design authority and implementation are the new
baseline.

## Decisions

### Audit before adding abstractions

Extract a shared component from demonstrated consumers when it carries shared semantics and expected
evolution, or when a domain rule requires one owner. Use those consumers to define the contract. Do not
prebuild a component inventory or require three call sites. Keep a fragment route-local until its shared
semantics are demonstrated or an owner rule requires extraction.

### Preserve specialized surfaces

The interactive map, formula-heavy mechanics pages, and dense entity tables have different performance
and information contracts. Shared tokens and controls apply, but page structure remains local when the
content shape differs.

### Prefer enforcement over inventory prose

A repeatable check is more durable than a point-in-time list. New audits should produce focused checks
for measurable drift, then remove temporary reports.

### Do not add a component workshop without a demonstrated need

Storybook and Histoire remain optional. Add one only when isolated component states cannot be reviewed
reliably through existing routes and focused tests. The current component surface does not establish
that need.

### Preserve static-first behavior

Core facts, navigation, and default results must render without JavaScript. Client interaction may add
search, filtering, optimization, and progressive detail.

## Replacement owner

`consolidate-website-design-system` owns the remaining measured interface drift and enforcement.
The profession migration owns its route-specific repairs and adoption. Export, map, and search changes
remain outside this plan.

## Remaining audit

Measure the current repository rather than copying the 2026-05-27 file list.

- [ ] Count raw color literals outside approved semantic and data-driven exceptions.
- [ ] Count dynamic Tailwind class construction and verify every remaining case is statically enumerable.
- [ ] Inventory route-local buttons, fields, badges, headers, and entity links that bypass an existing primitive.
- [ ] Inventory repeated page-shell and section patterns by route family.
- [ ] Inspect dark-mode, focus, loading, error, empty, overflow, and no-JavaScript states.
- [ ] Record explicit exceptions for map, chart, tooltip, item-quality, and game-authored colors.
- [ ] Convert each accepted drift rule into a focused script, lint rule, or behavioral test.
- [ ] Remove the temporary audit output after the checks and remaining work have authoritative owners.

## Migration order

1. Repair token and accessibility defects that affect every route.
2. Consolidate primitive bypasses with existing components.
3. Complete the profession validation set before migrating the other profession routes.
4. Migrate overview and detail families only where measured duplication remains.
5. Review mechanics and map surfaces under their scoped rules.
6. Add enforcement to the existing website check path.
7. Remove obsolete local recipes after each family completes its cutover.

## Acceptance

- `website/DESIGN.md` remains the single visual authority.
- Repeated controls and entity references use an existing shared contract or have a recorded exception.
- Raw colors, dynamic classes, and primitive bypasses are removed or checked against a narrow allowlist.
- Every changed route preserves keyboard focus, dark mode, responsive layout, and static core content.
- The map retains stable registries, coordinates, and deck.gl allocation behavior.
- Profession and mechanics pages preserve their content-specific contracts.
- Focused checks, `pnpm check`, `pnpm lint`, and `pnpm build` pass.

## Boundaries

- Do not perform a subjective rebrand.
- Do not create a token-generation pipeline without a measured repository constraint.
- Do not require one page template for unrelated information shapes.
- Do not add visual snapshots that assert incidental pixels or unstable data.
- Do not retain a permanent interface inventory that becomes stale beside executable checks.
