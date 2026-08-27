#nullable disable
using System;
using System.Collections.Generic;
using CombatVerification.Materialization;
using DataExporter;
using Il2Cpp;

namespace CombatVerification.Engine
{
    /// <summary>
    /// Reads the slots of any container the game holds items in.
    /// </summary>
    /// <remarks>
    /// The game keeps every slot list on one base container, so an inventory, a player's equipment
    /// and a companion's equipment are all read the same way. One reader therefore serves the
    /// build steps and every probe, and the questions it answers stay answered in one place.
    /// </remarks>
    internal static class Containers
    {
        /// <summary>Every slot of a container, including the empty ones, in the engine's order.</summary>
        public static List<EquippedSlot> Read(ItemContainer container)
        {
            var slots = new List<EquippedSlot>();
            if (container == null)
                return slots;

            for (var index = 0; index < container.slots.Count; index++)
                slots.Add(At(container, index));

            return slots;
        }

        /// <summary>One slot of a container.</summary>
        public static EquippedSlot At(ItemContainer container, int index)
        {
            var slot = container.slots[index];
            var occupied = slot.amount > 0 && slot.item.data != null;

            return new EquippedSlot
            {
                Index = index,
                ItemId = occupied ? GameIds.Sanitize(slot.item.data.name) : null,
                AugmentId = occupied && !string.IsNullOrEmpty(slot.augmentName)
                    ? GameIds.Sanitize(slot.augmentName)
                    : null,
                Durability = occupied ? slot.durability : 0,
            };
        }

        /// <summary>
        /// Where a container holds an item with this augment, or -1 when it holds none. An augment
        /// is part of the identity, because one item with an augment and the same item without are
        /// different pieces of equipment.
        /// </summary>
        public static int IndexOf(ItemContainer container, string itemId, string augmentId)
        {
            var wanted = GameIds.Sanitize(itemId);
            var wantedAugment = string.IsNullOrWhiteSpace(augmentId)
                ? null
                : GameIds.Sanitize(augmentId);

            foreach (var slot in Read(container))
            {
                if (!slot.Occupied || slot.ItemId != wanted)
                    continue;

                if (string.Equals(slot.AugmentId ?? "", wantedAugment ?? "",
                        StringComparison.OrdinalIgnoreCase))
                    return slot.Index;
            }

            return -1;
        }

        /// <summary>
        /// The equipment asset in a slot, or null when the slot holds something that is not
        /// equipment. This is what the game's own acceptance check needs.
        /// </summary>
        public static EquipmentItem EquipmentIn(ItemContainer container, int index)
        {
            if (container == null || index < 0 || index >= container.slots.Count)
                return null;

            var data = container.slots[index].item.data;
            return data == null ? null : data.TryCast<EquipmentItem>();
        }
    }
}
