---
title: "Website Design System Audit & Consolidation Plan"
type: plan
status: active
created: 2026-05-27
parent:
superseded_by:
archived:
---

# Website Design System Audit & Consolidation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Requires review.

**Goal:** Produce an evidence-based interface inventory, convert it into a small robust website design-system blueprint, implement the missing primitives/domain components, and migrate pages without introducing parallel styling conventions.

**Architecture:** This is a design-system remediation project, not a visual refresh. The work starts with a code-derived interface inventory and design-system audit, then uses those findings to define primitives, tokens, documentation/testing tooling, and a migration sequence. Page migration is intentionally last so the project does not invent new styling patterns before the reusable layer exists.

**Tech Stack:** SvelteKit, Svelte 5, Tailwind CSS v4, `tailwind-variants`, `tailwind-merge`, Bits UI/shadcn-svelte-style local components, Vitest, optional Storybook or Histoire, optional Playwright visual comparisons.

---

## Terminology and external grounding

Use industry terminology deliberately:

- **Interface inventory**: Brad Frost describes this as “a comprehensive collection of the bits and pieces that make up your user interface.” It is the concrete evidence artifact: grouped screenshots/code examples of buttons, forms, headings, colors, blocks, navigation, lists, messaging, animation, and other visible interface patterns. Source: https://atomicdesign.bradfrost.com/chapter-4/
- **Interface audit / design-system audit**: the analysis pass over the inventory that identifies redundancy, drift, gaps, inconsistent naming, accessibility risk, and candidates for consolidation. UXPin’s guide says to first understand the current design/development ecosystem and prove inconsistency by inventorying patterns, colors, text styles, assets, space, and code architecture. Source: https://www.uxpin.com/create-design-system-guide/create-ui-inventory-for-design-system
- **Design debt remediation**: the migration work that retires inconsistent page-local styles and replaces them with reusable, tested system components.
- **Component consolidation**: merging multiple visually/behaviorally similar implementations into one primitive or domain component.
- **Living pattern library / component workshop**: a browsable place where reusable components and states are documented and tested. Storybook is the mainstream option; Histoire is a lighter Vite-native option with Svelte support.

Relevant lessons from prior projects and public guidance:

- Start with evidence, not taste. The audit must inventory first, then map, prioritize, and standardize.
- Capture unique patterns, not every repeated instance. The inventory should show each unique variant and link back to all call sites.
- Do not build the whole design system up front. Migration/adoption guidance repeatedly warns against building too much too soon.
- Adoption is harder than creation. New primitives must be easier to use than page-local classes, or they will be ignored.
- Avoid hybrid long-term states. It is acceptable to migrate incrementally, but each migrated page family should cleanly cut over instead of mixing old and new styling recipes indefinitely.
- Visual regression belongs in the plan. Storybook visual tests or Playwright screenshots are how styling drift becomes observable in review.

Sources consulted:

- Brad Frost, Atomic Design — interface inventory, pattern library, and design-system workflow: https://atomicdesign.bradfrost.com/chapter-4/
- UXPin, UI inventory for design systems — pattern, color, typography, icon, and space inventories: https://www.uxpin.com/create-design-system-guide/create-ui-inventory-for-design-system
- Tailwind CSS v4 theme variables — `@theme` variables as design tokens that generate utility APIs: https://tailwindcss.com/docs/theme
- Tailwind CSS class detection — avoid dynamic class construction; use complete class names: https://tailwindcss.com/docs/detecting-classes-in-source-files
- W3C Design Tokens Community Group stable-token announcement — token standardization and theming direction: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Storybook Svelte/Vite docs — Svelte component isolation and documentation support: https://storybook.js.org/docs/get-started/frameworks/svelte-vite
- Storybook visual testing docs — visual snapshots and PR checks: https://storybook.js.org/docs/writing-tests/visual-testing
- Storybook accessibility docs — axe-core-based component checks: https://storybook.js.org/docs/writing-tests/accessibility-testing
- Playwright visual comparisons — page-level screenshots with committed baselines: https://playwright.dev/docs/test-snapshots
- Histoire docs — Vite-powered Svelte-compatible story/documentation alternative: https://histoire.dev/

