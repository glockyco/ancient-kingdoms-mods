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

## Not yet observed

The blessings' effects on the character window, the duration, renewal and the refusals (task 1.2) wait for a session in the game.
