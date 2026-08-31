using System;
using System.Collections.Generic;
using DataExporter.Models;

namespace DataExporter.Exporters;

public static class EquipmentSlotRows
{
    public const int SlotCount = 16;

    public static IReadOnlyList<EquipmentSlotData> Create(
        string ownerType,
        string ownerId,
        IReadOnlyList<string> acceptedCategories)
    {
        if (string.IsNullOrWhiteSpace(ownerType))
            throw new ArgumentException("Equipment slot owner type is required.", nameof(ownerType));
        if (string.IsNullOrWhiteSpace(ownerId))
            throw new ArgumentException("Equipment slot owner identifier is required.", nameof(ownerId));
        if (acceptedCategories == null)
            throw new ArgumentNullException(nameof(acceptedCategories));
        if (acceptedCategories.Count != SlotCount)
            throw new ArgumentException(
                $"{ownerType} '{ownerId}' has {acceptedCategories.Count} equipment slots; expected {SlotCount}.",
                nameof(acceptedCategories));

        var rows = new EquipmentSlotData[SlotCount];
        for (var slotIndex = 0; slotIndex < SlotCount; slotIndex++)
        {
            var acceptedCategory = acceptedCategories[slotIndex];
            if (string.IsNullOrWhiteSpace(acceptedCategory))
                throw new ArgumentException(
                    $"{ownerType} '{ownerId}' slot {slotIndex} has no accepted item category.",
                    nameof(acceptedCategories));

            rows[slotIndex] = new EquipmentSlotData
            {
                owner_type = ownerType,
                owner_id = ownerId,
                slot_index = slotIndex,
                accepted_category = acceptedCategory,
            };
        }

        return rows;
    }
}
