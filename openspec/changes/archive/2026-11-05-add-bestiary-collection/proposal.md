# Proposal

## Why

The Bestiary's list of monsters shows only portraits, so a player who collects drops has to open every page to see which monsters still have drops to find. The list also keeps undiscovered monsters as black silhouettes while the "Undiscovered monsters" setting reveals them everywhere else.

## What Changes

- A new feature, "Drops found", in the Bestiary group: a thin bar along the top edge of each monster's tile in the Bestiary's list fills by the share of its drops the save has found, and turns gold once all are found. It is on at first start.
- With "Drops found" on, hovering a tile shows the monster's name, then "2 of 5 drops found", or "All 4 drops found" once every drop is found.
- While "Undiscovered monsters" is on, Bestiary pages draws an undiscovered monster's tile with its portrait in the game's grey for monsters seen but never killed, instead of the black silhouette.

## Capabilities

### New Capabilities

### Modified Capabilities

- `bestiary-drops`: the Bestiary's list shows how many of each monster's drops are found.
- `mod-settings-layout`: the Bestiary group gains "Drops found", and undiscovered monsters show on the Bestiary's list as on every other surface.

## Impact

- Pocket Compendium's Bestiary features: a new feature for the bar and the hover, and Bestiary pages for the list's portraits.
- Settings: a new row in the Bestiary group.
