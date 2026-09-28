## Context

`ItemPopupDetails` has no pack or random source fields (`website/src/lib/queries/popup.ts:1102-1119`). Its loader returns other item source families (`website/src/lib/queries/popup.ts:1519-1543`), and `ItemPopup.svelte` renders those families (`website/src/lib/components/map/ItemPopup.svelte:134-515`). The detail-page source queries already join `item_sources_pack` and `item_sources_random` to parent items and sort deterministically (`website/src/lib/server/item-sources.ts:476-516`). The audit identified 48 items whose only recorded sources belong to these families.

## Goals / Non-Goals

**Goals:** Show the two missing source families with the same names, quantities, and chances as the item detail page.

**Non-Goals:** Change the recipe-material reader, map marker selection, item detail page, or data export. A pack or random item is not a new physical marker.

## Decisions

1. Add two typed arrays to `ItemPopupDetails` and query the junction tables in `loadItemPopupDetails`. Follow the joins and ordering in `getPackSources` and `getRandomSources` (`website/src/lib/server/item-sources.ts:476-516`). This uses the published browser database; importing server-side `better-sqlite3` helpers into the browser is not valid. Fetch names, IDs, amounts, and probabilities. Quality can supply source-link color if the existing popup convention uses it.
2. Render Found in Packs and Found in Random Loot only when nonempty, alongside current source sections. Show pack amounts and percentages without turning quantities into probabilities (`website/src/routes/items/[id]/+page.svelte:1241-1259,2150-2173`). Use `MapItemLink` for both source IDs; it supports in-map selection and modifier-click URL navigation (`website/src/lib/components/map/MapItemLink.svelte:52-62`).
3. Do not add virtual containers to `hasFocusableSources` (`website/src/lib/components/map/ItemPopup.svelte:56-67`) or `resolveVirtualSelection` (`website/src/lib/map/resolve-selection.ts:102-149`). A container-only item shows a complete popup but has no physical bounds. An item with other physical sources retains its existing focus action.
4. Implement on top of the concurrent recipe-reader change in `popup.ts` (`website/src/lib/queries/popup.ts:1392-1438` is its current read area). Insert source reads outside that recipe block and preserve the revised recipe-material query. Reject the legacy pointer to `obtainability.ts`: the active server reader is `item-sources.ts`.

## Risks / Trade-offs

- [Popup sections add height] → Keep the established per-section scroll cap and confirm the popup and mobile drawer remain usable.
- [Chance or amount is misreported] → Compare a pack-only and random-only item against the detail page in the browser; use source-table values without synthesizing a chance for packs.
- [Parallel recipe edits conflict] → Read the current `popup.ts` just before implementing, then edit only the pack and random source parts.

## Migration Plan

No database migration is needed. The source junction tables and detail-page readers already exist. Rollback removes the two popup arrays and sections only.
