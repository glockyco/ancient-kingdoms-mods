# The Chambers of Chaos Waves trial never runs

## Summary

Two of the seven trial slots for chambers 1 and 2 of the Chambers of Chaos are Waves. A Waves chamber becomes a Battle chamber when one wave would hold more than 10 guardians. Every generated chamber holds far more than that, so the Waves trial and its objective `Survive the summoned waves` never appear.

## Build

- Game version 0.10.4.0
- Steam build 26665980
- `Assembly-CSharp` SHA-256 `cab463d2d0bcc770f417ffd4d72ac6723226676a2b291fca89bb78bf93bfb2d8`

## Impact

Players never meet one of the six trial kinds. A run that draws Waves plays a Battle chamber instead, so Battle comes up about twice as often as the trial list suggests.

## Steps to reproduce

No mods are needed.

1. Reach level 40, carry the item Mordrath asks for and enter the Chambers of Chaos through him on the fifth floor of Vault of the Vanished.
2. Read the quest tracker's objective in chambers 1 and 2.
3. Repeat over several runs. The tracker shows the Battle, Riddle, Runes and Manuscript objectives, but never `Survive the summoned waves`.

## Observed

- Six recorded runs drew Waves for a chamber, read from the run's trial list before the chamber opened. Each of those chambers opened as Battle, with 106 to 163 guardians.
- The game's own layout generator was called for 330 chambers from random seeds, and the game's own quota method gave each chamber's Waves population. No chamber came within the limit. The smallest population was 52, against a limit of 10.

## Expected

A Waves chamber should run as waves in at least some layouts, as the trial list and the Waves objective text imply.

## Cause

`server-scripts/MadMageTower.cs:StartTrial` sums `PopulationQuotas` over every hall and passage of the chamber, then switches Waves to Battle when `population * 3 > 30`. `server-scripts/MadMageTowerRules.cs:HallGuards` gives each hall at least 6 Waves guardians and `PassageGuards` each passage at least 3, so a chamber with more than one hall already exceeds 10. The limit appears to have been meant for one wave in one hall, or for a smaller multiplier.

## Evidence

- The run observations read `MadMageTower.instance.runs[player]` on the server before and after each chamber opened: the drawn trial list, the trial kind that started, and the live guardian count.
- The sample called `MadMageTowerRoom.GenerateLayout(seed, room)` and `MadMageTower.PopulationQuotas(layout, MadMageTrialKind.Waves)` for rooms 0 and 1 of 165 random seeds, in batches of 15 seeds.

The mods read state and call the game's own methods. Entry used the game's own keeper command. The defect is in game logic, not the macOS CrossOver platform.

## Notes

- Instrumentation: the scratch character was granted entry items, and some runs ended through a server-side death to start the next run sooner.
- The session was redirected with `game.useScratchDatabase` before opening the world. It returned `isScratch=true`. The player save SHA-256 was `03040824a179286647a4fd5cebfe0fb19b20121627c0eea45822f6bd44cde883` during the sampling session and after `game.quit`.
