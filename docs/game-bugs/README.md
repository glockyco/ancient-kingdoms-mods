# Game defects

Defects in Ancient Kingdoms itself, recorded so the developer can act on them. Each report reproduces the defect against a running game and names the source lines that produce it.

Defects in this repository do not belong here. Fix those in the code that owns them. `skill://game-defect-reports` states the boundary and the procedure.

| Report | Effect on a player | Reproduced |
|---|---|---|
| [A mercenary loses its veteran base damage every time the game loads](mercenary-veteran-damage-lost-on-load.md) | A mercenary silently loses one base damage and one base magic damage for every veteran level it earned, on every load. At the veteran cap that is 200 of each. It keeps the whole health gain. | Yes |
| [A mercenary hired with a zero damage roll gets new random damage on every load](mercenary-zero-damage-roll-rerolls-every-load.md) | A mercenary whose hire roll produced zero has different damage in every session. The roll is certainly zero at owner level 1 and possible at any level. The two damage values also stop being equal. | Yes |
| [Choosing Fire Goblin silently changes a selected Druid to Warrior](fire-goblin-silently-changes-druid-to-warrior.md) | A player who picks the class before the race can create a Warrior while intending a Druid. Fire Goblin allows Druid, so nothing marks the change. | Yes |

All three were observed on game version 0.9.31.0, Steam build 24925347.

Reproduction used a scratch database, so no player save was reached. The player save content hash was unchanged after every run.