---

## Current repo signals from preliminary inspection

These are not the final audit findings. They are only enough evidence to shape the audit plan.

- `website/package.json` already has Tailwind v4 (`tailwindcss`, `@tailwindcss/vite`), Svelte 5, `tailwind-variants`, `tailwind-merge`, `clsx`, Bits UI, and shadcn-style local primitives.
- `website/src/app.css` already defines semantic tokens including `--background`, `--foreground`, `--card`, and `--primary`, plus domain tokens for quality and monster types.
- `website/src/lib/utils.ts` already exposes `cn()` using `clsx` + `tailwind-merge`.
- Existing primitive surface lives under `website/src/lib/components/ui/`: button, badge, card, alert, input, tabs, table, data-table, popover, dropdown-menu, command, dialog, drawer, pagination, slider, separator, hover-card, icon-badge.
- There are 45 route `+page.svelte` files under `website/src/routes/**/+page.svelte`.
- Repeated page shells already show up in at least 38 route files as `container mx-auto p-8 ...` variants.
- Repeated page headings already show up in many route files as `text-3xl font-bold` variants.
- Route-local control styling exists despite primitives, e.g. repeated `h-11` select/button classes in fishing/gathering/monster detail pages.
- Literal game-tooltip colors exist in `website/src/routes/quests/[id]/+page.svelte` (`bg-[#1a1a2e]`, `border-[#3a3a5a]`, `text-[#e0e0e0]`) while `website/src/app.css` also has `.tooltip-content` styling.
- Map components contain legitimate special surfaces, including canvas/map colors, image rendering, popups, sidebars, and entity tooltips. The audit must classify these separately instead of blindly forcing page primitives onto map UI.

---

## Non-goals

- Do not start with a subjective visual redesign.
- Do not introduce a token JSON build pipeline unless the audit proves CSS tokens are insufficient.
- Do not migrate pages before reusable primitives and domain components exist.
- Do not Storybook every route page.
- Do not create general abstractions for one-off map/canvas constraints.
- Do not replace Tailwind with another styling approach.
- Do not leave old aliases/reexports/components after a page family has fully migrated.

---

## Final deliverables

1. `docs/superpowers/specs/2026-05-27-website-interface-inventory.md`
   - Generated/curated inventory of styling surface: tokens, colors, typography, spacing/layout, controls, badges, cards, tables, map surfaces, and route families.
   - Each inventory item includes representative file/line references and all known call sites.

2. `docs/superpowers/specs/2026-05-27-website-design-system-blueprint.md`
   - Final primitive/domain component list based on the inventory.
   - Token decisions.
   - Component API sketches.
   - Storybook/Histoire/Playwright decision.
   - Migration order.
   - Explicit exceptions.

3. Optional audit helper tooling under `website/scripts/`
   - A script may be added if manual inventory is too error-prone.
   - The script must report raw colors, arbitrary Tailwind values, dynamic class construction, long duplicate class strings, repeated page shells, and primitive bypasses.

4. Implemented component layer
   - Missing primitives, layout components, and domain components identified by the blueprint.

5. Visual/testing layer
   - Component-level stories if Storybook/Histoire is selected.
   - Page-level Playwright screenshots for representative routes if visual regression is selected.

6. Migrated route families
   - Overview pages.
   - Detail pages.
   - Profession/mechanics pages.
   - Map surfaces only where the blueprint says shared components apply.

---

## Decision framework: Storybook vs Histoire vs no component workshop

Make this decision after Task 2, not before. Use this rubric:

