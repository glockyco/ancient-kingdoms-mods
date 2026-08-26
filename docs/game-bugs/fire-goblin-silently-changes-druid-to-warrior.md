# Choosing Fire Goblin silently changes a selected Druid to Warrior

## Summary

The character creator lets a Fire Goblin be a Druid, but selecting Fire Goblin while Druid is selected changes the class to Warrior without telling the player.

## Build

- Game version 0.9.31.0
- Steam build 24925347
- `Assembly-CSharp.dll` SHA-256 `0bef5c978745771c5482e6b5cb1931dbfe8527b621d48a60d1ef1c411cb8aeba`

## Impact

A player who selects the class first and the race second can create a Warrior while intending to create a Druid. Nothing marks the change. The Druid button stays enabled and keeps its full colour, so the interface continues to offer Druid as an available choice.

For every other race that forbids a class, the game disables the button and greys the icon. Fire Goblin is the only race that changes the selection while still presenting the class as available.

## Steps to reproduce

1. Open character creation.
2. Select the Human race.
3. Select the Druid class. The Druid icon is framed as selected.
4. Select the Fire Goblin race.
5. Look at the class panel. Warrior is now framed as selected. Druid is still coloured and still clickable.

## Observed

| Step | `druidActiveFrame` | `warriorActiveFrame` | `DruidButton.interactable` | Druid icon colour |
|---|---|---|---|---|
| Human, Druid selected | true | false | true | white |
| After selecting Fire Goblin | **false** | **true** | true | white |
| Dwarf, for contrast | false | true | **false** | **grey** |

The Dwarf row shows the intended presentation. Dwarf forbids Druid, so it disables the button and greys the icon.

## Expected

Two behaviours are self-consistent. Either Fire Goblin allows Druid, in which case the selection must not change, or Fire Goblin forbids Druid, in which case the button must be disabled and the icon greyed like every other forbidden pairing.

## Cause

`server-scripts/UICharacterEditor.cs:1466-1475`:

```csharp
if (classIndexSelected == 5)
{
    changeClassWarrior(isSilent: true);
}
WarriorButton.interactable = true;
ClericButton.interactable = true;
RogueButton.interactable = true;
WizardButton.interactable = true;
RangerButton.interactable = true;
DruidButton.interactable = true;
```

Class index 5 is Druid. The guard forces the selection to Warrior, and the next line leaves the Druid button enabled.

`changeRaceDrassar` and `changeRaceDarkElf` carry the same guard and also disable the button, at `server-scripts/UICharacterEditor.cs:1143-1150` and `1303-1312`. `changeRaceDwarf` disables Druid and Wizard and guards both, at `1389-1396`. Fire Goblin keeps the guard and drops the matching button state, which suggests the guard was left in place when Druid became available to Fire Goblin.

## Suggested fix

Remove the guard from `changeRaceFireGoblin`, because the same method already presents Druid as available.

## Evidence

- `evidence/class-switch-1-druid-selected.webp`: Human with Druid selected.
- `evidence/class-switch-2-after-fire-goblin.webp`: after selecting Fire Goblin. Warrior is framed. Druid is still coloured. The class description on the right now describes Warriors.
- `evidence/class-switch-3-dwarf-greyed-for-contrast.webp`: Dwarf, where the forbidden classes are greyed.

## Notes

- The class buttons were driven through the creator's own public methods, which are the methods its buttons call.
- No character was created, and no player save was touched.
- The defect is in interface logic and needs no mods to observe. A player reproduces it with two clicks.
