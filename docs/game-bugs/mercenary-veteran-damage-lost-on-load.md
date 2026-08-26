# A mercenary loses its veteran base damage every time the game loads

## Summary

A mercenary keeps the health and resource it gained from veteran levels, but loses all of the base damage and base magic damage it gained from the same veteran levels as soon as the game reloads it.

## Build

- Game version 0.9.31.0
- Steam build 24925347
- `Assembly-CSharp.dll` SHA-256 `0bef5c978745771c5482e6b5cb1931dbfe8527b621d48a60d1ef1c411cb8aeba`

## Impact

Each veteran level adds one base damage and one base magic damage to an active mercenary. It also adds 0.0025 to the mercenary's health multiplier and resource multiplier.

After a reload the mercenary holds its full multiplier gain and none of its damage gain. A player at the 200 point veteran cap therefore loses 200 base damage and 200 base magic damage on the mercenary, and keeps the whole health gain of 0.5.

The loss is silent. Nothing in the interface reports it, and the mercenary looks the same.

## Steps to reproduce

1. Take a character to the level cap.
2. Hire a mercenary. Note its damage.
3. Earn veteran experience with the mercenary active. Each veteran level adds one to the mercenary's base damage.
4. Note the mercenary's damage again. It is higher.
5. Quit to the desktop and start the game again.
6. Load the same character and look at the mercenary. Its damage is back to the value it had when it was hired. Its health is still the higher value.

## Observed

One character at level 50 with 0 veteran points hired the mercenary `Borvik`, then earned 10 veteran points, then reloaded.

| Quantity | At hire | After 10 veteran points | After reload | Stored in the save |
|---|---|---|---|---|
| `combat.baseDamage.baseValue` | 27 | 37 | **27** | 27 |
| `combat.baseMagicDamage.baseValue` | 27 | 37 | **27** | not stored |
| `health.multiplierHealth` | 1.004374 | 1.0293746 | **1.029374** | 1.004374 |
| `health.max` | | 5257 | 5257 | |

The health multiplier survives the reload. The two damage values do not.

## Expected

Both gains come from the same branch, so a reload should keep both or keep neither.

## Cause

`Player.LevelUpMercenaries(bool isVeteran)` applies the veteran gain to the live mercenary. `server-scripts/Player.cs:4527-4537`:

```csharp
obj.NetworkmultiplierHealth = obj.multiplierHealth + 0.0025f;
...
NetworkactiveMercenary.combat.baseDamage.baseValue++;
NetworkactiveMercenary.combat.baseMagicDamage.baseValue++;
```

The save holds only the values rolled at hire. `Database.SaveNewMercenary` is the sole writer of `multiplierHealth` and `baseCombat` (`server-scripts/Database.cs:1900-1921`), and its only caller is the hire path (`server-scripts/Player.cs:9792`). No later call records the gains.

The reload path rebuilds one gain and not the other. `server-scripts/Player.cs:9971-9993`:

```csharp
component.health.NetworkmultiplierHealth = ((multiplierHealthMercenary > 0f) ? multiplierHealthMercenary : 1f);
component.combat.baseDamage.baseValue = ((baseDamageCombatMercenary > 0) ? baseDamageCombatMercenary : ...);
component.combat.baseMagicDamage.baseValue = ((baseDamageCombatMercenary > 0) ? baseDamageCombatMercenary : ...);
...
int totalVeteranPoints = ((PlayerSkills)skills).GetTotalVeteranPoints();
Health obj2 = component.health;
obj2.NetworkmultiplierHealth = obj2.multiplierHealth + (float)totalVeteranPoints * 0.0025f;
```

The multiplier is recomputed from the owner's veteran total. The two damage values are assigned from the stored hire roll and never receive the same treatment.

## Suggested fix

Either add the veteran total to the two damage values in the reload path, in the same way as the multipliers, or store the accumulated values in `characters_mercenaries`.

## Evidence

Readings came from the live server objects through a read-only runtime console.

## Notes

- Gold for the hire came from the game's own `CmdAddGold` command. Gold is not part of the defect.
- The run used a scratch database, so no player save was touched. The player save hash was unchanged after every run.
- The defect is in game logic. The reload path and the level-up path are both server code, and the source lines above are enough to confirm the defect without reproducing it.