| Criterion | Storybook | Histoire | No workshop yet |
|---|---|---|---|
| Best when | Need mature docs, a11y, visual testing, addons, broad ecosystem | Need lightweight Vite/Svelte stories with lower overhead | Component surface remains small after audit |
| Benefits | Strong ecosystem, Svelte/Vite support, autodocs, controls, a11y addon, Chromatic path | Fast, Vite-native, simple story authoring, dark mode, copyable code | No new tool or maintenance burden |
| Pitfalls | Setup/maintenance overhead, stories can rot, easy to over-scope | Smaller ecosystem, weaker visual/a11y ecosystem than Storybook | Unknown unknowns stay harder to see; no component catalog |
| This project fit | Likely good if we standardize 15+ shared primitives/domain components | Good if we only need local component examples and avoid Chromatic | Only acceptable if final reusable surface is very small |

Default recommendation unless the audit disproves it: **Storybook for shared primitives/domain components only, Playwright for route-level screenshots.**

---

## Task 1: Produce the interface inventory

**Files:**
- Create: `docs/superpowers/specs/2026-05-27-website-interface-inventory.md`
- Read-only inputs: `website/src/app.css`, `website/src/lib/components/**/*.svelte`, `website/src/lib/components/**/*.ts`, `website/src/routes/**/*.svelte`, `website/package.json`
- Optional create: `website/scripts/audit-ui-surface.mjs`
- Optional test: `website/scripts/audit-ui-surface.test.mjs`

- [ ] **Step 1: Inventory source files**

Use OMP `find`, not shell `find`, to enumerate:

- `website/src/routes/**/+page.svelte`
- `website/src/lib/components/**/*.svelte`
- `website/src/lib/components/**/*.ts`
- `website/src/app.css`

Record counts and major directories in the inventory document.

Expected result: the inventory names the exact page and component surface under review.

- [ ] **Step 2: Inventory existing foundations**

Read and summarize:

- `website/src/app.css` token groups and custom utilities.
- `website/src/lib/utils.ts` class composition helpers.
- `website/src/lib/styles/badge.ts` shared badge helper.
- `website/src/lib/components/ui/button/button.svelte`, `badge/badge.svelte`, `card/card.svelte`, `input/input.svelte`, `data-table/data-table.svelte`.

Expected result: inventory has a “Current foundations” section listing what already exists and what should be reused.

- [ ] **Step 3: Inventory repeated page structure**

Use OMP `search` to collect:

- `container mx-auto p-8`
- `max-w-4xl`, `max-w-5xl`, `space-y-4`, `space-y-6`, `space-y-8`, `space-y-12`
- `<h1 class="...text-3xl font-bold`
- repeated breadcrumb + title + action-row patterns

Expected result: inventory has a “Page structure” section with candidate components such as `PageShell`, `PageHeader`, `PageTitle`, and `DetailHeader`, but marks them as candidates until Task 2.

- [ ] **Step 4: Inventory controls and primitive bypasses**

Use OMP `search` to collect route-local controls that should probably be primitives:

- `<button` with `inline-flex`, `rounded-md`, `focus-visible:ring`, `hover:bg-muted`, or repeated disabled styling.
- `<select` with `appearance-none`, `rounded-md`, `focus-visible:ring`, or `h-11`.
- `<input` outside `website/src/lib/components/ui/input`.
- ad hoc `role="button"`, clickable `<div>`, or link-looking buttons.

Expected result: inventory has a “Controls” section that separates legitimate primitives from primitive bypasses.

- [ ] **Step 5: Inventory badges, pills, and status labels**

Use OMP `search` for:

- `rounded-full`
- `px-2.5 py-0.5`
- `text-xs font-medium`
- `bg-*-100 text-*-800 dark:bg-* dark:text-*`
- existing components: `ClassPills`, `RoleBadges`, `QuestTypeBadge`, `QuestFlagBadges`, `DungeonRestrictionBadge`, `IconBadge`, `Badge`

Expected result: inventory groups badges by purpose: generic badge, icon badge, quality badge, entity type badge, profession badge, quest badge, role badge, special-case map role marker.

- [ ] **Step 6: Inventory colors and token escapes**

Use OMP `search` for:

