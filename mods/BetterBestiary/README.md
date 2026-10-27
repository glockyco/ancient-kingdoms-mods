# BetterBestiary

BetterBestiary is an unofficial MelonLoader mod for Ancient Kingdoms players who want full monster reference pages. It reveals Bestiary details, loot tooltips, and skill summaries.

[Download BetterBestiary.dll](https://ancient-kingdoms.compendiums.org/mods/BetterBestiary.dll)

## Setup

Install MelonLoader as [Mods for players](../../README.md#mods-for-players) describes, then put BetterBestiary.dll in the game's `Mods` folder.

## Use

On a Bestiary page, click **Skills** to open the monster's skills. Hold Alt and left-click a monster in the world to open its page. Clicks on the interface are ignored.

## Settings

You can configure automatic Bestiary entries and the Skills panel in the game's `UserData/MelonPreferences.cfg`, under `BetterBestiary`. [BetterBestiarySettings.cs](BetterBestiarySettings.cs) defines the available settings and defaults.

## Limits

If drawing a Bestiary page throws an exception, the mod stops changing Bestiary pages until the game restarts.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers build requirements, deployment, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
