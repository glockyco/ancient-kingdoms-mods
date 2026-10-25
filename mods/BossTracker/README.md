# BossTracker

BossTracker is an unofficial MelonLoader mod for Ancient Kingdoms players tracking nearby bosses, elites, and fabled monsters. It lists their status, direction, distance, and respawn countdowns.

[Download BossTracker.dll](https://ancient-kingdoms.compendiums.org/mods/BossTracker.dll)

## Setup

Install [MelonLoader](https://github.com/LavaGang/MelonLoader) in Ancient Kingdoms. Put BossTracker.dll and [FieldDefaultValueHookFix.dll](https://ancient-kingdoms.compendiums.org/mods/FieldDefaultValueHookFix.dll) in the game's `Mods` folder. The fix prevents a crash on world entry.

## Use

The panel appears in the world. Hold Right Shift and drag it with the left mouse button to move it.

## Settings

Dragging saves the panel position in the game's `UserData/MelonPreferences.cfg`, under `BossTracker`. You can also change its dimensions and font size there. [BossTracker.cs](BossTracker.cs) defines the settings and defaults.

## Limits

Respawn countdowns appear only in a world you host, solo play included. The game does not send respawn deadlines to other players. Monsters outside the loaded area are not listed.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers build requirements, deployment, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