- `#[0-9a-fA-F]{6}`
- `rgb(` and `rgba(`
- `oklch(` outside `app.css`
- `text-blue-`, `bg-blue-`, `border-blue-`, and other palette-specific utilities in route files.
- `dark:` overrides in route files.

Classify each finding as:

- semantic token candidate
- domain token candidate
- component variant candidate
- legitimate data-driven/map/canvas color
- acceptable one-off with reason

Expected result: inventory has a “Color and token drift” section with evidence, not opinions.

- [ ] **Step 7: Inventory arbitrary values and dynamic classes**

Use OMP `search` for:

- `\[[^\]]+\]`
- `class="[^"]*{[^}]+}` and `class={...}` in Svelte files
- known dynamic Tailwind anti-patterns such as `bg-quality-{...}`

For each finding, classify as:

- Tailwind structural selector/state variant, acceptable in primitive component.
- Sizing/layout escape hatch, review.
- Dynamic class construction, migrate to static class map or component.
- Map/canvas special case.

Expected result: inventory has an “Arbitrary values and dynamic classes” section.

- [ ] **Step 8: Inventory complex surfaces separately**

Create separate sections for:

- `website/src/lib/components/ui/data-table/`
- `website/src/lib/components/map/`
- `website/src/lib/components/map/sidebar/`
- profession pages under `website/src/routes/professions/`
- mechanics pages under `website/src/routes/mechanics/`
- `website/src/routes/tools/combat-simulator/+page.svelte`

Expected result: complex surfaces are not flattened into generic primitives prematurely.

- [ ] **Step 9: Add inventory conclusions without choosing final APIs**

At the end of the inventory, add:

- top overlap clusters
- top drift risks
- likely missing primitives
- likely missing domain components
- areas requiring human visual review
- areas that should remain special-case

Expected result: inventory is tangible and reviewable, but final component decisions are deferred to Task 2.

- [ ] **Step 10: Verify inventory completeness**

Run:

```bash
pnpm --filter website lint
```

Expected: no new lint errors. This does not verify content correctness; it verifies optional audit tooling did not break the website package.

- [ ] **Step 11: Commit inventory**

```bash
git add docs/superpowers/specs/2026-05-27-website-interface-inventory.md website/scripts/audit-ui-surface.mjs website/scripts/audit-ui-surface.test.mjs
git commit -m "docs(website): inventory design system drift"
```

If optional audit scripts were not created, omit them from `git add`.

---

## Task 2: Convert inventory into a design-system blueprint

**Files:**
- Create: `docs/superpowers/specs/2026-05-27-website-design-system-blueprint.md`
- Read: `docs/superpowers/specs/2026-05-27-website-interface-inventory.md`

- [ ] **Step 1: Define consolidation principles from evidence**

Write explicit rules derived from the inventory:

- A primitive is justified when at least two route/component clusters implement the same UI role.
- A domain component is justified when the styling is tied to Ancient Kingdoms semantics, not generic UI semantics.
- A token is justified when multiple components need the same design decision or when light/dark behavior should be centralized.
- A page-local class remains acceptable only when it expresses layout unique to that page and is not a repeated recipe.

Expected result: blueprint explains why each component exists.

- [ ] **Step 2: Define component taxonomy**

Use this taxonomy unless the inventory strongly argues otherwise:

- **Foundation:** tokens, typography scale, spacing/layout scale, focus style, dark-mode rules.
- **Primitives:** `Button`, `Input`, `Select`, `Badge`, `Card`, `Tabs`, `Popover`, `Dialog`, `Drawer`, `Table`, `DataTable`, `TooltipShell`.
- **Page structure:** `PageShell`, `PageHeader`, `PageTitle`, `DetailHeader`, `PageSection`, `EmptyState`.
- **Domain components:** `QualityBadge`, `EntityTypeBadge`, `QuestTypeBadge`, `RoleBadges`, `ClassPills`, `ProfessionBadge`, `GameTooltipPanel`, source/obtainability list rows.
- **Complex surfaces:** map popup/sidebar components and data-table internals.

