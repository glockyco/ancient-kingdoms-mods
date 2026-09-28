## 1. Physical selection identity

- [ ] 1.1 Make marker-owned selection strategies and index metadata the sole physical selection identity in `marker-registry.ts`, `selection.ts`, and `resolve-selection.ts`. Verify monster spawn versus entity IDs, fishing groups, and unpositioned selection with focused `selection.test.ts` cases.
- [ ] 1.2 Replace physical ID/type branching in `routes/map/+page.svelte:205-230,462-511` with the shared resolver. Verify click, map search, URL restore, browser history, and hover reach the same popup and highlights.
- [ ] 1.3 Keep item and quest database-backed overrides distinct from physical selection. Verify a source item highlights only its exact fishing variant and an altar-only monster highlights its altars in `selection.test.ts`.

## 2. Popup ownership

- [ ] 2.1 Extract family-specific `EntityPopup.svelte` bodies and their lazy detail loads without losing portal, NPC, monster, trap, or other family information. Verify every family against the existing desktop popup and preserve the current wording corrections.
- [ ] 2.2 Replace the duplicate desktop and drawer `{#if}` dispatches in `routes/map/+page.svelte:1190-1343` with one owner-based popup host. Verify equivalent close, focus, select, and hover actions on both surfaces.

## 3. Decoration production

- [ ] 3.1 For every `selection` and `decorations` field in `marker-registry.ts:97-120`, connect a real production consumer or delete the field. Compare the declarations against the produced layer IDs and verify no declaration remains inert in a focused marker registration test.
- [ ] 3.2 Move patrol routes, wander ranges, relation arcs, altar radii, trap areas and destinations, portal destination arcs, and NPC teleport arcs from independent `layers.ts` branches to their source marker owners. Preserve precomputed selection arrays and verify each selected/visible layer's observable output.
- [ ] 3.3 Preserve semantic draw order, physical portal identity, and stable URL visibility keys. Verify the `golden.test.ts` full layer list includes every registered point layer and expected decoration after reviewing intentional ID changes.

## 4. Remove zone focus and duplicates

- [ ] 4.1 Remove `ZoneFocusSelect.svelte` and its sidebar/page focus state only after preserving recent accessibility work. Verify the sidebar still supports zone visibility and selected-zone navigation.
- [ ] 4.2 Remove the `zone` focus parser/writer, `zone-filter.ts` wrapper, and zone dimensions of GPU filters in `url-state.ts`, `layers.ts`, and page state. Verify old `zone` links load without filtering, while `szone`, monster level, and NPC role behavior remains intact.
- [ ] 4.3 Remove duplicated entity-type unions and obsolete selection, popup, layer, and visibility switches in `MapLink.svelte`, `+page.svelte`, and consumers. Verify existing `entity`/`etype` links and marker `layers` keys still round-trip.

## 5. Integrated map review

- [ ] 5.1 Exercise map search, selection, popups, visibility, and browser back/forward at 1440×900 and 390×844 in a real browser. Verify corrected tooltip and popup copy survives the family split.
- [ ] 5.2 Run focused map selection and registry tests, then `pnpm check`, `pnpm lint`, and the website build. Verify no obsolete wrappers remain and update changed map documentation and tests without pinning internal wording.
