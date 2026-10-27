# BossSkillTracker

BossSkillTracker is an unofficial MelonLoader mod for Ancient Kingdoms players who want to see enemy skill cooldowns. It shows when the bosses, elites, and fabled monsters you fight can next use a special skill.

[Download BossSkillTracker.dll](https://ancient-kingdoms.compendiums.org/mods/BossSkillTracker.dll)

## Setup

Install MelonLoader as [Mods for players](../../README.md#mods-for-players) describes, then put BossSkillTracker.dll in the game's `Mods` folder.

## Use

The panel lists the monsters fighting you or your pet. Out of combat, select a boss, elite, or fabled monster to preview it. Drag a monster's header to move the panel. The compact button shrinks the rows, and the lock button stops dragging.

## Settings

Moving the panel or changing its compact and lock controls saves your choices in the game's `UserData/MelonPreferences.cfg`, under `BossSkillTracker`. [Config.cs](Config.cs) defines the settings and defaults.

## Limits

The panel finds monsters near you, not every monster in the zone. In a world you host, the next-special timer is exact. On someone else's server, the game does not send that deadline, so the mod estimates it from the casts it sees.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers build requirements, deployment, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