Expected result: blueprint has a final taxonomy with accepted, rejected, and deferred components.

- [ ] **Step 3: Define primitive APIs**

For each accepted primitive/component, write:

- component path
- props
- variants
- allowed class override behavior
- accessibility responsibilities
- examples
- known non-goals

Expected result: an implementer can build the component without inventing API details.

- [ ] **Step 4: Decide Storybook/Histoire/no-workshop**

Apply the rubric in this plan to the accepted component set.

Decision rules:

- If accepted reusable components >= 15 or if variants/states are hard to review in routes, choose Storybook.
- If accepted reusable components are mostly Svelte-only and the team wants lower overhead with fewer addons, choose Histoire.
- If accepted reusable components < 8 and visual variants are simple, defer component workshop and use Playwright only.

Expected result: blueprint records the decision, rationale, and explicit scope. If Storybook/Histoire is selected, scope is components only, not full route pages.

- [ ] **Step 5: Define visual regression strategy**

Choose both layers independently:

- Component layer: Storybook/Chromatic or Storybook test runner, Histoire screenshots, or defer.
- Page layer: Playwright screenshots for representative routes.

Representative route candidates:

- `/`
- `/items`
- `/items/[id]` with a stable fixture id
- `/monsters/[id]` with a stable fixture id
- `/quests/[id]` with tooltip content
- `/professions/fishing`
- `/mechanics/combat`
- `/map` if deterministic enough after hiding volatile layers

Expected result: blueprint lists initial screenshots and what dynamic elements must be hidden/stabilized.

- [ ] **Step 6: Define migration order**

Default order:

1. primitive implementation
2. component workshop/visual fixtures
3. overview/list pages
4. detail pages
5. profession pages
6. mechanics pages
7. combat simulator
8. map surfaces

Expected result: migration starts with broad repeated patterns and leaves special surfaces until after common primitives are stable.

- [ ] **Step 7: Define enforcement rules**

Choose which checks become automated after migration begins:

- raw hex colors in routes
- dynamic Tailwind construction
- long duplicate class strings
- primitive bypasses for buttons/selects/badges
- arbitrary values in route files except allowlisted cases

Expected result: blueprint says which rules are warnings at first and which become CI failures after migration.

- [ ] **Step 8: Commit blueprint**

```bash
git add docs/superpowers/specs/2026-05-27-website-design-system-blueprint.md
git commit -m "docs(website): define design system consolidation blueprint"
```

---

## Task 3: Implement audit guardrails

**Files:**
- Create/modify based on blueprint: `website/scripts/audit-ui-surface.mjs`
- Create/modify based on blueprint: `website/scripts/audit-ui-surface.test.mjs`
- Modify: `website/package.json`
- Modify: root `package.json` if the check should join `pnpm check`

- [ ] **Step 1: Write tests for the audit script**

The tests must cover at least:

- detecting route-local hex colors
- ignoring `href="#section"`
- detecting dynamic Tailwind construction
- allowing structural variants inside `website/src/lib/components/ui/`
- detecting duplicate long class strings
- honoring an explicit allowlist for map/canvas files

Expected: tests fail before implementation or before rule additions.

- [ ] **Step 2: Implement the audit script**

The script should output grouped findings with:

- rule id
- file path
- line number
- matched text
- remediation hint

It must not modify files.

- [ ] **Step 3: Add package scripts**

Add to `website/package.json`:

```json
{
  "scripts": {
    "audit:ui": "node scripts/audit-ui-surface.mjs"
  }
}
```

If the blueprint says this should be part of CI immediately, add to root `package.json` under `check`; otherwise document it as a manual gate until the first migration pass is complete.

- [ ] **Step 4: Verify**

Run:

```bash
pnpm --filter website test scripts/audit-ui-surface.test.mjs
pnpm --filter website audit:ui
pnpm --filter website lint
pnpm --filter website check
```

