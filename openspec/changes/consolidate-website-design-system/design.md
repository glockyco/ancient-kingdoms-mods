## Context

No rule sets a minimum rendered-text size, and several surfaces use 12 px or smaller labels. `website/src/lib/components/professions/MasteryCurve.svelte:42,85-89,109-171` uses a 720-unit SVG and 9.5–10-unit labels. A phone-width SVG shrinks the labels with the entire plot. `website/src/routes/mechanics/experience/+page.svelte:66,342-347,1403-1407` and `website/src/routes/mechanics/mercenary-stats/+page.svelte:1203-1210` use the same sizing pattern. Formula text also uses `text-xs` (`routes/mechanics/combat/+page.svelte:344-351`).

Reference links render in blue and achievement markers in amber, but `website/src/app.css:7-114,116-171` contains semantic role and quality colors and neither of those two roles. `website/src/lib/components/EntityLink.svelte:59,89-100` and ordinary route links repeat link color classes. The shared badge exists (`lib/components/ui/badge/badge.svelte:4-21`), yet the only direct consumers found are data-table subcomponents (`lib/components/ui/data-table/data-table-faceted-filter.svelte:12,52-67`, `data-table-range-filter.svelte:9,84`, `data-table-stat-toggle.svelte:5,30`). Existing `Card`, `Button`, `Input`, `Table`, and `DataTable` components provide a base. This proposal does not require recreating a historical inventory.

## Goals / Non-Goals

**Goals:** Align actual rendered text and contrast with a measurable floor, then migrate proven duplication to the existing visual authority. Preserve the source-specific information and responsiveness of each page.

**Non-Goals:** No subjective rebrand, universal page shell, token-generation pipeline, component workshop, permanent catalog of individual exceptions, or incidental pixel snapshots. Profession-route content and map registry behavior belong to their separate changes.

## Decisions

### Repair readability and contrast before broad component work

Apply the 14 CSS px minimum for visible information that this change's spec sets, and reconcile the label scale with that floor. Measure the _painted_ size of SVG labels at both viewport sizes, not only their source `font-size`: a scaled 10-unit label in a 720-unit viewBox is not a 10 CSS px label on a narrow screen. Adapt chart composition, provide a readable companion label, or allow intentional horizontal exploration without clipping essential labels. Do not enlarge an SVG font declaration while leaving the whole plot scaled down. For long formulas, preserve the formula and allow horizontal scrolling instead of reducing type. A larger font can increase height and overflow, so verify the full content on both viewports. This accepts some extra space rather than preserving maximum density at the cost of legibility.

Use 4.5:1 for normal state text and 3:1 for essential graphical boundaries. Inspect the actual background, including muted surfaces, in both modes. Repair the gather-detail page's current `getSuccessChanceColor` and `renderDropCell` presentation, then inspect its canonical reward rendering through `acquisition/MethodList.svelte` and `MethodCards.svelte`. Keep `professionAttempt`, explicit scenario inputs and event-labeled results unchanged. The altar results and experience legend retain their own contrast review. Keep state labels and numbers explicit so hue alone never carries meaning. Do not globally darken every category color: the same color can label a chart series, mark a decorative icon, or carry text against different backgrounds.

### Connect design roles to applied styles before migrating consumers

Define theme-aware reference-link and achievement roles in `app.css`, expose the roles to Tailwind, with distinct theme values where contrast requires them. Keep item-quality and game-authored colors separate (`app.css:41-60,102-108,152-166`). Migrate repeated reference links by their semantics: `EntityLink` and typed wrappers remain the entity owner, while simple prose links need only a shared semantic class. Change `map/MapItemLink.svelte`'s default role without removing quality overrides or its normal in-map selection, modifier-click navigation, keyboard access and tooltip behavior. Consume the current acquisition selection boundary rather than rebuilding source or geometry reads.

### Extract only demonstrated shared semantics

