# Tasks

## 1. Panel menu

- [x] 1.1 Move the round button into `Core/Ui/PanelMenu` with the open book, and add the menu of panel switches beside it
- [x] 1.2 Register Gathering's toggle with its existing `Shown` entry, and remove `MinimapButton`
- [x] 1.3 Give the boss list a `Shown` entry, register its toggle with the skull, and hide the panel while it is off

## 2. Professions panel

- [x] 2.1 Add the game-free level text and watched-only selection, with tests
- [x] 2.2 Add the Professions feature, its settings page and a Professions settings group
- [x] 2.3 Draw the list and compact styles with the style, settings, lock and pin buttons, watching on click
- [x] 2.4 Register the Professions toggle, hidden at first start

## 3. Tiles

- [x] 3.1 Put the captions of the boss, Gathering and profession tiles on the dark band
- [x] 3.2 Add `hammer` to `website/scripts/generate-mod-icons.mjs` and regenerate the icons

## 4. Words

- [x] 4.1 Draw the menu's and panel's words, tooltips, the Professions icon and the settings group in the built feature, choose them in a comparison, and update the specs

## 5. Documentation and verification

- [x] 5.1 Describe the menu and the Professions panel in `mods/PocketCompendium/README.md` and the `/mods` page
- [x] 5.2 Build, deploy and check every scenario of this change on the scratch save
- [x] 5.3 Run the Pocket Compendium tests and strict OpenSpec validation

The alert for a watched boss that spawns while the list is hidden is not observed in the game. Hiding only stops the list from drawing, and alerts are a feature of their own.