Expected: tests pass; `audit:ui` either passes or reports known pre-migration findings according to the blueprint severity model.

- [ ] **Step 5: Commit**

```bash
git add website/scripts/audit-ui-surface.mjs website/scripts/audit-ui-surface.test.mjs website/package.json package.json
git commit -m "chore(website): add UI surface audit guardrails"
```

---

## Task 4: Implement foundation and primitives

**Files:**
- Modify: `website/src/app.css`
- Modify/create under: `website/src/lib/components/ui/`
- Modify/create under: `website/src/lib/components/layout/` if the blueprint chooses a layout namespace
- Modify/create under: `website/src/lib/components/` for domain components

- [ ] **Step 1: Add or normalize tokens**

Only add tokens accepted by the blueprint. Likely candidates from preliminary inspection:

- tooltip/game-panel colors currently duplicated between `app.css` and route-level arbitrary colors
- page shell spacing if not expressible through existing Tailwind scale
- domain badge color aliases if route-local palette classes are inconsistent

Expected: token additions are minimal and semantic.

- [ ] **Step 2: Add missing primitive tests or stories first**

For each accepted primitive, create one of:

- Vitest component-level test if behavior matters.
- Storybook/Histoire story if visual states matter.
- Both if the component has interaction and visual variants.

Expected: every primitive has at least one executable or reviewable fixture.

- [ ] **Step 3: Implement primitives**

Implement the accepted primitive set from the blueprint. Do not add extra variants “just in case.”

Likely candidates from preliminary inspection:

- `Select` matching existing `Input`/`Button` focus and disabled styling.
- `PageShell` / `PageHeader` / `PageTitle` / `DetailHeader`.
- `GameTooltipPanel`.
- Badge variants or domain badge wrappers.

Expected: primitives use `cn()`, Tailwind tokens, `tailwind-variants` where variants exist, and Svelte 5 props/snippets.

- [ ] **Step 4: Verify primitives**

Run whichever commands exist after Task 2/3 decisions:

```bash
pnpm --filter website test
pnpm --filter website lint
pnpm --filter website check
pnpm --filter website build
```

If Storybook/Histoire was added, also run its build command.

- [ ] **Step 5: Commit**

```bash
git add website/src/app.css website/src/lib/components website/package.json pnpm-lock.yaml
git commit -m "feat(website): add design system primitives"
```

---

## Task 5: Add component workshop if selected

**Files:**
- Create/modify: `.storybook/*` or Histoire config under `website/`
- Create: stories for accepted primitives/domain components
- Modify: `website/package.json`
- Modify: `website/pnpm-lock.yaml`

- [ ] **Step 1: Install selected tool**

If Storybook:

```bash
cd website
pnpm create storybook@latest
```

If Histoire:

```bash
cd website
pnpm add -D histoire @histoire/plugin-svelte
```

Expected: package scripts and config are added without changing app runtime behavior.

- [ ] **Step 2: Add stories for accepted primitives**

Minimum story coverage:

- Button: all variants, all sizes, disabled, anchor mode.
- Input: text/search/number where applicable, disabled, invalid.
- Select: default, disabled, long option text.
- Badge: all variants and domain badge wrappers.
- Card/PageSection: normal and dense content.
- PageHeader/DetailHeader: with/without icon, action, badges, long title.
- GameTooltipPanel: short, long, HTML tooltip content if supported.

Expected: each story shows realistic states from the inventory, not invented demo states.

- [ ] **Step 3: Add a11y/visual addon only if selected**

If Storybook was selected and blueprint approves a11y checks, add Storybook a11y. If Chromatic or another visual service is not approved, do not add it; use local Playwright screenshots instead.

Expected: no external service dependency is introduced without explicit blueprint decision.

- [ ] **Step 4: Verify workshop build**

Run selected build command:

```bash
pnpm --filter website build-storybook
```

or

```bash
pnpm --filter website story:build
```

Expected: component workshop builds successfully.

- [ ] **Step 5: Commit**