Audit each route family against its actual consumers before a primitive migration. Use the current button, input, badge, card, table, and data-table contracts where meaning and interaction match (`lib/components/ui/`). An existing raw table can stay raw when its custom layout or static completeness matters. Align header typography and borders instead. Consolidate map-sidebar RGB conversion at its map-color owner and NPC category colors at their existing role taxonomy. For acquisition presentation, compare `map/AcquisitionMethods.svelte` with `acquisition/MethodCards.svelte`, the virtual-definition inspection in `map/ItemPopup.svelte` and the context-specific results in `map/EntityPopup.svelte`. Share only demonstrated rendering equivalents, not a second query or rule layer. Preserve grouped costs, requirements, outputs, lifecycle limits, named probability events, scenario controls and the distinction between inspection and obtainable sources. The former raw monster/chest/altar/gather drop-list branches are not migration targets to restore.

Acquisition owns the existing-route information cutover and its map/source contracts. This design-system change owns readability, theme roles and demonstrated presentation reuse. Its independent acceptance must preserve bounded scrolling, keyboard navigation, direct provider focus and virtual/suppressed-geometry no-focus behavior. It does not authorize new routes, broad acquisition layout changes or revival of removed source helpers.

### Assign the item-detail audit to existing owners

The audit supplies rendered measurements, not new typography or contrast thresholds. Keep the existing 14 CSS px, 4.5:1 text and 3:1 focus contracts. The following assignments avoid parallel fixes to the same primitive:

| Finding                                                                                            | Owner                                              | Approach and verification                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Currency and positive-value contrast                                                               | Task 1.2, then existing route-specific state tasks | Add semantic roles in `app.css` and migrate repeated palette pairs. Measure actual card and striped-row text in both themes.                           |
| Quest objective/class/flag, zone Dungeon, NPC Merchant/Repairs and altar level/scaling/boss badges | Task 4.2                                           | These are informational chips. Repair their rendered size and shared badge semantics together.                                                         |
| Monster `1 of 7` and `(Default)`                                                                   | Task 6.2                                           | These are supporting information, not badge abstractions. Measure at least 14 CSS px.                                                                  |
| All three Mining tables' 12 px headers and compressed Pickaxes sources                             | Task 4.4                                           | Keep the specialized raw tables. Fix header type and allow a readable source width with horizontal exploration on phones.                              |
| Weak sorting/link outlines and paging rings                                                        | Tasks 1.2 and 4.3                                  | Define one focus-visible role, then apply it to shared and raw controls. Keyboard-test and measure at least 3:1 on the actual adjacent table surfaces. |
| Oversized desktop tables and unbounded prose                                                       | New task 4.6                                       | A shared column contract does not yet exist. Promote the proven item-detail wrapping recipe and trim fixed widths at its consumers.                    |
| Split NPC price/currency versus combined item prices                                               | New task 5.4                                       | A shared domain price cell does not yet exist. Extract one representation, preserving links, amounts and sorting.                                      |
| Left-aligned chest Gold and Reward Chance                                                          | Task 4.4                                           | This is numeric table alignment, not a new price abstraction.                                                                                          |

The supplied light-theme measurements use `--muted` at 30% over white for the card and the actual zebra stripe:

| Text shade | Card   | Stripe |
| ---------- | ------ | ------ |
| yellow-600 | 2.85:1 | 2.80:1 |
| yellow-700 | 4.79:1 | 4.70:1 |
| green-600  | 3.13:1 | 3.07:1 |
| green-700  | 4.81:1 | 4.72:1 |

Dark 400 shades passed above 10:1 in the audit. Start currency and positive-value roles at light 700 and dark 400. The stripe margin is thin, so browser measurements on rendered surfaces are acceptance evidence. A planning grep finds 28 exact yellow/green 600/400 pairs in 15 route files, plus two shared-component consumers in `EntityCombatSummary.svelte` and `OnKillFactions.svelte`. Migrate all matches, not a frozen nine-file list. Choose roles by meaning. Class difficulty, category headings and reputation tiers must not become currency merely because they use yellow.

