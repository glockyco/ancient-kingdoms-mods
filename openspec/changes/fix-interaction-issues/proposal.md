# Proposal

## Why

Players report that the search fields are close to unusable on phones. Opening the search does not bring up the keyboard, the page zooms into the field once it is tapped, and while a query is typed the field moves above the visible part of the screen. The cause is in the site: the field text is 14px, which iOS zooms into, the field gets focus a frame after the tap, which iOS does not open the keyboard for, and the phone search is a bottom drawer that grows upward as results arrive, while the keyboard covers the bottom of the screen. Persona trials on phones, a tablet, a desktop, keyboard-only use and 200% zoom found more interaction defects of the same kind: a tap on a link in a wide table slides the table instead of opening the link, and opening a group in the Browse menu can move its heading out of view.

## What Changes

- Fields that take typing or a choice keep 16px text on touch screens and narrow windows, so iOS does not zoom into them.
- Every search trigger focuses the search field during the tap that opens it, so the keyboard opens at once.
- On phones the site search and the map search fill the part of the screen above the keyboard, with the field at the top, where it stays while results arrive. On wider screens the search dialog opens near the top of the page and grows downward, so the field no longer moves as results arrive.
- A filter or zone list that a finger opens keeps the keyboard closed, so it does not cover the options. A mouse or a key still moves focus into the list's search field.
- A tap or click on a link in a table that scrolls sideways no longer scrolls the table. Keyboard focus still scrolls the focused control into view.
- Opening a group in the Browse menu keeps its heading in view.
- A quick second tap no longer zooms the page. Pinch zoom keeps working.
- Each link in the recipe list's details column is named after its recipe, and each expand button in ingredient and source trees is named after what it opens and states whether it is open.
- A search result that lists places counts a sub-zone that differs from its zone only in letter case as the zone.
- The gathering sliders on a resource page fit a phone screen instead of widening the page.

## Capabilities

### New Capabilities

- `site-interaction`: how the site's fields, menus and scrolling tables respond to touch, mouse and keyboard.

### Modified Capabilities

- `global-search`: the palette on touch screens and the dialog's position on wider screens.

## Impact

- `website`: the shared input, command input, command dialog, popover and data table components, the site header, the search palette and map search, and the pages with their own fields.
