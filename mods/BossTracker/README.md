# BossTracker

BossTracker is an unofficial MelonLoader mod for Ancient Kingdoms players tracking nearby bosses, elites, and fabled monsters. It lists their status, direction, distance in yd, and respawn countdowns.

[Download BossTracker.dll](https://ancient-kingdoms.compendiums.org/mods/BossTracker.dll)

## Setup

Install MelonLoader as [Mods for players](../../README.md#mods-for-players) describes, then put BossTracker.dll in the game's `Mods` folder.

## Use

The panel appears in the world, above the game's monster info panel in the bottom-right corner. Hold Right Shift and drag it with the left mouse button to move it. Monster names follow the game's language wherever the game translates them. The panel's own labels are in English.

## Settings

Dragging saves the panel position in the game's `UserData/MelonPreferences.cfg`, under `BossTracker`. You can also change its width, maximum height and font size there. [BossTracker.cs](BossTracker.cs) defines the settings and defaults.

## Limits

Respawn countdowns appear only in a world you host, solo play included. The game does not send respawn deadlines to other players. Monsters outside the loaded area are not listed.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers build requirements, deployment, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
