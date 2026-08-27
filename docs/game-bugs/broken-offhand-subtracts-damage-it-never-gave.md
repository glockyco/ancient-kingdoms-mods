# A bow or offhand weapon at zero durability removes damage it no longer provides

## Summary

A Ranger or a Rogue whose slot 13 item reaches zero durability loses that item's damage from every
melee attack, although an item at zero durability contributes nothing to begin with.

## Build

| Field | Value |
|---|---|
| Game version | 0.9.31.0 |
| Steam build | 24925347 |
| Assembly hash | `0bef5c978745771c5482e6b5cb1931dbfe8527b621d48a60d1ef1c411cb8aeba` |

## Impact

A level 50 Ranger with a broken bow dealt one fifth of the melee damage of the same Ranger with the bow
unequipped. The measured means were 53 and 271 per landed hit.

The character sheet cannot show the problem. Attack power reads the same in both cases, because the
sheet reports the aggregate that already excludes the broken item. A player sees an unchanged attack
power and five times less damage, and unequipping the broken bow raises the damage.

A Rogue carries a weapon in the same slot, so the same loss applies at half the offhand weapon's damage.

## Steps to reproduce

1. Create a Ranger and reach a level where a bow and a one-handed melee weapon are both available.
2. Equip the melee weapon in the weapon slot and the bow in the bow slot.
3. Attack a target with a melee skill. Note the damage numbers.
4. Keep fighting, without repairing, until the bow's durability reaches zero.
5. Attack the same target with the same melee skill. The damage falls by the bow's own damage value.
6. Unequip the broken bow and attack again. The damage rises, although the character now wears less.

Step 6 is the decisive comparison. Wearing a broken bow is worse than wearing nothing in that slot.

## Observed

Level 50 Ranger. Emberwyrm Cleaver, damage 425, in slot 12. Emberwyrm Warbow, damage 375, in slot 13.
Melee Attack at level 1, whose own damage is 1. Target: Ancient Cyclops, level 55, defense 700.

| Slot 13 | Attack power the game reports | Expected damage before mitigation | Mean dealt per landed hit | Landed hits |
|---|---|---|---|---|
| Bow, durability 10 | 864 | 490 | 283.9 | 14 |
| Bow, durability 0 | 469 | 95 | 53.2 | 12 |
| Empty | 469 | 470 | 271.2 | 10 |

The second and third rows report the same attack power and differ by a factor of 5.09 in damage. The
expected figures differ by 4.95.

Individual hits, second row: 55, 56, 50, 53, 56, 53, 54, 55, 80, 53, 53, 51, 50. The 80 is a critical
hit and is excluded from the mean.

Individual hits, third row: 291, 280, 284, 269, 266, 276, 252, 267, 275, 252.

## Expected

An item that contributes no damage should not have damage removed on its behalf. The correction that
excludes a bow from a melee attack should test the same condition the aggregation tests.

## Cause

`Equipment.GetDamageBonus` counts an item only when it has durability
(`server-scripts/Equipment.cs:230-247`):

```csharp
if (slot.amount > 0 && slot.durability > 0)
```

The correction that removes the bow tests only that the slot is occupied
(`server-scripts/TargetDamageSkill.cs:218-222`):

```csharp
if (caster is Player { className: "Ranger" } player5 && player5.equipment.slots[13].amount > 0)
{
    WeaponItem weaponItem = (WeaponItem)player5.equipment.slots[13].item.data;
    num -= weaponItem.damageBonus;
}
```

The Rogue correction immediately below it has the same shape and removes half the offhand weapon's
damage (`server-scripts/TargetDamageSkill.cs:223-227`). `server-scripts/FrontalDamageSkill.cs:88-92`
repeats the Ranger form.

Attribute bonuses are also gated on durability
(`server-scripts/PlayerEquipment.cs:258`), so an item at zero durability contributes nothing at all
while still being subtracted.

## Evidence

Readings were taken with the game pointed at a scratch database. Damage per hit was recorded by sampling
the combat meter every frame, so each recorded value is one landed hit rather than an average.

The Ranger case was measured. The Rogue case is read from the source line above and was not measured.

## Notes

Instrumentation, none of which is part of the defect:

- The character was brought to level 50 and given equipment through the game's own commands.
- The bow's durability was set to zero directly. A player reaches the same state by use.
- The character was made invincible so the test target could not end the run.
- The mods used read game state and drive the game's own command handlers.

The installation is macOS CrossOver. The defect is in game logic: the two conditions above differ in the
decompiled assembly and a developer can confirm it by reading them.

No screenshot is included. A useful one would place two character sheets side by side, both reporting
the same attack power while the damage differs fivefold.
