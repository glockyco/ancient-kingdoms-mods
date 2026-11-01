# Tasks

## 1. Calculation

- [x] 1.1 Port the website's boss calculation and its independent-roll formula to pure C# with tests for a guaranteed piece, a Fatecharm, a repeated item, a random item and a quest-flagged item. Verify with `dotnet test tests/PocketCompendium.Tests`.
- [x] 1.2 Add a script beside `gen-skill-effect-parity.ts` that writes a case for every drop of every Bestiary monster from the website's code, and a C# test that reads it. Verify with the script and `dotnet test tests/PocketCompendium.Tests`.
- [x] 1.3 Build the inputs from the game's monster objects and compare them through HotRepl with the export for every monster with a drop table. Verify that the comparison lists no difference, or that each difference is explained in the change folder. Compared on 2026-11-01 in game 0.10.2.0: all 143 exported monsters with a drop table match in boss flag, entry order, item, probability, equipment and quest flags and random outcomes. Herald of War has an empty table in both.

## 2. Observed in game

- [x] 2.1 In a scratch session, kill Xylevis repeatedly and check that every corpse holds an equipment piece, then kill a dungeon boss with its Fatecharm in the main inventory and check for two pieces and the used charm. Verify that the observations are recorded with the build they ran on. Recorded in `observations.md`: both held.
- [x] 2.2 Loot a drop not found yet and check that the game's record and the found mark take it up. Verify the same way. Recorded in `observations.md`: opening a corpse records every drop it holds, and the mark follows.

## 3. Choices players see

- [x] 3.1 Choose the chance's look and rounding, the Fatecharm mark and the found mark through a comparison (compare-options). Decided on 2026-11-01 on Verdant Glacius: the chance with one decimal along the bottom of the slot, the zone's Fatecharm icon in the top-left corner, and a gold check in the top-right corner for found drops. The smallest slots of a 17-drop page are checked in task 4.1.
- [ ] 3.2 Choose the tooltip lines and the altar variants' conditions through a comparison. Verify that the answer is recorded. The player's Hunting bonus needs no line: it applies only to hunt monsters (`Monster.cs:3131`), and no boss, elite or fabled monster is one.

## 4. Pages

- [ ] 4.1 Show the chances, the Fatecharm icons and the tooltip lines as chosen, with one slot per item while chances show. Verify in game on Xylevis, Stalag Terror, an elite, Avatar of Fire, an altar elite and with the game in Japanese.
- [x] 4.2 Mark found drops. Verify in game on a monster with found and not found drops. Verified on 2026-11-01 on Xylevis with one found drop of four.
- [ ] 4.3 Add the drop chances switch, on at first start. Verify in game that switching it off restores the game's order with every entry and keeps the found marks.
- [ ] 4.4 Add the switches for monsters not met and drops not found, on at first start, beside the Skills panel switch, as decided on 2026-11-01. Choose whether a hidden drop's chance shows through a comparison. Verify in game with both switches off on a monster not met and on one with found and not found drops.
- [ ] 4.5 Keep long lore texts off the drops, which about 60 pages' lore covers in the game's layout and would hide the chances. Choose between smaller text, a scrolling lore box and a taller lore area through a comparison. Verify in game on the longest lore texts.
- [ ] 4.6 Show a drop's chance with the Fatecharm while the zone's charm is in the main inventory, with the charm's icon lit, and the chance without it and a dimmed icon otherwise, as decided on 2026-11-01 (`.local/changes/add-bestiary-drop-chances/review/round-2/fatecharm.md`). Verify in game on Captain Aerendyl with the charm in the main inventory, in the backpack and without one.
- [ ] 4.7 Warn before a boss kill uses the player's Fatecharm, also when the charm raises nothing there, in a place that does not depend on the Boss skills panel, which a player may turn off. Choose the place through a comparison with in-game drafts. Verify in game in the Forgotten Catacombs with and without a charm in the main inventory.

## 5. Documentation and records

- [ ] 5.1 Update the README's Bestiary section, worded through a comparison. Verify with `pnpm check:docs`.
- [ ] 5.2 Record each comparison's answer as a case in the vault's Ancient Kingdoms Compendium note. Verify that the note holds the cases.
