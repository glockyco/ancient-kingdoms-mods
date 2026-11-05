# Design

## Context

- The site search on phones was a vaul bottom drawer whose height followed its results, up to 85% of the screen. Its field sat at the top of the drawer, so the field started near the bottom of the screen, under the keyboard, and moved up as results arrived. The map search did the same.
- The field got focus from the dialog's focus scope about 20 ms after the tap, outside the tap's event. iOS opens the keyboard only for a field focused while a tap is handled.
- The command input used 14px text, and so did several selects and fields on profession, mechanics and monster pages. iOS zooms the page into a focused field whose text is smaller than 16px.
- A filter popover moved focus into its search field on open. On a touch screen that opens the keyboard over the options, where the browser allows it.
- `fadeHiddenOverflow` scrolled any focused element inside a sideways-scrolling table into view. A tap focuses the link it lands on, so the table moved under the finger before the click.
- The Browse menu on narrow screens opens one group at a time. Opening a group closes the one above it, which moves the new group's heading up, out of the scrolled panel.

## Goals / Non-Goals

**Goals:**

- The search field opens focused with the keyboard and stays in place while results arrive, on phones, tablets and desktops.
- No field zooms the page on iOS, and no double tap zooms it.
- A tap lands on what the finger touched.

**Non-Goals:**

- Content and layout wishes from the persona trials, such as a quest's objectives above its chain, nearby services on the map, or the class that can wear a dropped item in a loot table. The trial reports list them.
- Changing the vaul drawer of the map controls, which holds no search field.

## Decisions

### One rule for field text

A `field-text` utility sets 16px text, and 14px only where a mouse is the main pointer on a screen at least 768px wide. Scoped styles read the same size from `--field-text-size`. Every text field, number field and select uses it. A global rule on `input` would also shrink the large number fields that set their own size.

### Focus inside the tap

`openFocused` applies the open state with `flushSync` and focuses the field before the tap's handler returns. The site search opens through `openSearchPalette`, and the map search through `MapSearch.show`. The dialog's focus scope still records the trigger first, so Escape returns focus to it.

### One dialog at every width

The command dialog is one component at every width. On phones, below 640px, it fills the visual viewport: an attachment writes `visualViewport.height` and `offsetTop` into CSS variables, so the dialog ends above the keyboard and follows the part of the page the reader sees. The field is the first row and the result list scrolls in the rest, with `overscroll-behavior: contain` so the page behind does not scroll. On wider screens the dialog opens at 12% of the viewport height and grows downward. The close button is 40px square.

Alternatives: a fixed-height bottom sheet, which keeps the field still but leaves it below the middle of the screen once results fill the sheet; a top sheet whose height follows its results, which differs from the full sheet only while results are few.

### Touch keeps popover fields closed

`keepKeyboardClosedAfterTouch` cancels the popover's open auto-focus when the last pointer down came from a finger. A key press clears that state, so opening with Enter still focuses the field.

### Only keyboard focus scrolls a table

`fadeHiddenOverflow` scrolls a focused control into view only when it matches `:focus-visible`, which browsers set for keyboard focus and not for a tap or click.

### Double tap

`touch-action: manipulation` on the root element turns off double-tap zoom and keeps panning and pinch zoom. Elements that set their own touch action, such as the map canvas, keep it.

## Risks / Trade-offs

- No iOS device or simulator was available. Chromium checks confirmed the focus happens during the click, the field sizes, the dialog geometry and that the dialog follows a smaller viewport. The keyboard behaviour on iOS follows from documented WebKit rules and still needs a check on a phone.
- A full-screen search hides the page behind it on phones. The close button and Escape return to the page.
