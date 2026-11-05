## Why

The settings window had a page per feature, and four of its twelve pages held nothing but an on/off switch. The respawn features were spread over five pages and the Bestiary's over two, and settings that apply to every feature had no home. The mod keeps growing, so the window needs a structure that takes new features without new pages.

Undiscovered monsters also showed differently from surface to surface: the Bestiary revealed them by default, the boss list, map pins and world markers hid them, and spawn alerts always named them.

## What Changes

- The sidebar holds a few groups: General, Respawns, Bestiary and Combat, then Updates and About. A group lists its features as rows, each with its switch, its one sentence, and its small settings indented below it. A feature with more settings than fit there has a page of its own, reached from a gear on its row and from its panel's settings button. Today that is the boss list.
- General holds the settings that apply across features: Undiscovered monsters, Lock all panels, the settings key and the panel reset.
- Undiscovered monsters applies to every surface and is on at first: names and portraits in the boss list, on map pins, world markers and dungeon cards, in spawn alerts, and full Bestiary pages. Off, every surface shows such a monster as the game does, as ??? and a silhouette, and its alert names it ???. It starts from the value the Bestiary pages switch had saved.
- The boss list keeps only Show or Hide for undiscovered monsters, a filter that leaves them out.
- Saved settings keep their values. Only where they show changes.

## Capabilities

### New Capabilities

### Modified Capabilities

- `mod-settings-layout`: the window's groups and feature rows, General, and the boss list's discovery filter.
- `bestiary-drops`: the Bestiary pages settings keep only the switch for drops not found yet.
- `player-mods`: full Bestiary pages of undiscovered monsters follow Undiscovered monsters.
- `respawn-surfaces`: alerts name an undiscovered monster ??? while Undiscovered monsters is off.

## Impact

- `mods/PocketCompendium/Core/Ui/SettingsWindow.cs`, a new `SettingsGroup`, and `Feature.OwnPage`.
- A new `GeneralSettings` page and `Discovery`, which every surface asks whether to show a monster.
- `PocketCompendiumMod` assembles the groups.
