# Shadowstrike excludes half the offhand from its advertised attack-power percentage

## Summary

Rank-1 Shadowstrike says it deals 200 percent of the Rogue's attack power. Its damage calculation instead subtracts half the offhand weapon's base damage, rounds that subtraction up, adds 1, and then doubles the result.

A Rogue with 120 displayed attack power and a 51-base-damage offhand sent 190 damage into combat resolution, not the advertised 240. Two successful casts repeated the same 190 input.

## Build

- Game version 0.9.35.5
- Steam build 25927597
- `Assembly-CSharp.dll` SHA-256 `92e750550488928ce34298db50d76d5cf9481ec46c94b6719108f08871d4eaf2`

## Impact

The character sheet includes the offhand weapon's full attack-power contribution, but Shadowstrike silently removes half its base damage before applying the advertised percentage. A dual-wielding player overestimates this skill's damage when using the displayed attack power.

## Steps to reproduce

1. Learn rank-1 Shadowstrike on a Rogue, including its Detect Traps prerequisite.
2. Equip a Silver Dagger in the main hand and leave the offhand empty.
3. Read attack power in the character sheet and the skill's 200-percent tooltip. Use Shadowstrike against a training Dummy while facing it from the front.
4. Equip another Silver Dagger in the offhand. Note the increased attack power.
5. Use the same rank of Shadowstrike against the same Dummy. Keep the target and facing unchanged.
6. Repeat both equipment cases after cooldown.

No mods are needed to compare the character sheet, tooltip and combat log. The exact damage input before random variation and mitigation requires instrumentation. The measured example used the level-50 training Dummy in Molten Summit.

## Observed

The level-50 Human Rogue had a Silver Dagger with 51 base damage in the main hand. Equipping a second Silver Dagger increased displayed attack power from 69 to 120. Both weapons had positive durability. The running game's tooltip said:

```text
A swift, stealthy stab that deals 200% of your attack power as physical damage
```

The target was level 50 with 250 Armor Class and 345,000 maximum Health. The attacker and target faced opposite directions on every recorded hit, excluding the rear-hit bonus.

| Equipment | Trial | Attack power | Tooltip percentage applied to attack power | Measured damage input | Dummy Health before | Dummy Health after | Measured Health loss |
|---|---:|---:|---:|---:|---:|---:|---:|
| Empty offhand | 1 | 69 | 138 | 140 | 345,000 | 344,873 | 127 |
| Empty offhand | 6 | 69 | 138 | 140 | 345,000 | 344,884 | 116 |
| Silver Dagger offhand | 4 | 120 | 240 | 190 | 345,000 | 344,831 | 169 |
| Silver Dagger offhand | 5 | 120 | 240 | 190 | 345,000 | 344,837 | 163 |

Attack power, damage inputs and Health values are runtime measurements. The tooltip-percentage column is arithmetic from the displayed attack power, not a second damage measurement. The inputs were read from the game's own `Combat.DealDamageAt` arguments while the corresponding damage event was in flight. The Health loss is a separate reading after the damage was applied.

The measured inputs match these source-derived calculations:

- Empty offhand: `(69 + 1) * 2 = 140`.
- Occupied offhand: `(120 - Ceil(51 / 2) + 1) * 2 = 190`.

The post-mitigation figures are also consistent with the source. With equal levels, no rear-hit bonus and 250 Armor Class, a normal noncritical 140 input can lose 110 to 134 Health after the game's random variation and armor rounding. A 190 input can lose 149 to 182. All four measured losses fall in their respective bands. A 240 input would instead produce a normal noncritical band of 189 to 231, above both measured occupied-offhand hits.

## Expected

The percentage uses the attack power shown to the player, or the tooltip explicitly describes its different basis. The current tooltip does not disclose either the offhand subtraction or the added 1.

## Cause

`server-scripts/Equipment.cs:GetDamageBonus` includes the damage bonus of each equipped, usable item. `server-scripts/UICharacterInfo.cs:Update` displays `player.combat.damage` as attack power.