The audit measured sort buttons and links with a 1 px outline using 50% `--ring`, about 1.5:1 in light mode and 1.9:1 in dark mode. Paging uses a 3 px ring of the same weak color. Width alone does not repair contrast. Use an opaque theme-aware focus-visible role that reaches 3:1 against both striped and unstriped backgrounds without changing state or keyboard behavior.

The shared DataTable already uses `minmax(min, auto)` for `minSize` columns and `w-full min-w-min`. Retain that content-sizing behavior. Add an explicit wrapping option to column metadata and apply the item page's `block max-w-64 whitespace-normal` recipe at the shared cell boundary, so a prose column declares its own wrapping instead of every route repeating spans. Remove superseded local wrapping recipes. Do not wrap numeric values indiscriminately or hide long effects.

| Desktop audit surface at 1440 px         | Table width | Available width |
| ---------------------------------------- | ----------- | --------------- |
| Bard Skills, with a 619 px Effect column | 1644 px     | 958 px          |
| Fire Templar Abilities                   | 993 px      | 958 px          |
| `/items`                                 | 1280 px     | 1214 px         |
| `/quests`                                | 1220 px     | 1214 px         |
| `/summons`                               | 1262 px     | 1214 px         |
| `/chests`                                | 1230 px     | 1214 px         |
| `/professions/slayer`                    | 1190 px     | 1086 px         |

Task 4.6 must check each named table's rendered width after wrapping prose and trimming fixed column sizes. On phones, preserve intentional horizontal scrolling rather than squeezing everything into view. The Mining Pickaxes source column was about 94 px wide with rows 87 to 204 px tall. Task 4.4 must check readable source width and full source access without reducing type.

The item `renderVendorCell` combines `5g` or `5 Flame Token` in one right-aligned cell. NPC Items for Sale separates `5` and `Gold` into two columns. Share the item representation through one price-cell component with numeric amount, optional linked currency and optional bundle amount. Keep raw numeric accessors for sorting and preserve free-offer semantics. `unify-number-formatting` owns digit grouping. This change owns presentation and alignment.

### Check drift at the boundary, not with a frozen census

Audit palette utilities, direct color literals, dynamic class construction, and raw control usage in the current tree. A local measurement found raw controls and palette literals, but such counts change as routes migrate; do not encode a repository-wide target count. Prefer a focused check that rejects newly introduced unsanctioned uses and permits narrowly documented map, chart, tooltip, item-quality, and game-authored exceptions. Audit dynamic classes for static enumerability without rejecting valid data-driven colors. Add behavioral tests only for a credible state or interaction regression. Review focus, loading, error, empty, overflow, and no-JavaScript states on changed surfaces. Remove temporary inventory output once checks are in place. Enforce the boundary rather than freezing an inventory of all existing exceptions.

## Risks / Trade-offs

- [Larger type may expand dense tables and charts] → Check overflow and wrapping at 1440×900 and 390×844 before completing each file; preserve visible values.
- [A general lint rule can reject meaningful quality, map, or chart colors] → Scope the checker to semantic interface roles and record narrow exceptions beside the rule.
- [A primitive migration can change rendering or static HTML] → Compare accessible names, keyboard behavior, and HTML without JavaScript for each changed route.
- [Mechanics presentation edits can change visible values] Check the current calculation and formatting tests. CONTRIBUTING.md excludes literal prose snapshots as a correctness gate, and the previously named snapshot script is absent.

## Migration Plan

Change the shared tokens first. Repair the named text and contrast defects file by file. Consolidate shared controls and helpers only after checking each consumer. Add the enforcement check after the repaired patterns are known. Validate with the existing website checks, focused behavioral checks where warranted, and browser review in both themes and both viewport sizes. Ship each coherent family with a clean cutover. Rollback by reverting that family's change, not by retaining parallel styles.