```bash
git add website/.storybook website/src/**/*.stories.* website/package.json website/pnpm-lock.yaml
git commit -m "chore(website): add component workshop"
```

---

## Task 6: Migrate overview/list pages

**Files:**
- Modify route files chosen by blueprint, likely:
  - `website/src/routes/items/+page.svelte`
  - `website/src/routes/monsters/+page.svelte`
  - `website/src/routes/npcs/+page.svelte`
  - `website/src/routes/pets/+page.svelte`
  - `website/src/routes/quests/+page.svelte`
  - `website/src/routes/zones/+page.svelte`
  - `website/src/routes/recipes/+page.svelte`
  - `website/src/routes/altars/+page.svelte`
  - `website/src/routes/chests/+page.svelte`
  - `website/src/routes/skills/+page.svelte`

- [ ] **Step 1: Migrate one page as the pilot**

Pick the lowest-risk overview page from the blueprint. Replace page shell, heading, badges, and primitive bypasses with accepted components.

Expected: same rendered data and behavior; less page-local styling.

- [ ] **Step 2: Verify pilot page**

Run:

```bash
pnpm --filter website check
pnpm --filter website lint
```

If visual tests exist, run the pilot screenshot/story command.

Expected: no errors; visual diff is either absent or intentionally accepted.

- [ ] **Step 3: Migrate the remaining overview pages as a family**

Apply the same pattern. Delete page-local helper constants/styles that are replaced by primitives.

Expected: overview pages use the same page shell/header/table conventions.

- [ ] **Step 4: Verify family**

Run:

```bash
pnpm --filter website check
pnpm --filter website lint
pnpm --filter website build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add website/src/routes website/src/lib/components
git commit -m "refactor(website): migrate overview pages to design system primitives"
```

---

## Task 7: Migrate detail pages

**Files:**
- Modify route files chosen by blueprint, likely:
  - `website/src/routes/items/[id]/+page.svelte`
  - `website/src/routes/monsters/[id]/+page.svelte`
  - `website/src/routes/npcs/[id]/+page.svelte`
  - `website/src/routes/pets/[id]/+page.svelte`
  - `website/src/routes/quests/[id]/+page.svelte`
  - `website/src/routes/zones/[id]/+page.svelte`
  - `website/src/routes/recipes/[id]/+page.svelte`
  - `website/src/routes/altars/[id]/+page.svelte`
  - `website/src/routes/chests/[id]/+page.svelte`
  - `website/src/routes/classes/[id]/+page.svelte`
  - `website/src/routes/skills/[id]/+page.svelte`
  - `website/src/routes/gather-items/[id]/+page.svelte`

- [ ] **Step 1: Migrate the easiest detail page as pilot**

Use `DetailHeader`, badge/domain components, `GameTooltipPanel`, and `Select/Button` primitives where applicable.

Expected: no behavior changes.

- [ ] **Step 2: Verify pilot page**

Run:

```bash
pnpm --filter website check
pnpm --filter website lint
```

If page screenshots exist, update/run only the pilot screenshot.

- [ ] **Step 3: Migrate remaining detail pages by entity family**

Do not mix old/new patterns within a migrated file. If a component is insufficient, update the component rather than adding page-local parallel styling.

Expected: each migrated file has less page-local styling and no duplicate local badge/control recipes.

- [ ] **Step 4: Verify family**

Run:

```bash
pnpm --filter website check
pnpm --filter website lint
pnpm --filter website build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add website/src/routes website/src/lib/components
git commit -m "refactor(website): migrate detail pages to design system primitives"
```

---

## Task 8: Migrate profession, mechanics, tool, and map surfaces

**Files:**
- Modify route/component files accepted by blueprint:
  - `website/src/routes/professions/**/*.svelte`
  - `website/src/routes/mechanics/**/*.svelte`
  - `website/src/routes/tools/combat-simulator/+page.svelte`
  - selected `website/src/lib/components/map/**/*.svelte`

- [ ] **Step 1: Migrate profession pages**

