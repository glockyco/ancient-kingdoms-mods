# Game defects

Defects in Ancient Kingdoms itself, recorded so the developer can act on them. Each report reproduces the defect against a running game and names the source members that produce it.

Defects in this repository do not belong here. Fix those in the code that owns them. `skill://game-defect-reports` states the boundary and the procedure.

| Report | Effect on a player | Reproduced |
|---|---|---|
| [A mercenary's energy multiplier never affects its energy](mercenary-energy-multiplier-is-never-used.md) | A Warrior or Rogue mercenary gains nothing from its resource quality roll and nothing from veteran progression, while a mana user gains up to 50 percent at the veteran cap. | Yes |
| [Choosing Fire Goblin silently changes a selected Druid to Warrior](fire-goblin-silently-changes-druid-to-warrior.md) | A player who picks the class before the race can create a Warrior while intending a Druid. Fire Goblin allows Druid, so nothing marks the change. | Yes |
| [The Adventurer's Guide joins a skill's cast time and cooldown into one word](adventurers-guide-joins-cast-time-and-cooldown.md) | 190 of the 474 skill pages in the in-game guide (0.9.35.0) show text such as `0.5s cast45s cooldown`, so the two values read as one. | Yes |
| [Moving the only equipped backpack into its first storage slot hides the backpack](moving-the-only-backpack-into-its-first-storage-slot-hides-it.md) | A player who drops their only equipped backpack onto the first storage slot loses sight of it: neither inventory window shows it, and the game gives no message. | Yes |
| [Resurrection calculates restored Mana from maximum Health](resurrection-restores-mana-from-maximum-health.md) | A character's Health pool, rather than Mana pool, determines how much Mana resurrection restores. | Yes |
| [Two-point veteran skills reduce displayed progression and lose points on reset](two-point-veteran-skills-lose-points-and-progression.md) | Learning a two-point Bard veteran skill lowers displayed Veteran Level and the next-point experience requirement. Resetting refunds only one of the two points paid. | Yes |
| [A potion refused inside a dungeon still ends invisibility and starts its recharge](refused-dungeon-potion-ends-invisibility.md) | Trying to drink the Elixir of the Wildstride in a dungeon leaves it in the bag but makes a hidden character visible and starts its 10-second recharge. | Yes |
| [Archer Shot joins its bow requirement and range](archer-shot-joins-bow-requirement-and-range.md) | The skill tooltip displays `Requires Bow8 yd range` with no separator. | Yes |
| [Bandages promises twice the healing it delivers](bandages-tooltip-promises-twice-the-healing.md) | The item promises 250 Health but adds only 125 beyond natural regeneration in two measured uses. | Yes |
| [Light of the Heavens does not heal players](light-of-the-heavens-does-not-heal-players.md) | The Cleric's "all nearby allies" heal restores nearby mercenaries but excludes their injured owner. | Yes |
| [Shadowstrike excludes half the offhand from its advertised attack-power percentage](shadowstrike-excludes-half-the-offhand-from-its-percentage.md) | A Rogue with 120 attack power and a 51-damage offhand dagger gets rank-1 damage computed from 190 before mitigation, not the advertised 240. | Yes |
| [Fisherman's Hat and Trousers label their slot as Chest](fishermans-hat-and-trousers-label-their-slot-as-chest.md) | Two inventory tooltips say Chest although the costumes equip to Head and Legs. | Yes |
| [Beryllium Pickaxe's description misspells intricate](beryllium-pickaxe-description-misspells-intricate.md) | The English item description says `intrincate` instead of `intricate`. | Yes |

Each report states the game version and Steam build it was observed on. The Archer Shot, Bandages, Light of the Heavens and Shadowstrike reports were observed on 0.9.35.5, Steam build 25927597. The resurrection, two-point veteran skill and dungeon potion reports were observed on 0.9.35.1, Steam build 25863605. The Adventurer's Guide and backpack reports were observed on 0.9.34.0, Steam build 25548782. The two earlier character-creation and mercenary reports were observed on 0.9.31.0, Steam build 24925347.

Reproduction used a scratch database, so no player save was reached. For the 0.9.31.0 reports, the player save content hash was unchanged after every run. For the 0.9.34.0 reports, the player save modification time predates each run, and only the scratch database changed.

For the 0.9.35.1 reports, `game.useScratchDatabase` returned `isScratch=true` before world entry in every measurement session. For the resurrection and two-point veteran skill reports, the player save SHA-256 was `053a241a1d60551fbfc80914c4afef977c66f98935df86467ab3b3c5a6aeeb0e` before the first launch and after each session ended, including the final `game.quit`. The dungeon potion report records its own session's unchanged hash.

For the 0.9.35.5 reports, `game.useScratchDatabase` returned `isScratch=true` before every world entry. The player save SHA-256 was `19d7665fd542a59f3d5f65167df4888d8ae4892d2956aaf37eaef8fb3ab4bd97` before the first launch, after the first session's `game.quit`, after an interrupted scratch setup, and after the final `game.quit`.
