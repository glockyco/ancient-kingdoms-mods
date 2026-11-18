# Proposal

## Why

A player read the Mana Shard's augment mark as empty. Its icon is a flat, dark teal shard with wide transparent padding, so in the 14-pixel space of the mark it shrinks to a few pixels. The marks also skip the mercenary's equipment window, so augments on a mercenary's gear never show.

## What Changes

- The mark draws the augment's icon cut to its visible pixels, so an icon with wide padding fills the mark like the others.
- The mark grows from 18 to 22 pixels.
- The mercenary's equipment window shows marks on its slots. Inspecting another player's equipment in the same window shows none.

## Capabilities

### Modified Capabilities

- `item-augment-marks`: the mark's icon fills it, and the mercenary's equipment gains marks.

## Impact

- `mods/PocketCompendium/Features/AugmentMarks/AugmentMarksFeature.cs` reads `UIEquipmentMercenary` and copies each augment icon once through the GPU, because the game's icon textures are not readable.
- `mods/PocketCompendium/README.md` names the mercenary's equipment.
