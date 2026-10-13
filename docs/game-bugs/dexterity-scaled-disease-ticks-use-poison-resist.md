# Dexterity-scaled disease damage over time is reduced by Poison Resist

## Summary

A Dexterity-scaled disease debuff lands against the target's Disease Resist and shows disease damage, but each tick is reduced by the target's Poison Resist. Rank-10 Virulent Slash on the Ancient Cyclops, which has 300 Poison Resist and 400 Disease Resist, ticked for 460 in all 46 observed ticks. Disease Resist would give 433.

## Build

- Game version 0.9.35.1
- Steam build 25863605
- `Assembly-CSharp` SHA-256 `342a45d0fb266a00f75795a525bb7e1c4e907839e8769563333cc8cf0adb5cfc`

## Impact

Disease Resist does not protect against these ticks, and Poison Resist protects against them although they are disease damage. A Ranger's Virulent Slash deals more damage than intended to targets with more Disease Resist than Poison Resist and less to targets with more Poison Resist. The same code handles monster disease debuffs that do not scale with Intelligence, such as Blightstorm and Rotting Infestation, so source shows a player's Poison Resist reducing those ticks too. Only Virulent Slash on a monster was measured here.

## Steps to reproduce

No mods are needed.

1. Spend 50 veteran points, learn rank 10 of the Ranger veteran skill Virulent Slash, and equip a melee weapon. Note Dexterity in the character window.
2. Cast Virulent Slash on the Ancient Cyclops in Crescent Coast.
3. Read the damage numbers of its ticks. Recast after a resisted cast.
4. Compare them with the tick before resistance, 500 plus 150% of Dexterity, rounded. Reducing that by 15% for 300 Poison Resist, rounded up, gives the observed number. Reducing it by 20% for 400 Disease Resist does not.

## Observed

A level-50 Human Ranger had 28 Dexterity and rank-10 Virulent Slash, with a Silver Dagger in the main hand. The debuff on the Cyclops recorded level 10 and a bonus attribute of 28. The Cyclops was level 55 with 300 Poison Resist and 400 Disease Resist, read from its live combat component on every tick.

| Session | Casts | Resisted | Ticks | Every tick |
|---|---:|---:|---:|---:|
| 1 | 10 | 2 | 41 | 460 |
| 2 | 1 | 0 | 5 | 460 |

The tick before resistance is 500 + round(28 × 1.5) = 542. With Poison Resist, 542 − ceil(542 × 0.15) = 460. With Disease Resist, 542 − ceil(542 × 0.20) = 433. No critical tick occurred, as expected at the caster's 0.84% critical chance.

## Expected

A disease debuff should be reduced by Disease Resist, as the same function does for Intelligence-scaled disease debuffs and as the landing roll does for every disease debuff.

## Cause

Among poison and disease debuffs, `server-scripts/Skills.cs:GetFinalDamageDoT` handles those that scale with Intelligence first, and there it subtracts Disease Resist from a disease debuff. The next branch catches every other `isPoisonDebuff || isDiseaseDebuff` debuff, adds 150% of the stored Dexterity bonus attribute, and subtracts the victim's Poison Resist for a monster, player or pet victim. A later `isDiseaseDebuff` branch that would subtract Disease Resist is unreachable, because the earlier branch already took every disease debuff.

`server-scripts/TargetDebuffSkill.cs:Apply` rolls a disease debuff's landing against `GetProbResistDisease`, and `server-scripts/Skills.cs:GetOverTimeDamageType` reports its ticks as disease damage.

## Evidence

- [Tick on the Ancient Cyclops](evidence/disease-tick-460-on-ancient-cyclops.webp): a 460 tick above the Cyclops, with Virulent Slash on its target frame.
- The table counts live server-side ticks. A sampler inside the game recorded each change of the caster's damage meter, which `Skills.cs:RecordOverTimeMeterValue` raises by each tick's damage. Ticks arrived once per second while the debuff was active. The caster's dagger auto attacks also raised the meter by 46 to 55 every 1.4 seconds and are excluded from the table.

The mods read state and drive the game's own `Player.CmdSetTarget`, `PlayerSkills.CmdUse` and `Player.CmdRespawn` commands. The defect is in game logic, not the macOS CrossOver platform.

## Notes

- Instrumentation: the CombatVerification fixture builder raised the scratch character to level 50 with 60 veteran points through the game's experience setter, bought the veteran ranks with the game's upgrade commands, and added a Silver Dagger to the inventory and equipped it with the game's equip command. Mana was restored before each cast, the character was kept beside the Cyclops and made invincible so the Cyclops could not interrupt the measurement. None of these change a tick's damage or the Cyclops's resistances.
- The character died once between the sessions, after invincibility was released, and was respawned through the game's command before session 2.
- The session was redirected with `game.useScratchDatabase` before opening the world. It returned `isScratch=true`. The player save SHA-256 was `daddc764f792ea75be91ee4f8d335053ec41de7678bd641a6192225248631b00` before launch and after `game.quit`.
