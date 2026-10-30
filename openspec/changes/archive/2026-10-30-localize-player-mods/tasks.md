# Tasks

## 1. Shared localization helper

- [x] 1.1 Add `mods/Shared/GameText.cs` (names, terms, class and zone lookups, font application) and `mods/Shared/ZoneNames.cs` (pure zone-name matching), link them into BetterBestiary, BossTracker and BossSkillTracker. Verify: `dotnet run --project build-tool build` succeeds.
- [x] 1.2 Add `mods/Shared/BuildInfo.cs` and log version and build commit at each published mod's initialization. Verify: `MelonLoader/Latest.log` shows the commit for each mod.

## 2. BetterBestiary

- [x] 2.1 Localize the detail page (name, lore references, level label, class, zone, durability, number format, fonts). Verify: page screenshots in en, es, zh and ja.
- [x] 2.2 Localize the Skills button, panel title and skill names, and apply fonts to every mod-made label. Verify: zh and ja screenshots with the panel open.
- [x] 2.3 Show every drop with the computed loot layout and extra slots. Verify: unit tests for the layout boundaries, and an in-game sweep showing every listed drop for every monster.
- [x] 2.4 Isolate render failures per monster and hide the Skills button whenever the mod does not draw the page or the setting is off. Verify: a simulated failure for one monster leaves other pages drawn by the mod.
- [x] 2.5 Show no kill count for monsters the game does not count. Verify: Alt+Click page of a normal monster.
- [x] 2.6 Remove the auto-add setting, the list insertion and the grid fallback. Verify: build, and Alt+Click still opens normal and unique monsters.
- [x] 2.7 Add gamepad focus for loot slots and the Skills button, with tooltips on focus, patched so that a missing game method does not stop the other patches. Verify: a virtual gamepad moves focus grid to loot to Skills and back, and the tooltip shows.

## 3. Trackers

- [x] 3.1 BossTracker: TMP label with game fonts, translated names from the entity name, fabled label, yd distances, no coordinate line, default position above the hover panel with old-default migration. Verify: screenshots in en and ja, and the hover panel uncovered.
- [x] 3.2 BossSkillTracker: translated monster and skill names, game fonts on its labels. Verify: ja screenshot in a fight.

## 4. Verification and documentation

- [x] 4.1 Run the .NET test projects and `dotnet run --project build-tool build`.
- [x] 4.2 In-game sweep and real-pointer hover of every monster page in all four languages as host, and in English and Chinese as a LAN client. Verify: no anomalies.
- [x] 4.3 Update the READMEs of the three mods, and the mod catalogue if a description changes. Verify: `pnpm check:docs`.
