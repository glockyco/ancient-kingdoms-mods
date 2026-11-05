# Tasks

## 1. Portraits

- [ ] 1.1 Remove the sweep from `PortraitView`, so `Set` takes no share of time left, and keep the full dim for a dead monster
- [ ] 1.2 Make the Boss list's compact tiles (`TileView`) draw a dead monster's portrait undimmed, while its rows (`RowView`) keep the full dim
- [ ] 1.3 Remove the dim and the sweep from the Bestiary grid's countdown overlay (`SlotOverlay`), keeping the shade and the time
- [ ] 1.4 Delete `SweepView` and `PortraitView.SweepColor` once nothing uses them, and update the comments that describe the sweep

## 2. Verification

- [ ] 2.1 Build the mods, deploy them to the game, and check in the running game on the scratch save: a dead monster's Bestiary tile and compact Boss list tile show the portrait with only the time, and its list row shows a fully dimmed portrait
- [ ] 2.2 Run the Pocket Compendium tests and the mods' build
