## 1. Guide export and coverage

- [x] 1.1 Add `GameGuideExporter` and its model, register it, and cover it in `ExporterRegistrationTests`.
- [x] 1.2 Load `game_guide.json` into a `game_guide_articles` table, and fail when the file is absent.
- [x] 1.3 Add the coverage map and `coverage.db.test.ts`.
- [x] 1.4 Add the `guide_topic` search family and verify that a guide title search opens its section.
- [x] 1.5 Run a game export, rebuild the database, and confirm 64 articles load.

## 2. New mechanics pages

- [x] 2.1 Party and Loot: `/mechanics/party`.
- [x] 2.2 Guilds: `/mechanics/guilds`.
- [x] 2.3 Death and Remains: `/mechanics/death`, with inbound links from experience and inventory.
- [x] 2.4 Character Build: `/mechanics/character`.
- [x] 2.5 Bard Songs and Charm: `/mechanics/bard`.
- [x] 2.6 Crafting and Augments: `/mechanics/crafting`.
- [x] 2.7 Housing and Appearance: `/mechanics/housing`.
- [x] 2.8 World and Travel: `/mechanics/world`.
- [x] 2.9 Group the mechanics index by the guide's categories.

## 3. Existing pages

- [x] 3.1 Inventory: durability and repair, armor sets, consumables, merchants, bank, templates, backpacks, and item movement.
- [x] 3.2 Combat, monster spawns, and reputation.
- [x] 3.3 Professions, quests, adventuring, altars, and Slayer.
- [x] 3.4 Mercenaries and summons.
- [x] 3.5 Class guides, the Utility category, and learning requirements in the class skill table.

## 4. Verification

- [x] 4.1 Run the citation check, the coverage test, `pnpm check`, `pnpm lint`, and `pnpm build`.
- [x] 4.2 Review each new and changed page in a browser.
- [ ] 4.3 Reproduce each guide-versus-code disagreement in the game, then record confirmed defects in `docs/game-bugs/`.
- [x] 4.4 Validate the change with `openspec validate integrate-adventurers-guide --strict`.
