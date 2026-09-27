# Moving the only equipped backpack into its first storage slot hides the backpack

## Summary

The game refuses to move an equipped backpack into the extended storage that backpacks provide, except for the first storage slot. A player whose only backpack is equipped can drop it there. The backpack then sits in a slot that it no longer unlocks, and it disappears from both inventory windows.

## Build

- Game version 0.9.34.0
- Steam build 25548782
- `Assembly-CSharp.dll` SHA-256 `a676445a44fe01458aa611caea2a8b95ca9d79998c5fd840508084508764878a`

## Impact

The backpack is no longer visible or reachable. The Combined Backpack window shows no storage slots, and the base inventory does not show the backpack. The game also shows no message.

The Adventurer's Guide states that an equipped backpack cannot be moved into the extended storage it supports.

## Steps to reproduce

1. Create a character. The starting inventory contains a Worn Backpack.
2. Equip the Worn Backpack in the first backpack slot of the Combined Backpack window. Four storage slots appear.
3. Drag the backpack onto the second storage slot. The game refuses with "You cannot move this backpack to the extended storage area".
4. Drag the backpack onto the first storage slot.

## Observed

| Step | Backpack slot | First storage slot | Unlocked storage slots |
|---|---|---|---|
| Backpack equipped | Worn Backpack | empty | 4 |
| After the drop onto the second storage slot | Worn Backpack | empty | 4 |
| After the drop onto the first storage slot | empty | **Worn Backpack** | **0** |

The first storage slot is inventory index 24. With no backpack equipped, index 24 is locked, so the backpack sits in a slot that no window shows.

## Expected

The drop onto the first storage slot is refused with the same message as the drop onto the second storage slot.

## Cause

`server-scripts/PlayerInventory.cs:480-486`:

```csharp
if (isCombinedBackpackSlot(slotIndices[0]))
{
    if (slotIndices[1] > 24 && !isCombinedBackpackSlot(slotIndices[1]))
    {
        player.ShowImportantMessage("You cannot move this backpack to the extended storage area", Utils.colorImportantWarning);
        return;
    }
```

Extended storage starts at index 24 (`CombinedStartIndex`, `PlayerInventory.cs:29`), and the base inventory is indices 0 to 23 (`PlayerInventory.cs:67-79`). The guard tests `> 24`, so it lets index 24 through.

The next check, `WouldRemovingBackpackLockOccupiedSlots` at `PlayerInventory.cs:487-491`, runs before the move. The target slot is still empty at that point, so the check passes and the swap at `PlayerInventory.cs:513-516` places the backpack in the slot that its own removal locks.

## Suggested fix

Change the guard to `slotIndices[1] >= 24`.

## Evidence

- `evidence/backpack-bag-0-equipped.webp`: the Worn Backpack in the first backpack slot, with four storage slots.
- `evidence/backpack-bag-1-slot25-refused.webp`: after the drop onto the second storage slot. The backpack stays equipped.
- `evidence/backpack-bag-2-slot24-accepted.webp`: after the drop onto the first storage slot. Neither window shows the backpack, and the chat shows only the refusal from step 3.

## Notes

- Each drop was dispatched as a Unity drop event from the equipped-backpack slot object onto the target storage-slot object in the open Combined Backpack window. That is the event a mouse release raises, and it reaches the game's handler through `UIDragAndDropable.OnDrop` at `server-scripts/UIDragAndDropable.cs:149-166`.
- The sequence was run twice. Between runs, the backpack was returned to its equipment slot with the inventory's own swap method, because the player cannot reach it.
- Whether equipping a second backpack makes the hidden backpack reachable again was not tested.
- The defect is in the game's own drag-and-drop rules and needs no mods to observe.
- Reproduction used a scratch database, so no player save was reached.
