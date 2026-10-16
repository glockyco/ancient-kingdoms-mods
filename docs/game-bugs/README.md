# Game defects

Defects in Ancient Kingdoms itself, recorded so the developer can act on them. Each report reproduces the defect against a running game and names the source members that produce it.

Defects in this repository do not belong here. Fix those in the code that owns them. `skill://game-defect-reports` states the boundary and the procedure.

| Report | Effect on a player | Reproduced |
|---|---|---|
| [A mercenary's energy multiplier never affects its energy](mercenary-energy-multiplier-is-never-used.md) | A Warrior or Rogue mercenary gains nothing from its resource quality roll and nothing from veteran progression, while a mana user gains up to 50 percent at the veteran cap. | Yes |
| [Choosing Fire Goblin silently changes a selected Druid to Warrior](fire-goblin-silently-changes-druid-to-warrior.md) | A player who picks the class before the race can create a Warrior while intending a Druid. Fire Goblin allows Druid, so nothing marks the change. | Yes |
| [A bow or offhand weapon at zero durability removes damage it no longer provides](broken-offhand-subtracts-damage-it-never-gave.md) | A Ranger with a broken bow deals one fifth of the melee damage of the same Ranger with the slot empty, while the character sheet reports the same attack power. A Rogue's offhand loses half its damage the same way. | Yes |
| [A Ranger carrying only a bow loses the bow's whole damage](a-bow-without-a-melee-weapon-cancels-its-own-damage.md) | A bow build draws nothing from its bow until a melee weapon fills the weapon slot, and the melee weapon's own damage is excluded from bow attacks, so nothing indicates why. | Yes |
| [The Adventurer's Guide joins a skill's cast time and cooldown into one word](adventurers-guide-joins-cast-time-and-cooldown.md) | 190 of the 474 skill pages in the in-game guide (0.9.35.0) show text such as `0.5s cast45s cooldown`, so the two values read as one. | Yes |
| [Moving the only equipped backpack into its first storage slot hides the backpack](moving-the-only-backpack-into-its-first-storage-slot-hides-it.md) | A player who drops their only equipped backpack onto the first storage slot loses sight of it: neither inventory window shows it, and the game gives no message. | Yes |
| [The threat tooltip shows only one third of the maximum Health bonus](threat-tooltip-understates-health-bonus.md) | Taunt shows a +148 bonus at 445 maximum Health but applies +445, understating the threat each cast generates. | Yes |
| [Resurrection calculates restored Mana from maximum Health](resurrection-restores-mana-from-maximum-health.md) | A character's Health pool, rather than Mana pool, determines how much Mana resurrection restores. | Yes |
| [Spell haste stops at 50% in the character window but not when casting](spell-haste-display-cap-does-not-limit-casts.md) | A reachable 58% setup displays 50% but casts a one-second spell with a 0.42-second deadline. | Yes |
| [Two-point veteran skills reduce displayed progression and lose points on reset](two-point-veteran-skills-lose-points-and-progression.md) | Learning a two-point Bard veteran skill lowers displayed Veteran Level and the next-point experience requirement. Resetting refunds only one of the two points paid. | Yes |
| [Dexterity-scaled disease damage over time is reduced by Poison Resist](dexterity-scaled-disease-ticks-use-poison-resist.md) | Virulent Slash ticks for 460 on a target with 300 Poison Resist and 400 Disease Resist, where Disease Resist would give 433. Disease Resist never reduces these ticks. | Yes |
| [A potion refused inside a dungeon still ends invisibility and starts its recharge](refused-dungeon-potion-ends-invisibility.md) | Trying to drink the Elixir of the Wildstride in a dungeon leaves it in the bag but makes a hidden character visible and starts its 10-second recharge. | Yes |
| [Archer Shot joins its bow requirement and range](archer-shot-joins-bow-requirement-and-range.md) | The skill tooltip displays `Requires Bow8 yd range` with no separator. | Yes |
| [Bandages promises twice the healing it delivers](bandages-tooltip-promises-twice-the-healing.md) | The item promises 250 Health but adds only 125 beyond natural regeneration in two measured uses. | Yes |
| [Light of the Heavens does not heal players](light-of-the-heavens-does-not-heal-players.md) | The Cleric's "all nearby allies" heal restores nearby mercenaries but excludes their injured owner. | Yes |
| [Shadowstrike excludes half the offhand from its advertised attack-power percentage](shadowstrike-excludes-half-the-offhand-from-its-percentage.md) | A Rogue with 120 attack power and a 51-damage offhand dagger gets rank-1 damage computed from 190 before mitigation, not the advertised 240. | Yes |

Each report states the game version and Steam build it was observed on. The Archer Shot, Bandages, Light of the Heavens and Shadowstrike reports were observed on 0.9.35.5, Steam build 25927597. The threat tooltip, resurrection, spell haste, two-point veteran skill, disease tick and dungeon potion reports were observed on 0.9.35.1, Steam build 25863605. The Adventurer's Guide and backpack reports were observed on 0.9.34.0, Steam build 25548782. The four earlier combat, character-creation and mercenary reports were observed on 0.9.31.0, Steam build 24925347.

Reproduction used a scratch database, so no player save was reached. For the 0.9.31.0 reports, the player save content hash was unchanged after every run. For the 0.9.34.0 reports, the player save modification time predates each run, and only the scratch database changed.

For the 0.9.35.1 reports, `game.useScratchDatabase` returned `isScratch=true` before world entry in every measurement session. For the first four, the player save SHA-256 was `053a241a1d60551fbfc80914c4afef977c66f98935df86467ab3b3c5a6aeeb0e` before the first launch and after each session ended, including the final `game.quit`. The disease tick and dungeon potion reports record their own sessions' unchanged hash.

For the 0.9.35.5 reports, `game.useScratchDatabase` returned `isScratch=true` before every world entry. The player save SHA-256 was `19d7665fd542a59f3d5f65167df4888d8ae4892d2956aaf37eaef8fb3ab4bd97` before the first launch, after the first session's `game.quit`, after an interrupted scratch setup, and after the final `game.quit`.
