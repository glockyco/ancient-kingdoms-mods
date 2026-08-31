using System;
using System.Linq;
using DataExporter.Exporters;
using Xunit;

namespace DataExporter.Tests;

public sealed class ProgressionRowsTests
{
    private static readonly string[] Classes =
    {
        "warrior", "ranger", "cleric", "rogue", "wizard", "druid",
    };

    [Fact]
    public void LevelCapBudgetsMatchEngineAwards()
    {
        var progression = ProgressionRows.Create(50, 200, Classes);

        Assert.Equal(50, progression.max_level);
        Assert.Equal(200, progression.max_veteran_points);
        Assert.Equal(1, progression.attribute_points_per_veteran);
        Assert.Equal(1, progression.veteran_skill_points_per_veteran);
        var cap = Assert.Single(progression.level_budgets, row => row.level == 50);
        Assert.Equal(49, cap.normal_skill_points);
        Assert.Equal(49, cap.attribute_points);
    }

    [Fact]
    public void WarriorLevelFiftyCarriesEveryAutomaticAttributeGrant()
    {
        var progression = ProgressionRows.Create(50, 200, Classes);
        var row = Assert.Single(
            progression.class_levels,
            row => row.class_id == "warrior" && row.level == 50);

        Assert.Equal(16, row.automatic_attributes.strength);
        Assert.Equal(25, row.automatic_attributes.constitution);
        Assert.Equal(12, row.automatic_attributes.dexterity);
        Assert.Equal(10, row.automatic_attributes.intelligence);
        Assert.Equal(8, row.automatic_attributes.wisdom);
        Assert.Equal(8, row.automatic_attributes.charisma);
        Assert.Equal(
            79,
            row.automatic_attributes.strength
            + row.automatic_attributes.constitution
            + row.automatic_attributes.dexterity
            + row.automatic_attributes.intelligence
            + row.automatic_attributes.wisdom
            + row.automatic_attributes.charisma);
    }

    [Fact]
    public void EveryRaceStartsWithEightFixedAttributePoints()
    {
        var progression = ProgressionRows.Create(50, 200, Classes);

        Assert.Equal(7, progression.races.Count);
        Assert.All(progression.races, race =>
        {
            var attributes = race.starting_attributes;
            Assert.Equal(
                8,
                attributes.strength
                + attributes.constitution
                + attributes.dexterity
                + attributes.intelligence
                + attributes.wisdom
                + attributes.charisma);
        });
        var dwarf = Assert.Single(progression.races, race => race.id == "dwarf");
        Assert.Equal(3, dwarf.starting_attributes.constitution);
    }

    [Fact]
    public void AnUnmodelledRuntimeClassIsRefused()
    {
        var classes = Classes.Append("bard");

        var error = Assert.Throws<InvalidOperationException>(() =>
            ProgressionRows.Create(50, 200, classes));

        Assert.Contains("unexpected: bard", error.Message, StringComparison.Ordinal);
    }
}
