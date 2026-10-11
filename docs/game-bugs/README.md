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

Each report states the game version and Steam build it was observed on. The threat tooltip, resurrection, spell haste and two-point veteran skill reports were observed on 0.9.35.1, Steam build 25863605. The Adventurer's Guide and backpack reports were observed on 0.9.34.0, Steam build 25548782. The four earlier combat, character-creation and mercenary reports were observed on 0.9.31.0, Steam build 24925347.

Reproduction used a scratch database, so no player save was reached. For the 0.9.31.0 reports, the player save content hash was unchanged after every run. For the 0.9.34.0 reports, the player save modification time predates each run, and only the scratch database changed.

For the 0.9.35.1 reports, `game.useScratchDatabase` returned `isScratch=true` before world entry in every measurement session. The player save SHA-256 was `053a241a1d60551fbfc80914c4afef977c66f98935df86467ab3b3c5a6aeeb0e` before the first launch and after each session ended, including the final `game.quit`.
