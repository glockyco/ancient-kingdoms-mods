# Pocket Compendium

Pocket Compendium is an unofficial MelonLoader mod for Ancient Kingdoms players. It shows the skill cooldowns of the bosses, elites, and fabled monsters you fight, and every monster's full Bestiary page. Each feature can be switched off on its own.

[Download PocketCompendium.dll](https://ancient-kingdoms.compendiums.org/mods/PocketCompendium.dll)

## Setup

Install MelonLoader as [Mods for players](../../README.md#mods-for-players) describes. Remove BossSkillTracker.dll and BetterBestiary.dll from the game's `Mods` folder if they are there, because Pocket Compendium replaces them. Then put PocketCompendium.dll in the `Mods` folder.

## Use

### Boss skills

The panel lists the monsters fighting you or your pet. Out of combat, select a boss, elite, or fabled monster to preview it. Drag a monster's header to move the panel. The compact button shrinks the rows, and the lock button stops dragging.

### Bestiary pages

Every monster's Bestiary page shows its stats, lore, every drop, and a skill summary, before you meet or kill it. Hover a drop to see the item's stats, whether or not it has dropped for you. On a Bestiary page, click **Skills** to open the monster's skills. Hold Alt and left-click any monster in the world to open its page. Clicks on the interface are ignored.

With a gamepad, move right past the last column of the monster grid to reach the drops, down from the drops to the **Skills** button, and left to return to the grid. The focused drop shows its tooltip.

### Language

Monster names, skill names, zones, classes, and item tooltips follow the game's language wherever the game translates them. Skill summaries and the mod's own labels are in English.

## Settings

Pocket Compendium saves its settings in the game's `UserData/MelonPreferences.cfg`, one section per feature: `PocketCompendium_BossSkills` and `PocketCompendium_BestiaryPages`. Set `Enabled` to `false` to switch a feature off. The skill panel saves its position, compact mode, and lock there when you change them. `SkillsButton` turns off the Bestiary page's Skills button and panel.

## Limits

The skill panel finds monsters near you, not every monster in the zone. In a world you host, the next-special timer is exact. On someone else's server, the game does not send that deadline, so the mod estimates it from the casts it sees.

If a monster's Bestiary page fails to draw, the game shows its own page for that monster until you restart. If a feature fails, it stops until you restart, and the other features keep running. Both write the error to `MelonLoader/Latest.log`.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers build requirements, deployment, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
