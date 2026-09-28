## 1. List Data and Entity Overviews

- [ ] 1.1 Add mapped-position availability to monster and NPC overview loader rows (`website/src/routes/monsters/+page.server.ts`, `website/src/routes/npcs/+page.server.ts`) and their row types. Verify a positioned and an unpositioned row return distinct availability values.
- [ ] 1.2 Add mapped-position availability to altar and gathering-resource overview loader rows (`website/src/routes/altars/+page.server.ts`, `website/src/routes/gather-items/+page.server.ts`) and their row types. Verify absent horizontal coordinates do not produce a map action.
- [ ] 1.3 Add quest availability from mapped giver and turn-in NPCs to `website/src/routes/quests/+page.server.ts`; verify a turn-in-only quest is eligible and a quest without a mapped NPC is not.
- [ ] 1.4 Add compact Map cells to all five overviews (`website/src/routes/{monsters,npcs,altars,gather-items,quests}/+page.svelte`). Verify every eligible row links to its own entity and ineligible rows show a non-link dash.

## 2. Profession and Zone Rows

- [ ] 2.1 Add mapped-position availability to Hunter monsters and Herbalism plants in both profession loaders, then add compact actions to both target tables. Verify eligible targets link to the correct entity type and ineligible targets show a dash.
- [ ] 2.2 Add compact location cells to the monster, altar, NPC, chest, and trap tables in `website/src/routes/zones/[id]/+page.svelte`. Use each row's coordinates from `+page.server.ts`; verify positioned rows link to their own entities and null-position rows show a dash.

## 3. Integration Verification

- [ ] 3.1 Run focused route-data or rendering checks that exercise mapped, unmapped, and quest turn-in-only rows. Verify all seven new surfaces and the five zone-table families meet the spec without changing the four pre-existing linked surfaces.
- [ ] 3.2 Open representative links in the actual website at 1440×900 and 390×844. Verify entity selection and map bounds, a missing-position dash, and readable overflow on list and zone tables.
