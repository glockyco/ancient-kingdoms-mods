# Tasks

## 1. Panel menu

- [ ] 1.1 Move the round button into `Core/Ui/PanelMenu` with the open book, and add the menu of panel switches beside it
- [ ] 1.2 Register Gathering's toggle with its existing `Shown` entry, and remove `MinimapButton`
- [ ] 1.3 Give the boss list a `Shown` entry, register its toggle with the skull, and hide the panel while it is off

## 2. Professions panel

- [ ] 2.1 Add the game-free level text and watched-only selection, with tests
- [ ] 2.2 Add the Professions feature, its settings page and a Professions settings group
- [ ] 2.3 Draw the list and compact styles with the style, settings, lock and pin buttons, watching on click
- [ ] 2.4 Register the Professions toggle, hidden at first start

## 3. Tiles

- [ ] 3.1 Put the captions of the boss, Gathering and profession tiles on the dark band
- [ ] 3.2 Add `trending-up` to `website/scripts/generate-mod-icons.mjs` and regenerate the icons

## 4. Words

- [ ] 4.1 Draw the menu's and panel's words, tooltips, the Professions icon and the settings group in the built feature, choose them in a comparison, and update the specs

## 5. Documentation and verification

- [ ] 5.1 Describe the menu and the Professions panel in `mods/PocketCompendium/README.md` and the `/mods` page
- [ ] 5.2 Build, deploy and check every scenario of this change on the scratch save
- [ ] 5.3 Run the Pocket Compendium tests and strict OpenSpec validation
