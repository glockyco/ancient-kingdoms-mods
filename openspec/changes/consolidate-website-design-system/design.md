## Context

`website/DESIGN.md:139-157` defines a compact scale with 12 px labels but no minimum rendered-text rule. `website/src/lib/components/professions/MasteryCurve.svelte:42,85-89,109-171` uses a 720-unit SVG and 9.5–10-unit labels. A phone-width SVG shrinks the labels with the entire plot. `website/src/routes/mechanics/experience/+page.svelte:66,342-347,1403-1407` and `website/src/routes/mechanics/mercenary-stats/+page.svelte:1203-1210` use the same sizing pattern. Formula text also uses `text-xs` (`routes/mechanics/combat/+page.svelte:344-351`).

`website/DESIGN.md:14-15` declares achievement amber and reference blue. `website/src/app.css:7-114,116-171` contains semantic role and quality colors but not those two roles. `website/src/lib/components/EntityLink.svelte:59,89-100` and ordinary route links repeat link color classes. The shared badge exists (`lib/components/ui/badge/badge.svelte:4-21`), yet the only direct consumers found are data-table subcomponents (`lib/components/ui/data-table/data-table-faceted-filter.svelte:12,52-67`, `data-table-range-filter.svelte:9,84`, `data-table-stat-toggle.svelte:5,30`). Existing `Card`, `Button`, `Input`, `Table`, and `DataTable` components provide a base. This proposal does not require recreating a historical inventory.

## Goals / Non-Goals

**Goals:** Align actual rendered text and contrast with a measurable floor, then migrate proven duplication to the existing visual authority. Preserve the source-specific information and responsiveness of each page.

**Non-Goals:** No subjective rebrand, universal page shell, token-generation pipeline, component workshop, permanent catalog of individual exceptions, or incidental pixel snapshots. Profession-route content and map registry behavior belong to their separate changes.

## Decisions

### Repair readability and contrast before broad component work

Add a 14 CSS px minimum for visible information in `website/DESIGN.md` and reconcile the label scale with that floor. Measure the *painted* size of SVG labels at both viewport sizes, not only their source `font-size`: a scaled 10-unit label in a 720-unit viewBox is not a 10 CSS px label on a narrow screen. Adapt chart composition, provide a readable companion label, or allow intentional horizontal exploration without clipping essential labels. Do not enlarge an SVG font declaration while leaving the whole plot scaled down. For long formulas, preserve the formula and allow horizontal scrolling instead of reducing type. A larger font can increase height and overflow, so verify the full content on both viewports. This accepts some extra space rather than preserving maximum density at the cost of legibility.

Use 4.5:1 for normal state text and 3:1 for essential graphical boundaries. Inspect the actual background, including muted surfaces, in both modes. Repair the probability colors at `routes/gather-items/[id]/+page.svelte:217-223`, the altar results at `routes/altars/[id]/+page.svelte:258,265-270`, and the experience legend at `routes/mechanics/experience/+page.svelte:337-339`. Keep state labels and numbers explicit so hue alone never carries meaning. Do not globally darken every category color: the same color can label a chart series, mark a decorative icon, or carry text against different backgrounds.

### Connect design roles to applied styles before migrating consumers

Define theme-aware reference-link and achievement roles in `app.css`, expose the roles to Tailwind, and update their declaration in `DESIGN.md` when contrast requires distinct theme values. Keep item-quality and game-authored colors separate (`app.css:41-60,102-108,152-166`). Migrate repeated reference links by their semantics: `EntityLink` and typed wrappers remain the entity owner, while simple prose links need only a shared semantic class. Avoid adding a second entity-link implementation. Preserve hover and keyboard focus.

### Extract only demonstrated shared semantics

Audit each route family against its actual consumers before a primitive migration. Use the current button, input, badge, card, table, and data-table contracts where meaning and interaction match (`lib/components/ui/`). An existing raw table can stay raw when its custom layout or static completeness matters; align header typography and borders instead. Consolidate the two `rgbToColor` implementations in `map/sidebar/MapSidebar.svelte:182-191` and `MapSidebarContent.svelte:86-95` at the map-color owner. Consolidate NPC category colors from `RoleBadges.svelte:30-38` and `routes/npcs/[id]/+page.svelte:52-60` at their existing role taxonomy. Compare `EntityPopup.svelte:637-660,990-1031,1210-1241,1334-1357` before extracting drop-list presentation: random-item outcomes and rate ranges require distinct behavior. Do not force them into a single generic widget if their contracts differ. Demonstrated shared semantics or a single-owner domain rule is enough to justify consolidation; do not require three call sites.

### Check drift at the boundary, not with a frozen census

Audit palette utilities, direct color literals, dynamic class construction, and raw control usage in the current tree. A local measurement found raw controls and palette literals, but such counts change as routes migrate; do not encode a repository-wide target count. Prefer a focused check that rejects newly introduced unsanctioned uses and permits narrowly documented map, chart, tooltip, item-quality, and game-authored exceptions. Audit dynamic classes for static enumerability without rejecting valid data-driven colors. Add behavioral tests only for a credible state or interaction regression. Review focus, loading, error, empty, overflow, and no-JavaScript states on changed surfaces. Remove temporary inventory output once checks are in place. Enforce the boundary rather than freezing an inventory of all existing exceptions.

## Risks / Trade-offs

- [Larger type may expand dense tables and charts] → Check overflow and wrapping at 1440×900 and 390×844 before completing each file; preserve visible values.
- [A general lint rule can reject meaningful quality, map, or chart colors] → Scope the checker to semantic interface roles and record narrow exceptions beside the rule.
- [A primitive migration can change rendering or static HTML] → Compare accessible names, keyboard behavior, and HTML without JavaScript for each changed route.
- [Mechanics presentation edits can change snapshot text] → Keep formulas unchanged and follow the README's mechanics snapshot workflow for intentional visible-text changes.

## Migration Plan

Change `DESIGN.md` and the shared tokens first. Repair the named text and contrast defects file by file. Consolidate shared controls and helpers only after checking each consumer. Add the enforcement check after the repaired patterns are known. Validate with the existing website checks, focused behavioral checks where warranted, the mechanics snapshots when visible text changes, and browser review in both themes and both viewport sizes. Ship each coherent family with a clean cutover; rollback by reverting that family's change, not by retaining parallel styles.
