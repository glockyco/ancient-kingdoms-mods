# Proposal

## Why

A player read the Mana Shard's augment mark as empty. Its icon is a flat, dark teal shard with wide transparent padding, so in the 14-pixel space of the mark it shrinks to a few pixels. The marks also cover only the player's storage windows, while augmented gear also shows in a mercenary's equipment, trades, merchant lists, the Sacrifice shrine and the skillbar.

## What Changes

- The mark draws the augment's icon cut to its visible pixels, so an icon with wide padding fills the mark like the others.
- The mark takes 22 of an inventory slot's 58 units, up from a fixed 18, and scales with smaller slots such as the skillbar's.
- Marks appear wherever the game draws an augmentable item's icon: a mercenary's or an inspected player's equipment, both offers of a player trade, the Augmenter's list, a merchant's sell, buyback and repair lists, an essence trader's list, the Sacrifice shrine's item list and offerings, and the skillbar.

## Capabilities

### Modified Capabilities

- `item-augment-marks`: the mark's icon fills it, the mark scales with its slot, and every window that draws augmentable items gains marks.

## Impact

- `mods/PocketCompendium/Features/AugmentMarks/` reads `UIEquipmentMercenary`, `UIPlayerTrading`, `UINpcTrading`, `UIVirtueShrine` and `UISkillbar`, rebuilding the lists the merchant windows build each frame. It copies each augment icon once through the GPU, because the game's icon textures are not readable.
- `mods/PocketCompendium/README.md` names the new windows.