`server-scripts/TargetDamageSkill.cs:ApplyDamage` starts physical damage from `combat.damage`. For a Rogue with an item in equipment slot 13, it subtracts `CeilToInt(offhandWeapon.damageBonus * 0.5f)`. It then adds the skill's `damage.Get(skillLevel)` and multiplies by `damagePercent.Get(skillLevel)`.

The subtraction checks only that the offhand slot holds an item, so it also runs for an offhand at zero durability, whose damage the character sheet no longer counts. [A bow or offhand weapon at zero durability removes damage it no longer provides](broken-offhand-subtracts-damage-it-never-gave.md) reports that case.

The running rank-1 Shadowstrike asset supplied `damage=1` and `damagePercent=2`. Its tooltip only advertises the percentage of attack power.

`server-scripts/Combat.cs:DealDamageAt` applies random variation, facing and level adjustments, then Armor Class reduction and possible critical damage. The equal-level, opposite-facing fixture isolates those later steps. The measured pre-mitigation input shows that the discrepancy already exists before them.

## Evidence

- [Empty-offhand character sheet and current skill tooltip](evidence/shadowstrike-empty-offhand-before.webp): 69 attack power and the 200-percent description.
- [Occupied-offhand character sheet, tooltip and combat log](evidence/shadowstrike-equipped-offhand-after.webp): 120 attack power, the unchanged description, and the first 127- and 169-damage hits.
- `probe.statSheet` independently read attack power as 69 and 120 in the two equipment cases. The per-hit event reader recorded the inputs and Health changes in the table.

The mods read state and drove the game's `PlayerSkills.CmdUpgrade`, `PlayerSkills.CmdUse` and equipment commands. The attribution hook only read the arguments to `Combat.DealDamageAt`. The formula is in game logic and is independent of macOS CrossOver.

## Notes

- Instrumentation: the scratch Rogue BugRogueOctober was created through the normal character creator. The approved old scratch fixture Wardreentry was removed to free its roster slot. The game was then relaunched and redirected before creation.
- Experience was awarded through the game's normal experience setter to reach level 50. Ambush, Adrenaline Rush, Tangle Trap, Deadly Strike, Sprint, Unstoppable and Detect Traps were learned as prerequisites through `CmdUpgrade`, followed by rank-1 Shadowstrike. No attribute points were spent.
- Real Silver Dagger items were materialized in the weapon slots. Removing the offhand for the repeat used `PlayerEquipment.CmdUnequip`. Rage was restored, the Dummy's Health was restored, and Shadowstrike's cooldown was cleared between instrumented trials. None of these changes altered the skill's damage fields or the target's Armor Class.
- The character was moved beside the Dummy. A nearby Mummy killed the first unprotected setup before measurement. The character was respawned through `CmdRespawn`, made invulnerable for the fixture, and the nearby Mummy's AI was paused. Only the four subsequent successful Shadowstrike hits are in the table. Additional attempts without a landing were excluded.
- The skill was assigned to the bar with `PlayerSkillbar.AssignSkillToSkillbar`. The game's character sheet, combat-log tab and skill hover methods were used. The context panel was moved away from an optional mod HUD without changing its text.
- One earlier scratch session terminated during fixture setup before the damage measurements. The run was relaunched and redirected again. No crash behavior is part of this defect claim.
- `game.useScratchDatabase` returned `isScratch=true` before world entry in every session. The player save SHA-256 was `19d7665fd542a59f3d5f65167df4888d8ae4892d2956aaf37eaef8fb3ab4bd97` before launch, after the interrupted setup, and after the final `game.quit`.
- Screenshot PNG SHA-256 values were checked before WebP conversion: `feefee1dd1dd51388b7f654bfaa2915cac486297f121ba93d5b4a4bb9a85b708` and `7692815495fc5932b993c8ac0146e10fb4ec37f415ae52139bce4b5725847db1`.
