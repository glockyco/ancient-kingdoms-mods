# A mercenary hired with a zero damage roll gets new random damage on every load

## Summary

The hire roll for a mercenary's base damage can produce zero. The load path treats a stored zero as missing data, so it rolls a new random value on every load, from a different range than the hire used, and it rolls the two damage values separately.

## Build

- Game version 0.9.31.0
- Steam build 24925347
- `Assembly-CSharp.dll` SHA-256 `0bef5c978745771c5482e6b5cb1931dbfe8527b621d48a60d1ef1c411cb8aeba`

## Impact

A mercenary hired with a zero roll has different damage in every session. The player cannot rely on its output, and repeated loading changes it again.

A character below level 3 always produces a zero roll, because the roll range collapses to a single value. Every mercenary hired by a new character therefore has this defect for the rest of the save.

The hire roll assigns one value to both base damage and base magic damage. The load path rolls each one separately, so the two values stop being equal.

## Steps to reproduce

1. Create a character and keep it at level 1.
2. Hire a mercenary. Its base damage is 0.
3. Raise the character to a higher level, so the fallback range becomes wide.
4. Quit to the desktop and start the game again.
5. Load the character and look at the mercenary. Its base damage is no longer 0.
6. Quit and load again. Its base damage is different again.

## Observed

The mercenary `Grimwald` was hired by a level 1 character, which was then taken to level 50. The save stored `baseCombat = 0` throughout.

| Session | `baseDamage` | `baseMagicDamage` | `multiplierHealth` |
|---|---|---|---|
| At hire, owner level 1 | 0 | 0 | 0.92944396 |
| After the first reload | 14 | 5 | 0.92944396 |
| After the second reload | 28 | 31 | 0.92944396 |

The player took no action between the readings other than loading the game. The stored value stayed 0, so the value is re-rolled on every load and never recorded.

## Expected

A stored zero is a legal result of the hire roll, so the load path should restore it as zero.

## Cause

The hire roll uses the integer overload of `Random.Range`, whose lower bound is inclusive. `server-scripts/Player.cs:9744-9788`, for a Human mercenary:

```csharp
num3 = UnityEngine.Random.Range(0, (int)Math.Round((float)level.current * 0.9f));
```

At owner level 1 this is `Random.Range(0, 1)`, which is always 0. The value is stored as `baseCombat` (`server-scripts/Player.cs:9792`).

The load path treats a stored value of zero or less as absent. `server-scripts/Player.cs:9979-9980`:

```csharp
component.combat.baseDamage.baseValue = ((baseDamageCombatMercenary > 0) ? baseDamageCombatMercenary : UnityEngine.Random.Range(0, (int)Math.Round((float)level.current * 0.8f)));
component.combat.baseMagicDamage.baseValue = ((baseDamageCombatMercenary > 0) ? baseDamageCombatMercenary : UnityEngine.Random.Range(0, (int)Math.Round((float)level.current * 0.8f)));
```

Three separate problems appear in these two lines.

- A legal stored value of 0 selects the fallback.
- The fallback factor is 0.8 for every race. The hire path uses a factor between 0.7 and 0.95 that depends on the race.
- Each line calls `Random.Range` again, so the two values differ. The hire path assigns one roll to both.

The new value is not written back, so the roll repeats on the next load.

## Suggested fix

Use a stored value that marks "not set", such as -1, and keep 0 as a legal roll. When a fallback is still needed, use the race factor from the hire path and assign one roll to both values.

## Evidence

Readings came from the live server objects through a read-only runtime console. The stored value was read from the `characters_mercenaries` table.

## Notes

- Gold for the hire came from the game's own `CmdAddGold` command. Gold is not part of the defect.
- The run used a scratch database, so no player save was touched. The player save hash was unchanged after every run.
- Owner level 1 was chosen because it makes the zero roll certain. The defect also occurs at higher levels whenever the roll happens to produce zero.
