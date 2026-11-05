# Design

## Context

`UIJournal.Update` rebuilds the Bestiary's list every frame while the Journal shows it: each tile's portrait sprite, its colour (black without an entry in `Player.bossesKilled`, the game's grey `UIJournal.itemDiscoveredColor` for a monster seen but never killed, white once killed) and its click handler. A tile has a portrait, a selection frame and a button, and no text or hover of its own. The game's record of found drops, `UIJournal.listBossesLootDiscovered`, holds every character's finds in the save (`Database.getBossesLootDiscovered`), so the bar counts the save's finds, as the page's found marks already do. The Bestiary countdown already draws an overlay as a child of each tile's portrait and rebuilds it when the game replaces the list's tiles.

## Goals / Non-Goals

**Goals:**

- One bar and one hover per tile that agree with the page's own found marks.
- A grey undiscovered tile that never flickers to black.

**Non-Goals:**

- A list of the drops still missing, which is part of the ranked plan's C3 and not confirmed.
- Changing whose finds the game records.

## Decisions

- **The bar counts the page's own list.** The count comes from the same list the page's loot builds: one entry per item, the Forgotten Altar variants included, and the items the game's page hides left out. A separate count would drift from the page. The alternative, counting the raw drop table, would count potions and quest items the page never shows.
- **The tint runs in a postfix on `UIJournal.Update`.** The game sets every tile's colour each frame, so a feature `Update` that may run before the game's would lose to it. A Harmony postfix runs after the game's colour write in the same frame.
- **Bestiary pages owns the tint, Drops found owns the bar and the hover.** The tint completes what Bestiary pages does for undiscovered monsters, so it follows that feature's switch and the "Undiscovered monsters" setting. The bar and the hover belong to the new switch.
- **Overlays are children of the portrait, rebuilt per place in the list.** The countdown's pattern holds: the game destroys and recreates tiles as Journal tabs change, so an overlay belongs to a place in the list and is made again once it is no longer on that tile's portrait. The bar sits at the top edge, clear of the countdown's time at the bottom.
- **The hover sits on the tile's button.** The mod's tooltip matches gamepad focus against the selected object, which is the tile's button, so the hover text registers on the button's rect and the mouse and the gamepad both reach it.
- **Counts refresh on change, not every frame.** Building a page's list costs more than a frame should spend on 153 tiles, so counts are cached per monster and rebuilt when the record's size changes or the list is shown again.

## Risks / Trade-offs

- [A Harmony postfix that no longer applies after a game update fails silently] → The patch reports through its feature's failure path, and the in-game check in the tasks covers it.
