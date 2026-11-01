# Pocket Compendium

Pocket Compendium is an unofficial MelonLoader mod for Ancient Kingdoms players. It shows when every boss, elite, and fabled monster spawns, the skill cooldowns of the ones you fight, and every monster's full Bestiary page. Each feature can be switched off on its own.

[Download PocketCompendium.dll](https://ancient-kingdoms.compendiums.org/mods/PocketCompendium.dll)

## Setup

Install MelonLoader as [Mods for players](../../README.md#mods-for-players) describes. Remove BossSkillTracker.dll and BetterBestiary.dll from the game's `Mods` folder if they are there, because Pocket Compendium replaces them. Then put PocketCompendium.dll in the `Mods` folder.

## Use

### Boss list

The list shows the bosses, elites, and fabled monsters of your zone, then the ones you watch from other zones, grouped by zone. Each row shows the monster's level in the game's level colours, its state, and in your zone the distance with an arrow to its spawn point or altar. A state is Up, the time to the next spawn, a dice for a spawn that can fail, an hourglass when a spawn is due, a moon or sun for a time-of-day window, a shield for guards that must die first, the altar's item for altar monsters, or an eye for monsters seen or not seen on someone else's server. Hover a row for the rule behind its state.

Click a row to watch the monster, and shift-click it to open its Bestiary page. Watched monsters carry a gold corner and stay listed in every zone. The style button switches to compact tiles, which show the header while you point at them. The settings page filters by tier, level, zone, and discovery. The filters never hide a watched monster, and the monsters they hide collapse into one line per zone.

In a world you host, every time is exact. On someone else's server, the mod estimates from deaths you see, corpses you find, and a dedicated server's kill notices, and marks those times with `~`. It remembers them per server.

### Boss skills

The panel lists the monsters fighting you or your pet. Out of combat, select a boss, elite, or fabled monster to preview it. Drag a monster's header to move the panel, and drag its bottom-right corner to scale it. The compact button shrinks the rows, the lock button stops dragging and scaling, and the settings button opens the Boss skills settings.

### Bestiary pages

Every monster's Bestiary page shows its stats, lore, every drop, and a skill summary, before you meet or kill it. Hover a drop to see the item's stats, whether or not it has dropped for you. On a Bestiary page, click **Skills** to open the monster's skills. Hold Alt and left-click any monster in the world to open its page. Clicks on the interface are ignored.

With a gamepad, move right past the last column of the monster grid to reach the drops, down from the drops to the **Skills** button, and left to return to the grid. The focused drop shows its tooltip.

### Language

Monster names, skill names, zones, classes, and item tooltips follow the game's language wherever the game translates them. Skill summaries and the mod's own labels are in English.

## Settings

Press F8 to open the settings window. Each feature has a page with its switch and options, and **Reset this page** restores that page's defaults. The Layout page locks every panel, moves every panel back to its default place, and chooses the key that opens the window. The key does nothing while you type in a text field.

Pocket Compendium saves its settings in the game's `UserData/MelonPreferences.cfg`, one section per page, such as `PocketCompendium_BossList` and `PocketCompendium_Layout`. A panel saves its place, size, and lock in its feature's section, and `PocketCompendium_Watchlist` holds the watched monsters. On someone else's server, the mod keeps its estimates in `UserData/PocketCompendium/Worlds`.

## Limits

The skill panel finds monsters near you, not every monster in the zone. In a world you host, the next-special timer is exact. On someone else's server, the game does not send that deadline, so the mod estimates it from the casts it sees.

On someone else's server, the list knows what you see and what a dedicated server announces. A player-hosted world announces nothing, and no server announces elites. After a server restarts, a boss the game shows to every player can read Up until someone enters its zone.

If a monster's Bestiary page fails to draw, the game shows its own page for that monster until you restart. If a feature fails, it stops until you restart, and the other features keep running. Both write the error to `MelonLoader/Latest.log`.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers build requirements, deployment, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
