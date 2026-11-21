# Design

## Context

See proposal.md for why. The Gathering feature owns `MinimapButton`, a copy of the minimap's `Help` button mirrored from `IconPlayersOnline`, and a stored `Shown` entry. The boss list has no shown state: `BossListFeature.Update` shows its panel whenever the tracker is ready. The game keeps profession levels on `Player` (`alchemyLevel`, `foragingLevel` for Herbalism, `radiantSekeerLevel` and the others, 0 to 1), and computes Lorekeeping from `books.Count / 17` and Exploring from `zonesDiscovered.Count / 47` in `UIProfessions.Update`. Each `UIProfessions` slot holds the profession's icon under `0/icon` and its localized name under `NameProfession`.

## Decisions

### A shared panel menu in Core

`Core/Ui/PanelMenu` owns the round button, moved out of `Features/Gathering/Ui/MinimapButton`, and a menu window on `Overlay.Windows` beside it. A feature with a panel registers a toggle: its name, icon, stored `Shown` entry and whether the feature is on. The menu lists the toggles of features that are on, and the button exists only while one is. The mod's update loop updates the menu after the features, and a click outside the menu closes it. The button is forgotten when the World scene unloads, as the leaf was.

Gathering keeps its `Shown` entry, so a player's open or closed list carries over. The boss list gets a `Shown` entry that starts true.

### The Professions feature

`Features/Professions/` holds the feature, its settings page (style, watched professions, the pin, the panel's place) and its panel. The panel reads the 13 levels and the slots' icons and names once a second and rebuilds only when a shown text changes. The level text and the watched-only selection are game-free code that `tests/PocketCompendium.Tests` links. The list style lays the rows out in the game's two columns. The compact style reuses the boss list's tile grid sizes. The header holds the lock, the style button, the settings button and the pin, so the panel's least width grows to fit four buttons beside the title.

### One banded caption

The caption band of `TileView`, `GatherTileView` and the profession tiles is a solid black at 0.78 alpha across the bottom 17 of 44 units, under a 13 px bold caption. Countdowns keep their monospaced digits. The Bestiary grid's countdowns keep their shade, because they sit among the game's own tiles.

### Icons

`generate-mod-icons.mjs` adds Lucide `hammer` for Professions in the menu and the settings. The skull, open book, leaf and pin already exist.

## Open questions

The menu's and panel's words, the tooltips, the Professions row icon and the settings group are drawn in the built feature and chosen in their own comparison, which can change this change's specs.

## Risks / Trade-offs

- Players who knew the leaf find it replaced by the open book. The release notes say where the Gathering switch went.
- The menu takes two clicks where the leaf took one.
- No panel or the menu works with a gamepad, as before.
