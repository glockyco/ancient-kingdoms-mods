# A mercenary's energy multiplier never affects its energy

## Summary

A Warrior or Rogue mercenary's rolled resource quality and its whole veteran resource gain are stored,
accumulated and saved, and nothing ever reads them, while the same values change a Cleric's mana.

## Build

- Game version 0.9.31.0
- Steam build 24925347
- `Assembly-CSharp` SHA-256 `0bef5c978745771c5482e6b5cb1931dbfe8527b621d48a60d1ef1c411cb8aeba`

## Impact

Every mercenary that uses energy is affected, which is the Warrior and the Rogue. Two of them hired at
the same level have the same energy however their quality rolled, so the roll means nothing for them
while it means up to 15 percent for a mana user.

Veteran progression is the larger loss. The game adds 0.0025 to a mercenary's resource multiplier for
each veteran point its owner earns, so at the 200 point cap a mana user reaches 50 percent more mana.
An energy user gains nothing at all, and the number the game shows for its quality keeps rising.

## Steps to reproduce

No mods are needed to see this. A player can compare two hires.

1. Take a character to a level where two mercenaries can be hired at once.
2. Hire two Warrior mercenaries.
3. Note each one's maximum energy while neither wears equipment.
4. Hire two Cleric mercenaries and note each one's maximum mana, again without equipment.

The two Warriors have the same maximum energy. The two Clerics do not have the same maximum mana.

## Observed

Four mercenaries, each at level 50 with an empty equipment panel.

| Archetype | Resource | Multiplier the game stored | Maximum |
|---|---|---|---|
| Warrior | Energy | 0.9781271 | 670 |
| Warrior | Energy | 1.0234858 | 670 |
| Cleric | Mana | 0.9022695 | 780 |
| Cleric | Mana | 0.9162585 | 787 |
| Cleric | Mana | 0.9251274 | 792 |

The two Warriors differ by 4.6 percent in multiplier and not at all in maximum energy. The three
Clerics differ by 2.5 percent in multiplier and their maximum mana differs accordingly.

## Expected

The multiplier scales the resource, as it does for mana and for health. `Mana.max` and `Health.max`
both multiply their base curve by their multiplier.

## Cause

`Energy.max` never reads `multiplierEnergy`:

```csharp
// server-scripts/Energy.cs:27-39
public override int max
{
    get
    {
        int num = 0;
        int num2 = baseEnergy.Get(level.current);
        foreach (IEnergyBonus bonusComponent in bonusComponents)
        {
            num += bonusComponent.GetEnergyBonus();
        }
        return num2 + num;
    }
}
```

`Mana.max` does read its own:

```csharp
// server-scripts/Mana.cs:31
int num3 = (int)Math.Round((float)baseMana.Get(level.current) * multiplierMana);
```

`multiplierEnergy` is declared at `server-scripts/Energy.cs:19-21` and written in eight places: the
hire roll at `server-scripts/Player.cs:9815`, the veteran accumulation at `Player.cs:9832`, the four
level-up paths at `Player.cs:4529`, `4572`, `4615` and `4660`, and the reload at `Player.cs:9972` and
`9990`. Outside the generated network plumbing in `Energy.cs`, nothing reads it.

## Evidence

Readings were taken with a mod that reads state and drives the game's own `CmdBuyMercenary` and
`CmdDismissMercenary` commands. The mercenaries were hired with the price the game itself calculates.
No value in the table above was written by a tool: each multiplier is the one the game rolled at hire.

The defect is in game logic and not in the platform. The two code paths differ in the source, and the
reproduction only shows what that difference produces.

## Notes

- Instrumentation: gold was added through the game's own `CmdAddGold` command so the hires could be
  paid for, and the game's own price function supplied the price. Neither touches a resource value.
- The run used a scratch database. The player save kept its content hash.
- Not tested: whether a player character's own energy is affected. A player's energy multiplier stays
  at 1, so the same defect would have no visible effect there.
