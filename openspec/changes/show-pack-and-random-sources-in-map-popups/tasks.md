## 1. Popup Data

- [ ] 1.1 After the recipe-reader update, add typed pack and random arrays to `ItemPopupDetails` in `website/src/lib/queries/popup.ts`; verify the browser-side loader returns names, IDs, amounts, and probabilities for representative sourced items.
- [ ] 1.2 Query `item_sources_pack` and `item_sources_random` in `loadItemPopupDetails` with the established item joins and ordering; verify empty families return empty arrays and an item with only these families still loads.

## 2. Popup Presentation

- [ ] 2.1 Add conditional Found in Packs and Found in Random Loot sections to `website/src/lib/components/map/ItemPopup.svelte`; verify amounts and percentage chances match the item detail page and source links select their items.
- [ ] 2.2 Keep container-only sources out of physical focus eligibility. Verify a container-only item shows no focus action while an item with an existing mapped source keeps its focus action.

## 3. Browser Verification

- [ ] 3.1 Open pack-only and random-only items in the live map popup at 1440×900 and 390×844. Verify source names, numbers, item navigation, and scroll behavior against their detail pages.
