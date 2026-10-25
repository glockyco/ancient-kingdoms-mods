# Fisherman's Hat and Trousers label their slot as Chest

## Summary

The inventory tooltips for Fisherman's Hat and Fisherman's Trousers both say `Slot: Chest`. The hat equips to the Head costume slot and the trousers to the Legs costume slot. The Wardrobe shows their correct slot names.

## Build

- Game version 0.9.37.2
- Steam build 26187479
- `GameAssembly.dll` SHA-256 `1dd5f1cfdb2d0d86f4dc2a95e7b24d0ff00f9d6365d13cdaba97d4ac493f641b`

## Impact

The inventory labels misidentify two costume pieces as chest pieces. Fisherman's Garb is the actual Chest piece. Equipping the costumes works correctly.

## Steps to reproduce

1. Obtain Fisherman's Hat and Fisherman's Trousers.
2. Open Inventory and hover each item, or select each item with a controller. Both tooltips say `Slot: Chest`.
3. Use the items to add them to your Wardrobe.
4. Open a Wardrobe and select each costume to equip it. The hat fills Head and the trousers fill Legs.
5. Remove the hat and trousers with their equipped costume slots, then select both costumes again. They return to Head and Legs.
6. Inspect another copy of each item in Inventory. Their tooltips still say `Slot: Chest`.

## Observed

The inventory displayed `Slot: Chest` for both items on two separate inspections, before unlocking the costumes and again after equipping them. The game's live `ScriptableItem.toolTip` fields contained that literal text. The rendered inventory tooltip text contained it too.

Before the first equip, `Player.headSkin`, `Player.chestSkin` and `Player.legsSkin` were empty. Clicking the Wardrobe's own costume buttons produced:

| Costume slot | First equip | After removing and equipping again |
|---|---|---|
| Head | Fisherman's Hat | Fisherman's Hat |
| Chest | Fisherman's Garb | Fisherman's Garb |
| Legs | Fisherman's Trousers | Fisherman's Trousers |

Removing the hat and trousers cleared `headSkin` and `legsSkin` while leaving the Garb in `chestSkin`. The second equip restored both names to the same slots.

The Wardrobe tooltip said `Slot: Head` for the hat and `Slot: Legs` for the trousers. As correct inventory comparisons, Witch Hat said `Slot: Head` and Fisherman's Garb said `Slot: Chest`. Their live item categories were Head and Chest respectively. The affected items' categories were Head and Legs.

## Expected

The inventory tooltip says `Slot: Head` for Fisherman's Hat and `Slot: Legs` for Fisherman's Trousers.

## Cause

The wrong slot names are authored item text, not a calculation of the destination slot. `ScriptableItem.LocalizedToolTipTemplate` resolves the localized tooltip with the item's `toolTip` field as its fallback. `ScriptableItem.ToolTip` starts with that template. The affected live templates contain literal `Slot: Chest`, not a category token.

<!-- Source: server-scripts/ScriptableItem.cs:LocalizedToolTipTemplate — resolves the localized item tooltip with toolTip as fallback. -->
<!-- Source: server-scripts/ScriptableItem.cs:ToolTip — starts tooltip rendering from LocalizedToolTipTemplate. -->

`EquipmentItem.ToolTip` replaces `{CATEGORY}` when present. That cannot correct a literal `Chest` in these templates. The Wardrobe instead generates its slot line from `EquipmentItem.category` and passes that same category to `Player.CmdEquipCostume` when the costume is selected.

<!-- Source: server-scripts/EquipmentItem.cs:ToolTip — replaces the CATEGORY token with the localized equipment category. -->
<!-- Source: server-scripts/UIWardrobe.cs:Update — builds costume tooltip slot names from category and equips the selected costume using that category. -->

The source search found `Slot: ` only in `UIWardrobe.Update`. This does not mean all slot labels are generated there. Inventory uses each item's own tooltip through `UIInventory.Update`, which explains the different labels in the two windows.

