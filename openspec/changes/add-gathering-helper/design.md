# Design

## Context

See proposal.md for why. `GatherItem` is a networked scene object with `[SyncVar] timeToReady`, `timeToWaitReady`, `levelItem`, the kind flags (`isPlant`, `isMineral`, `isFish`, `isRadiantSpark`), `journalIcon`, `giftToPlayer` and, for fishing spots, `randomDrops`. A host holds every node of every zone. A joined client receives nodes only within the server's interest range.

## Decisions

### A catalogue like the monster tracker

`Features/Gathering/` gets a catalogue built with one `FindObjectsByType<GatherItem>` scan, inactive objects included, when a world session starts, plus a guarded Harmony postfix on `GatherItem.Start`, like `Tracker` and `MonsterStartPatch`. Types are keyed by the node's name, fish by the item's name. A node is ready when `timeToReady <= server time`, and fishing spots are always ready. The pure grouping, readiness and nearest-node choice live in game-free code that `tests/PocketCompendium.Tests` links.

### Icons

Herbs use the node's `journalIcon`, as the journal does. Ores use the reward item's icon, because the ore rocks look alike. Sparks use the Radiant Aether icon, fish their item icon. Tab icons are Lucide leaf, pickaxe, fish and sparkles, added through `generate-mod-icons.mjs`.

### Panel and button

The panel is a `PanelHost` panel in the compact boss list's chrome, with the hover header, a tab row and a `TileGrid`-style grid built on `PortraitView`. The round button clones the minimap's `Help` button, so it keeps the game's frame, and sits mirrored from the players-online button across the minimap's middle. Its click toggles a stored `Shown` entry.

### Surfaces

Map pins use a layer made like `MapOverlay.CreateLayer` and `RoundPortraitView`, without needing the monster tracker. The game draws the player's marker inside the map's image, so pins near it would cover it: the layer draws the player's marker again above the pins. Minimap icons sit on a layer over the minimap image, projected with the map camera. The edge arrow reuses `EdgeArrowView` and the edge math of `EdgeArrowsFeature`. Map pins and minimap icons skip Temple of Valaark.

### Performance

Pocket Compendium 1.0.2 fixed a stutter that came from searching the scene once a second (44 ms a search), so the helper never searches after the session starts and keeps its per-frame work small:

- The one `FindObjectsByType<GatherItem>` search runs while the world loads, as the monster tracker's does, and the `GatherItem.Start` postfix only adds a node to its lists.
- The catalogue groups nodes by zone and type once. Counts, times and readiness refresh once a second for the current zone's types, and a label changes only when its text does.
- The arrow picks its node once a second from the watched nodes of the current zone, by squared distance, and only follows the camera each frame.
- Minimap icons cover only the nodes within the minimap's reach, chosen by distance before projecting, and sit on a canvas of their own, so moving them rebuilds neither the game's HUD canvas nor the panels'.
- Map pins exist only while the map is open, and their places are computed when it opens or its view changes.
- Views are pooled, the update loop allocates nothing per frame, and tooltips build when hovered.

### Joined worlds

On a joined world, nodes outside the interest range keep their last synced time, which is right until someone else picks them. Tiles and arrows treat such nodes as the boss list treats estimates and mark their times with `~`.

## Risks / Trade-offs

- A watched type with 43 nodes fills the map with pins. The pins are smaller than boss pins and dim while growing.
- The arrow sits with the boss arrows at the screen's edge and can hide under the minimap, as boss arrows already do.
- No panel takes a gamepad yet. The tiles need a focus path for the Steam Deck before release.
- The search at session start costs a frame while the world loads, like the monster tracker's.
