using System;
using System.Linq;
using DataExporter.Exporters;
using Xunit;

namespace DataExporter.Tests;

public sealed class EquipmentSlotRowsTests
{
    private static readonly string[] StandardCategories =
    {
        "Head", "Ear", "Chest", "Legs", "Ring", "Hands", "Neck", "Ear",
        "Belt", "Feet", "Ring", "Artifact", "Weapon", "Shield", "Bracers", "Charm",
    };

    [Theory]
    [InlineData("player", "warrior", "Shield")]
    [InlineData("player", "cleric", "Shield")]
    [InlineData("player", "wizard", "Shield")]
    [InlineData("player", "druid", "Shield")]
    [InlineData("player", "ranger", "Bow")]
    [InlineData("player", "rogue", "Weapon")]
    [InlineData("mercenary", "warrior", "Shield")]
    [InlineData("mercenary", "cleric", "Shield")]
    [InlineData("mercenary", "wizard", "Shield")]
    [InlineData("mercenary", "druid", "Shield")]
    [InlineData("mercenary", "ranger", "Bow")]
    [InlineData("mercenary", "rogue", "Weapon")]
    public void EveryArchetypeCarriesItsOwnOffhandCategory(
        string ownerType,
        string ownerId,
        string offhandCategory)
    {
        var categories = (string[])StandardCategories.Clone();
        categories[13] = offhandCategory;

        var rows = EquipmentSlotRows.Create(ownerType, ownerId, categories);

        Assert.Equal(EquipmentSlotRows.SlotCount, rows.Count);
        var offhand = Assert.Single(rows, row => row.slot_index == 13);
        Assert.Equal(ownerType, offhand.owner_type);
        Assert.Equal(ownerId, offhand.owner_id);
        Assert.Equal(offhandCategory, offhand.accepted_category);
    }

    [Fact]
    public void AllSixteenSlotIndicesPreserveTheirRuntimeCategories()
    {
        var rows = EquipmentSlotRows.Create("player", "warrior", StandardCategories);

        Assert.Equal(
            StandardCategories.Select((category, slotIndex) => (slotIndex, category)),
            rows.Select(row => (row.slot_index, row.accepted_category)));
    }

    [Fact]
    public void APartialSlotTableIsRefused()
    {
        var error = Assert.Throws<ArgumentException>(() =>
            EquipmentSlotRows.Create("player", "warrior", StandardCategories[..15]));

        Assert.Contains("has 15 equipment slots; expected 16", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ASlotWithoutAnAcceptedCategoryIsRefused()
    {
        var categories = (string[])StandardCategories.Clone();
        categories[13] = "";

        var error = Assert.Throws<ArgumentException>(() =>
            EquipmentSlotRows.Create("player", "warrior", categories));

        Assert.Contains("slot 13 has no accepted item category", error.Message, StringComparison.Ordinal);
    }
}
