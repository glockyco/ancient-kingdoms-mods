# Observations

Game 0.10.2.1, Steam build 26363666, export session `20261101T184840Z-d25f8767`.

## Shrines

The World scene holds twelve `VirtueShrine` objects, two for each virtue, each in a different overworld zone. `virtue_shrines.json` lists them with these positions:

| Virtue | Zone | Position |
| --- | --- | --- |
| Compassion | Crescent Coast | 638.0, 514.2 |
| Compassion | Twilight Forest | -41.1, 133.1 |
| Honor | The Lone-Lands | 242.6, 190.9 |
| Honor | The Molten Summit | 394.2, 793.2 |
| Sacrifice | Crescent Coast | 354.0, 379.8 |
| Sacrifice | The Lone-Lands | 206.7, 329.5 |
| Humility | Everfrost | 233.7, 892.6 |
| Humility | The Molten Summit | 595.0, 930.8 |
| Honesty | Northern Wastes | 649.0, 1232.6 |
| Honesty | Twilight Forest | 239.7, -105.4 |
| Valor | Everfrost | 199.2, 950.0 |
| Valor | Northern Wastes | 479.0, 1247.5 |

## Reads through the interop assembly

Each of these returned the game's values in the export run:

- `VirtueText.Entries`, the private text table. Its English column gave every virtue name, summary, rank effect, `rank.initial` ("Apprentice") and `shrine.name` ("Shrine of {0}").
- `VirtueRules.Thresholds` (0, 100, 500, 2000, 6000, 15000), `TitleEnglish` and `HumilityMultiplier` (0.5, 0.6, 0.65, 0.8, 0.9, 1.05).
- `VirtueEncounters.EscortPoints` (75) and `ReturnPoints` (30).
- One `VirtueBlessingSkill` asset for each virtue, `blessing_of_<virtue>`.

## Blessings on a scratch character

Character HomeArt, level 38, with every virtue at 15,000 points (rank 5) and a Dreadguard Breastplate for a nonzero Armor Class. Each blessing was taken at its shrine through `Player.CmdActivateVirtue` after the game's own portal teleport to the shrine. The values are the character window's sources, `Combat` and `Health`, read on the host.

| Blessing | Before | After | Code |
| --- | --- | --- | --- |
| Humility | Armor Class 145, Poison 70, Disease 50 | 152, 74, 52 | `Combat.cs:ApplyVirtueDefense`, `VirtueRules.HumilityMultiplier` (1.05 at rank 5, rounded to nearest even) |
| Sacrifice | Health 3,515 of 3,515 | 3,515 of 3,726 | `Health.cs:max`, `Player.VirtueHealthMultiplier` (1 + 1% × (rank + 1)). Current Health stays, as `BeginVirtueBlessing` restores it. |
| Honor | Accuracy 2.30%, Critical resist 17.30% | 7.30%, 27.30% | `Player.VirtueAccuracy` (1% per rank), `Player.VirtueCriticalResist` (2% per rank) |
| Compassion, Valor | no character window change | | their effects apply to healing and damage in `VirtueCombat` |

Each activation replaced the blessing before it and set 10,800 seconds (180 minutes). After about 6 seconds, renewing Valor set the time back to 10,800 rather than adding to it.

Refusals, each leaving the active blessing unchanged:

- Sacrifice at 14,999 points (rank 4) kept Valor active (`sacrifice.required`).
- Honesty with a collected lost item not yet returned (`VirtueEncounters.HasPendingReturns`) kept no blessing active (`ve.lost.pending`). Activating Honesty without one started the search with 10 lost sites.

## Stranded adventurers and Honor points

`VirtueEscortStats.TryForDungeon` returned, for every dungeon, the level and Health the zone pages show, for example Lizardmen's Den level 30 with 4,350 Health and Old Valorath level 57 with 29,925 Health. Trial of the Ancients has none. The game counts a monster by its `idZone`, and 155 Plague Rats, 61 Valorath Burrowers and other monsters standing in Old Valorath carry zone 0. The pages therefore select a dungeon's monsters by `monster_spawns.loot_zone_number`.

`VirtueRules.HonorPoints` for the level 38 character gave Kyshf (level 35) 28 points and Gildrath (level 60) 108. The monster pages show points for a player at the monster's level, 28 and 54, which is the same formula with Gildrath's level bonus of 5 instead of 10 (`VirtueRules.CombatPoints`).
