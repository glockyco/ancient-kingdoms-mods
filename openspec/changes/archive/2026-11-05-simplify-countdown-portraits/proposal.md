# Proposal

## Why

A dead monster's portrait carries a dark sweep with a light edge that turns as its respawn time runs out, on top of the time itself. On the small Bestiary and Boss list tiles that makes the tile busy while the time already says how long is left. In the Boss list's rows, the sweep makes a dead monster's portrait hard to tell apart from a living one at a glance.

## What Changes

- The Bestiary grid shows a dead monster's portrait unchanged, with only its time in the bottom strip, without the dim and the sweep.
- The Boss list's compact tiles do the same: the portrait stays as it is and the time sits on it.
- The Boss list's rows dim a dead monster's portrait in full, without the sweep, so the monsters a player can act on stand out.
- No portrait draws a sweep anymore.

## Capabilities

### New Capabilities

### Modified Capabilities

- `respawn-surfaces`: dead portraits lose the sweep, rows dim in full, and the Bestiary grid and compact tiles show only the time.

## Impact

- Pocket Compendium's portrait drawing for the Boss list's rows and tiles, and the Bestiary countdown's overlay on grid tiles.
- The sweep's drawing code is no longer used and goes.
