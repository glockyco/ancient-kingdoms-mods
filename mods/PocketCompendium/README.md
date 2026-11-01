# Pocket Compendium

Pocket Compendium is an unofficial MelonLoader mod for Ancient Kingdoms. It tells you when every boss, elite, and fabled monster spawns and where, announces the ones you watch, and shows every monster's full Bestiary page before you meet it. It only shows information. Nothing it does changes a fight, a drop, or a spawn.

![The boss list in Crescent Coast with Ancient Cyclops up, Xylevis respawning in 23:33, a chance spawn and an altar boss, and two watched monsters from Twilight Forest. Xylevis's spawn point counts down in the world, and an arrow at the screen's edge points to Ancient Cyclops, 215 yd away.](../../assets/pocket-compendium-world.webp)

[Download PocketCompendium.dll](https://ancient-kingdoms.compendiums.org/mods/PocketCompendium.dll)

## Install

1. Install MelonLoader as [Mods for players](../../README.md#mods-for-players) describes.
2. If the game's `Mods` folder holds BossTracker.dll, BossSkillTracker.dll, or BetterBestiary.dll, remove them. Pocket Compendium replaces all three.
3. Put PocketCompendium.dll in the `Mods` folder and start the game.

The boss list appears on the left when you enter a world. Press F8 for the settings, where each feature has its own switch.

## Boss list

The list shows the bosses, elites, and fabled monsters of your zone, then the ones you watch from other zones. Hover a row for its spawn rule, when it was killed, and where it spawns.

| In a row | Meaning |
| --- | --- |
| Up | It is alive. |
| Swords and In combat | It is alive and fighting. |
| A time | It respawns in that time. |
| A dice and a time | It may spawn then. The tooltip gives the chance. |
| An hourglass and Due | Its time has passed. It spawns, or rolls, when someone is in its zone. |
| A moon or a sun | It spawns only at night or only by day. The time says when its window opens. |
| A shield and a number | It spawns after other monsters die. The number says how many are left. |
| An item and Altar | An altar event spawns it, started with that item. |
| An eye | You saw it up on this server, and no time is known. A crossed-out eye means you never saw it here. |
| `~` before a time | The time is an estimate. |
| ??? and a silhouette | You have not met it yet. |
| A skull before the level | It is more than 10 levels above you. |

Click a row to watch the monster. A watched monster stays in the list in every zone, carries a gold corner, and raises an alert when it spawns. Shift-click a row to open its Bestiary page. The grid button in the header switches to compact tiles.

![The same monsters as compact tiles, each with its time or state on its portrait.](../../assets/pocket-compendium-tiles.webp)

### Exact and estimated times

In a world you host, every time is exact. In a friend's world, you get the host's exact times when you both run Pocket Compendium. Elsewhere, the mod knows only what you see: deaths you witness, corpses you find, and a dedicated server's kill notices for bosses. Those times start with `~`, and the mod remembers them for each server.

## World markers and map pins

A dead monster of your zone shows on its spawn point with its time. An arrow at the screen's edge points to each one that is up out of view. On the local map, each monster of your zone is a pin. Hover a pin for its rules, and click it to watch the monster.

![The local map of Crescent Coast with a pin for each tracked monster. Xylevis's tooltip says he respawns 35 min after each kill and spawns next in 21:03.](../../assets/pocket-compendium-map.webp)

## Alerts

When a watched monster spawns, the game's message band and a chat line say so, such as "Xylevis has spawned in Crescent Coast." Where times are estimates, the alert comes when you see the monster up.

## Bestiary

Every monster's page shows its stats, lore, drops, and skills before you meet it. Hover a drop for the item's full tooltip, and click **Skills** for the monster's skills. A dead monster counts down on its portrait and on its page. Hold Alt and click a monster in the world to open its page.

![Xylevis's Bestiary page with his stats, lore, and four drops. The page says Respawns in 14:41, and his portrait in the grid counts down.](../../assets/pocket-compendium-bestiary.webp)

With a gamepad, move right past the monster grid to reach the drops, down to **Skills**, and left to go back.

## Boss skills

In a fight, a panel lists each skill of the bosses, elites, and fabled monsters fighting you or your pet, with its cooldown and when the next special can come. Out of combat, select such a monster to preview it. Drag the panel's header to move it, and its corner to resize it.

## Settings

![The settings window on its Boss list page, with a page for each feature.](../../assets/pocket-compendium-settings.webp)

Each feature has a page with its switch and options, and **Reset this page** restores its defaults. The Layout page locks or resets every panel and changes the key that opens the window.

Pocket Compendium saves its settings in `UserData/MelonPreferences.cfg`, in sections that start with `PocketCompendium_`. It keeps its estimates for other servers in `UserData/PocketCompendium/Worlds`.

## Language

Monster, skill, zone, and item names follow the game's language. The mod's own labels and the skill summaries are in English.

## Limits

- On someone else's server, a boss can show Up after a restart until someone enters its zone, because the server applies its timer only then.
- The boss skills panel lists only monsters near you. On someone else's server, its next-special timer is an estimate from the casts you see.
- If a feature fails, it stops until you restart the game, and the others keep running. The error is in `MelonLoader/Latest.log`. Please [open an issue](https://github.com/glockyco/ancient-kingdoms-mods/issues) and attach that file.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers building, deploying, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
