# BetterBestiary

BetterBestiary is an unofficial MelonLoader mod for Ancient Kingdoms players who want full monster reference pages. It reveals every monster's Bestiary page, including stats, lore, every drop with its item tooltip, and a skill summary, before you meet or kill the monster.

[Download BetterBestiary.dll](https://ancient-kingdoms.compendiums.org/mods/BetterBestiary.dll)

## Setup

Install MelonLoader as [Mods for players](../../README.md#mods-for-players) describes, then put BetterBestiary.dll in the game's `Mods` folder.

## Use

Hover a drop to see the item's stats, whether or not it has dropped for you. On a Bestiary page, click **Skills** to open the monster's skills. Hold Alt and left-click any monster in the world to open its page. Clicks on the interface are ignored.

With a gamepad, move right past the last column of the monster grid to reach the drops, down from the drops to the **Skills** button, and left to return to the grid. The focused drop shows its tooltip.

Pages follow the game's language. Names, zones, classes and item tooltips appear in the game's translation wherever it has one. Skill summaries are in English.

## Settings

You can turn off the Skills button and panel in the game's `UserData/MelonPreferences.cfg`, under `BetterBestiary`. [BetterBestiarySettings.cs](BetterBestiarySettings.cs) defines the setting and its default.

## Limits

If a monster's page fails to draw, the game shows its own page for that monster until you restart, and the error is written to `MelonLoader/Latest.log`. Other monsters' pages are not affected.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers build requirements, deployment, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