Apply page/layout/header/badge primitives, but preserve profession-specific content architecture.

Expected: profession pages become visually aligned without losing specialized content.

- [ ] **Step 2: Migrate mechanics pages**

Apply page/layout/card/table conventions where they match blueprint decisions.

Expected: mechanics pages keep readable long-form content and consistent cards/tables.

- [ ] **Step 3: Migrate combat simulator**

Use primitives for controls and layout. Do not change simulator behavior.

Expected: simulator controls visually match the design system.

- [ ] **Step 4: Migrate map surfaces according to the blueprint**

Respect map-specific exceptions from the blueprint. Shared popups/badges/list rows may migrate; canvas/layer colors and pixel-art constraints may remain special-case.

Expected: map UI uses shared primitives where useful and documented exceptions where not.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm --filter website check
pnpm --filter website lint
pnpm --filter website build
```

If map screenshots/tests exist, run them.

- [ ] **Step 6: Commit**

```bash
git add website/src/routes website/src/lib/components
git commit -m "refactor(website): migrate specialized pages to design system primitives"
```

---

## Task 9: Promote guardrails to CI and document maintenance rules

**Files:**
- Modify: `website/package.json`
- Modify: root `package.json`
- Create/modify: `docs/superpowers/specs/2026-05-27-website-design-system-maintenance.md` if the blueprint says a separate maintenance doc is warranted

- [ ] **Step 1: Re-run audit script after migration**

Run:

```bash
pnpm --filter website audit:ui
```

Expected: no high-severity drift findings. Remaining warnings have explicit allowlist reasons.

- [ ] **Step 2: Promote agreed rules to CI**

If `audit:ui` is clean enough, wire it into root `pnpm check` or website `pnpm check` according to the blueprint.

Expected: future raw color/dynamic class/primitive bypass drift fails before merge.

- [ ] **Step 3: Document maintenance rules**

Write a short maintenance doc or append to the blueprint:

- when to add a token
- when to add a component variant
- when page-local classes are acceptable
- how to add stories/screenshots
- how to update visual baselines
- how to request exceptions

Expected: future contributors have executable guidance, not broad taste statements.

- [ ] **Step 4: Final verification**

Run:

```bash
pnpm check
pnpm lint
pnpm build
```

If Storybook/Histoire/Playwright were added, run their build/test commands too.

Expected: all selected gates pass.

- [ ] **Step 5: Commit**

```bash
git add package.json website/package.json docs/superpowers/specs website/scripts
git commit -m "chore(website): enforce design system guardrails"
```

---

## Pitfalls this plan explicitly avoids

- **Starting with taste:** no component API is final until the inventory proves need.
- **Building too much:** primitives require evidence from repeated usage or clear domain semantics.
- **Migrating before the system exists:** pages move after primitives/tooling are ready.
- **Tool cargo-culting:** Storybook/Histoire is decided by component-surface size and maintenance value, not fashion.
- **False uniformity:** map/canvas/data-heavy surfaces get explicit exceptions instead of forced generic styling.
- **Permanent hybrid state:** each migrated page family should end with obsolete local recipes deleted.
- **Unmeasured adoption:** audit guardrails and visual snapshots make drift visible.
- **Dynamic Tailwind bugs:** dynamic class construction is identified and replaced with static maps/components.
- **Docs without teeth:** the final maintenance rules are backed by scripts/tests where practical.

---

## Success criteria

- The interface inventory exists and links drift findings to concrete files/call sites.
- The blueprint defines a component/token set from evidence, not guesses.
- Missing primitives/domain components are implemented before page migration.
- Component workshop choice is explicit and justified.
- Representative visual regression exists if selected by the blueprint.
- Migrated page families no longer duplicate page shell/header/control/badge recipes.
- Raw colors, dynamic Tailwind construction, and primitive bypasses are either removed or allowlisted with reasons.
- `pnpm check`, `pnpm lint`, and `pnpm build` pass at the end of the project.
