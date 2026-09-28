## 1. Contract and shared color roles

- [ ] 1.1 Update `website/DESIGN.md:14-15,139-157,189-220` with a 14 CSS px rendered-text floor, theme-aware link and achievement roles, and text/non-text contrast thresholds. Verify the declared scale has no smaller informational-text role and agrees with the new spec.
- [ ] 1.2 Add the matching light and dark tokens and Tailwind role mappings in `website/src/app.css:7-114,116-171`. Verify rendered reference links and achievement markers at 1440×900 and 390×844 in light and dark mode against the declared roles and contrast floor.

## 2. High-visibility readable text, one file at a time

- [ ] 2.1 Repair scaled labels and thresholds in `website/src/lib/components/professions/MasteryCurve.svelte:42,85-89,109-171`; preserve plotted values and the accessible chart description. Verify the Mining tier/no-gain curve and Slayer reduction curve at 1440×900 and 390×844 in light and dark mode; measure painted text size and check horizontal exploration.
- [ ] 2.2 Repair the three responsive charts in `website/src/routes/mechanics/experience/+page.svelte:66,208-215,273-280,342-407,599-655,810-865,1403-1407`. Verify their labels, curves, and legends at 1440×900 and 390×844 in light and dark mode; no labels or explanatory values clip.
- [ ] 2.3 Repair the chart and route-local text scale in `website/src/routes/mechanics/mercenary-stats/+page.svelte:699-712,714-1249`. Keep the local comparison layout and calculations. Verify labels, controls, tables, and chart results at 1440×900 and 390×844 in light and dark mode; measure SVG label size.
- [ ] 2.4 Enlarge the formula blocks and undersized supporting text in `website/src/routes/mechanics/combat/+page.svelte:344-351,375-378,429-436,568,575,645,1213,1603` without changing formula content. Verify each formula remains legible and reachable at 1440×900 and 390×844 in light and dark mode; run the mechanics snapshot comparison if visible text changes.
- [ ] 2.5 Replace off-scale informational type in `website/src/routes/+page.svelte:400-449` with the new minimum and hierarchy. Verify footer links and section labels at 1440×900 and 390×844 in light and dark mode, with keyboard focus and no horizontal clipping.
- [ ] 2.6 Repair NPC-role chips and other small text in `website/src/lib/components/map/MapTooltip.svelte:119-145` without changing marker behavior. Verify NPC and keyed-chest tooltips at 1440×900 and 390×844 in light and dark mode; ensure their labels remain readable inside the map viewport.

## 3. State contrast, one route at a time

- [ ] 3.1 Replace low-contrast probability text in `website/src/routes/gather-items/[id]/+page.svelte:217-223` with theme-aware state styles and explicit values. Verify each probability band at 1440×900 and 390×844 in light and dark mode, measuring contrast against its actual background.
- [ ] 3.2 Replace low-contrast calculation values in `website/src/routes/altars/[id]/+page.svelte:249-273` without changing the effective-level or adjustment calculation. Verify positive and negative results at 1440×900 and 390×844 in light and dark mode, including keyboard operation and text contrast.
- [ ] 3.3 Repair the growth legend in `website/src/routes/mechanics/experience/+page.svelte:334-340` after the chart-size task. Verify its growth-state meaning and contrast at 1440×900 and 390×844 in light and dark mode; run mechanics snapshots if visible text changes.

## 4. Tokens and existing primitives

