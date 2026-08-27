# A Ranger carrying only a bow loses the bow's whole damage

## Summary

A bow attack removes the damage of the first weapon the character wears, and when the only weapon worn
is the bow itself, the bow's damage is removed from its own attack.

## Build

| Field | Value |
|---|---|
| Game version | 0.9.31.0 |
| Steam build | 24925347 |
| Assembly hash | `0bef5c978745771c5482e6b5cb1931dbfe8527b621d48a60d1ef1c411cb8aeba` |

## Impact

A level 50 Ranger holding only a bow of 375 damage draws no damage at all from it. Its bow attacks use
375 less attack power than the same character with any melee weapon in the weapon slot.

Equipping a melee weapon is therefore mandatory for a bow build, and the reason is invisible: the melee
weapon's own damage is excluded from bow attacks by design, so a player has no way to tell that wearing
one restores the bow.

## Steps to reproduce

1. Create a Ranger and obtain a bow, arrows, and a one-handed melee weapon.
2. Equip only the bow. Leave the weapon slot empty.
3. Attack a target with a bow skill. Note the damage numbers.
4. Equip the melee weapon in the weapon slot, without changing anything else.
5. Attack the same target with the same bow skill. The damage rises by the bow's damage value, plus
   whatever the melee weapon's attributes add.

## Observed

Level 50 Ranger. Emberwyrm Warbow, damage 375, in slot 13. Emberwyrm Cleaver, damage 425 and strength
30, in slot 12 for the second reading. Archer Shot at level 1, whose own damage is 1. Target: Ancient
Cyclops, level 55, defense 700.

| Slot 12 | Attack power | Weapon the game resolves | Expected damage before mitigation | Mean dealt per action |
|---|---|---|---|---|
| Empty | 409 | slot 13, the bow itself | 105 | 62.9 |
| Emberwyrm Cleaver | 864 | slot 12, the cleaver | 556 | 380.8 |

The resolved weapon slot was read directly from the game. With the weapon slot empty, the game resolves
the equipped weapon to slot 13 and then subtracts that slot's damage from the attack it is making.

The two damage figures are means per action rather than per landed hit, so each includes actions that the
target blocked. They establish the direction and the size of the effect. The subtraction mechanism itself
is measured exactly in
[the companion report on zero durability](broken-offhand-subtracts-damage-it-never-gave.md), where an
item that contributed nothing was subtracted and the prediction matched the measurement to three
percent.

## Expected

A bow attack should not remove the bow. The subtraction exists to exclude the melee weapon, so it should
apply to the melee weapon or to nothing.

## Cause

The equipped weapon is the first slot holding any weapon, scanning from slot 0 upward
(`server-scripts/Equipment.cs:515-526`):

```csharp
for (int i = 0; i < slots.Count; i++)
{
    ItemSlot itemSlot = slots[i];
    if (itemSlot.amount > 0 && itemSlot.item.data is WeaponItem)
    {
        return i;
    }
}
```

Slot 12 is the weapon slot and slot 13 is the Ranger's bow slot, so an empty weapon slot makes this
return 13. The bow attack then subtracts whatever that call resolved to
(`server-scripts/TargetProjectileSkill.cs:196-201`):

```csharp
num = combat.damage + player2.dexterity.GetRangedAttackBonusPerPoint();
int equippedWeaponIndex = player2.equipment.GetEquippedWeaponIndex();
if (equippedWeaponIndex != -1)
{
    num -= ((WeaponItem)player2.equipment.slots[equippedWeaponIndex].item.data).damageBonus;
}
```

`combat.damage` already contains both weapons, because `Equipment.GetDamageBonus` sums every slot, which
is why the subtraction exists. It removes the wrong slot when the weapon slot is empty.

The same resolution appears in the ammo check, which instead reads slot 13 explicitly for a Ranger
(`server-scripts/TargetProjectileSkill.cs:40-47`). One of the two paths names the bow slot directly and
the other searches for it.

## Evidence

Readings were taken with the game pointed at a scratch database. The resolved weapon index and the
attack power were read from the live player. Damage was recorded from the combat meter across a fixed
window while a bow skill was driven through the game's own command handler.

## Notes

Instrumentation, none of which is part of the defect:

- The character was brought to level 50 and given equipment through the game's own commands.
- Arrows were placed in the inventory, since a bow skill requires them.
- The character was made invincible so the test target could not end the run.
- The mods used read game state and drive the game's own command handlers.

The installation is macOS CrossOver. The defect is in game logic: the two source paths above disagree
about how the bow slot is found, and a developer can confirm it by reading them.

Not tested: whether a Rogue's offhand weapon shows the matching effect when the weapon slot is empty.
The Rogue correction reads slot 13 directly rather than through the search, so it is expected not to.