<!-- Source: server-scripts/UIInventory.cs:Update — assigns ItemSlot.ToolTip to the inventory slot tooltip. -->

These source relationships explain the observed result. No asset text was changed. The exported item records agree with the live game, so this is not an exporter or website defect.

## Suggested fix

Correct the English tooltip text for the two affected item assets and any matching localization entries. Keep Fisherman's Garb as Chest.

## Evidence

- Fisherman's Hat in Inventory [before unlocking](evidence/fishermans-hat-inventory-before.webp) and [on the second inspection](evidence/fishermans-hat-inventory-after.webp).
- Fisherman's Trousers in Inventory [before unlocking](evidence/fishermans-trousers-inventory-before.webp) and [on the second inspection](evidence/fishermans-trousers-inventory-after.webp).
- [Equipped costumes and the correct Head tooltip in the Wardrobe](evidence/fishermans-wardrobe-equipped-second.webp).
- [The Wardrobe's correct Legs tooltip](evidence/fishermans-wardrobe-trousers-correct-slot.webp).
- Correct inventory comparisons: [Witch Hat](evidence/witch-hat-correct-slot.webp) and [Fisherman's Garb](evidence/fishermans-garb-correct-slot.webp).

The run used a modded macOS CrossOver installation. The inspection mods read the game's state and drove its own item-use commands and Wardrobe button callbacks. Item provisioning and window selection were instrumentation. The literal wrong text exists in the game assets and survives the game's own tooltip renderer, so this is a game-data/interface defect, not a platform rendering issue. The steps above need no mods.

## Notes

- Instrumentation: the existing level-50 scratch character Verifier was selected. Copies of the unmodified item assets were placed in empty inventory slots, with fresh copies of the hat and trousers provided for the second inspection. Controller selection kept the normal tooltips visible. `CmdUseItem` unlocked the costumes. The Wardrobe's own button callbacks equipped and removed them. The Wardrobe was opened through `ShowWardrobe` rather than travelling to a player house.
- `game.useScratchDatabase` ran before world entry and returned `isScratch=true` with `ancientkingdoms_Data/verification-scratch/game.dat`. The local world reported `NetworkServer.active=true`.
- The player save was backed up to `ancientkingdoms_Data/game-dat-backup-20261025-155058/`. The backup matched its source SHA-256. No plaintext database export was created and no player database rows were read or changed.
- The player save SHA-256 was `a05a4f6003dcda8bc3ae6982269377f8c1a75b060d96aabba4ba164f88148884` before launch and after `game.quit`. No player save WAL or SHM sidecar existed at either comparison.
- The game was closed initially and was closed with `game.quit` after capture.
- All captures used `unity.screenshot.capture`. Reported Windows paths were mapped through the Wine prefix following `build-tool/Game/WinePath.cs:ToHost`. PNG hashes were checked before conversion to 1400-pixel-wide WebP at quality 82.

| Capture | PNG SHA-256 |
|---|---|
| Hat before | `d81e4cd1fb2273a50fc48260faf21ccf36552d633ae9b0cb228cf0bad5ee8f67` |
| Hat second inspection | `cea611bce4f5bb05b233ad3e3dc01cffca6828b16427ac7ac2ad0ef6eb10bb66` |
| Trousers before | `aa76126780c5d0b8392767fac335356b13ef2e988e1d3c09c36062b9989fc02f` |
| Trousers second inspection | `c36a5b6b1a097eb78706fddb5680bd0600277a3f52986834c09175b64d19ee4a` |
| Wardrobe Head | `8b703632a45687244dbd448ef58e08f8b9a91fc7a3bb8a2e7d935a535959e506` |
| Wardrobe Legs | `ecf85e11514de725e2109f318f7b06f4f2304d6dc29c25a80c5a0d9ddb2b552f` |
| Witch Hat comparison | `e5c3dab687f4b4f73f19c84cf45ce8f70c480e71f0413db30d886a31226c7647` |
| Garb comparison | `64193e701508c49825fa19a5301561e768b8efc7ac6e45e7cedcc18618fab4eb` |
