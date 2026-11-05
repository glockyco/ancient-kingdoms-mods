## Why

In 1.2.0 the Bestiary countdown stopped with an error after a player went from the Bestiary to another Journal tab and back. The Journal's tabs share one list of slots, and the game destroys and creates slots as the tab changes. The countdown found its overlays by the slots' instance IDs, which Unity hands to new objects as soon as the old ones are destroyed, so a new slot led it to a destroyed overlay. It also drew Bestiary countdowns while other tabs showed, over the icons of plants, fish and recipes.

A review of the release found two more defects. A dungeon card stayed over the world map when the player switched maps while it was open, and a feature that failed while its settings row showed laid its notice over the next row.

## What Changes

- The grid's countdowns belong to slots by their place in the list, are made again when a slot is replaced, and show only on the Bestiary tab.
- A dungeon card closes when the local map stops showing, including a switch to the world map.
- A settings page is laid out again when a feature on it fails.
- The panels' lock tooltips name the General settings, where Lock all panels now is.

## Capabilities

### New Capabilities

### Modified Capabilities

- `respawn-surfaces`: the Bestiary's countdowns show only on its own tab and survive tab changes.

## Impact

- `mods/PocketCompendium/Features/BestiaryCountdown/BestiaryCountdownFeature.cs`
- `mods/PocketCompendium/Features/MapPins/DungeonEntrances.cs` and `DungeonEntrancesFeature.cs`
- `mods/PocketCompendium/Core/Ui/SettingsWindow.cs`
- The lock tooltips in `Features/BossList/Ui/BossListPanel.cs` and `Features/BossSkills/Ui/ControlCluster.cs`
