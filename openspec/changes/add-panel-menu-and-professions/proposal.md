# Proposal

## Why

A player asked on Discord for a button that shows and hides the boss list like the Gathering list's, and for a way to see profession levels without opening the game's Skills window. Today the boss list hides only through its settings switch, and the game lists its 13 professions only on the Professions tab of the Skills window. The choices below were made in three comparisons drawn in the game (`.local/changes/boss-list-and-professions/review/`, 2026-11-20 and 2026-11-21).

## What Changes

- One round button with an open book replaces the leaf on the minimap's lower left. A click opens a menu with a switch for each of the mod's panels: Bosses, with a skull, Gathering and Professions.
- The boss list can be hidden from that menu. A hidden panel leaves nothing on screen, and hiding the boss list keeps watches, alerts, pins, markers and arrows.
- A new Professions panel shows the 13 professions with their levels, as rows with names or as compact tiles. A click watches a profession, and a pin button in the header shows only the watched ones in either style. The panel has a style button, a settings button and a lock, like the boss list.
- The compact tiles of the boss list, the Gathering list and the Professions panel show their caption on a solid dark band, because the fading shade left light captions hard to read.

## Capabilities

### New Capabilities

- `profession-levels`: the Professions panel, its styles, watching and the watched-only pin.

### Modified Capabilities

- `mod-settings-layout`: the panel menu, and a Professions group in the settings window.
- `gathering-helper`: the Gathering list shows and hides from the panel menu instead of its own button.
- `respawn-surfaces`: the boss list can be hidden from the panel menu, and compact tiles carry their caption on a band.

## Impact

- `mods/PocketCompendium/`: a shared panel menu in `Core/Ui`, a `Shown` entry for the boss list, a new `Features/Professions/`, the banded caption in the boss and Gathering tiles, and new icons through `website/scripts/generate-mod-icons.mjs`.
- `mods/PocketCompendium/README.md` and the `/mods` page name the menu and the Professions panel.