- [ ] 4.1 Migrate `EntityLink.svelte:59,89-100`, `ItemLink.svelte:53-55`, `map/MapItemLink.svelte:38-40`, and repeated prose links to the reference-link role without a second entity-link component. Work through one route family per edit. Verify each changed route's link destinations, names, hover, and focus at 1440×900 and 390×844 in light and dark mode.
- [ ] 4.2 Compare existing `badge/badge.svelte:4-21` with hand-rolled category and status chips; reuse or adjust its semantics for proven equivalents, including the map-tooltip chips only if their shape and role match. Verify every changed route's chip meaning and readability at 1440×900 and 390×844 in light and dark mode.
- [ ] 4.3 Audit raw buttons and inputs against `lib/components/ui/button`, `lib/components/ui/input`, and actual route behavior. Migrate proven equivalents by route family; keep specialized controls local when they need distinct semantics. Verify focus, disabled state, label, and result for each changed route at 1440×900 and 390×844 in light and dark mode.
- [ ] 4.4 Audit raw tables, header classes, and card containers against `lib/components/ui/table`, `lib/components/ui/data-table`, and `lib/components/ui/card`. Migrate only semantically matching structures, file by file. Verify headings, complete data, keyboard order, and responsive overflow on each changed route at 1440×900 and 390×844 in light and dark mode and without JavaScript.
- [ ] 4.5 Inventory repeated page-shell and section patterns by route family. Share only a demonstrated role or keep it route-local, then remove superseded local recipes. Verify each changed route at 1440×900 and 390×844 in light and dark mode, including static facts and navigation without JavaScript.

## 5. Domain-specific duplication

- [ ] 5.1 Give map-sidebar RGB tuple conversion one owner and migrate `map/sidebar/MapSidebar.svelte:182-191` and `MapSidebarContent.svelte:86-95`. Verify map-layer icons and toggle colors at 1440×900 and 390×844 in light and dark mode; preserve the map's registry and deck.gl allocation boundaries.
- [ ] 5.2 Give NPC category colors one owner and migrate `RoleBadges.svelte:30-38` and `routes/npcs/[id]/+page.svelte:52-60`. Verify all role categories and service links on the NPC detail and overview surfaces at 1440×900 and 390×844 in light and dark mode.
- [ ] 5.3 Compare the three ordinary drop lists plus random-outcome variants in `map/EntityPopup.svelte:637-660,990-1031,1210-1241,1334-1357`; share only identical rendering and keep range/outcome behavior distinct. Verify monster, chest, altar-boss, and gathering popups at 1440×900 and 390×844 in light and dark mode, including a no-drop state.

## 6. Site-wide drift and enforcement

- [ ] 6.1 Measure current palette literals, direct colors, dynamic classes, primitive bypasses, and small rendered text by file. Review dark mode, focus, loading, error, empty, overflow, and no-JavaScript states. Record narrow map, chart, tooltip, game-art, and item-quality exceptions; verify the audit covers every route family and discard temporary output after ownership is assigned.
- [ ] 6.2 Repair remaining informational text below the minimum and low-contrast state text from the file audit, one file at a time. Verify each changed route at 1440×900 and 390×844 in light and dark mode, measuring actual rendered sizes and contrast rather than source declarations.
- [ ] 6.3 Add focused checks for new unsanctioned palette literals, unenumerable dynamic classes, and primitive bypasses that violate the accepted role contract. Verify that an ordinary raw state color fails while an approved map or quality color passes; connect the checks to the existing website check path without a permanent census.

## 7. Independent combat-simulator decision and final verification

- [ ] 7.1 **Independent, droppable:** If `routes/tools/combat-simulator/+page.svelte` remains published, migrate its small controls and dense table text at lines 1251-1353 without changing calculations. Verify sorting, filtering, DPS comparison, and readable text at 1440×900 and 390×844 in light and dark mode. If the owner replaces the page, remove this task only after verifying the replacement meets the same spec.
- [ ] 7.2 Run focused tests for changed observable states, `pnpm check`, `pnpm lint`, and `pnpm build`. For any intentional mechanics text change, run `node scripts/snapshot-mechanics.mjs --update`, inspect the visible diff, and rerun without `--update`. Verify prerendered detail facts with JavaScript disabled, review all changed routes at 1440×900 and 390×844 in light and dark mode, then run `openspec validate consolidate-website-design-system --strict`.
