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
- [x] 4.3 Resolve four guide-versus-code disagreements. Binding in dungeons: ruled out, because every soul binder stands outside dungeons and the scroll and spell are refused inside. Mercenary Auto-Consume: ruled out, because a mercenary returns to its idle state after every action in combat. Craft All: ruled out, because no recipe's materials, at any station, fall within another recipe's materials, so the leftovers of one recipe cannot match a different one. Backpack move into the first storage slot: reproduced through simulated drop events on the real slot objects and recorded in `docs/game-bugs/`.
- [ ] 4.4 Resolve the Bard ward disagreement. The guide says that returning to a song's range does not restore an exhausted ward. Aegis Aria is a `BardSongSkill` with the Ward category, so the code reapplies a fresh buff to a recipient without one (`PlayerSkills.cs:1047-1061`). On a level-50 Bard built with `fixture.buildCharacter`, a mercenary inside the aura took a real Sabretooth hit (ward 210 to 130), and its ward returned to 210 only on the song's next cast, every 2.5 seconds. That matches the guide. The leave-and-return case is still untested. It needs the mercenary to be hit, then the Bard to walk out of the 16-unit aura and back between two casts, with the order and movement done through ordinary controls while HotRepl only observes.
- [x] 4.5 Validate the change with `openspec validate integrate-adventurers-guide --strict`.
