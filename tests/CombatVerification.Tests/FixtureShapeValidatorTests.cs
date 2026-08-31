using System.Collections.Generic;
using System.Linq;
using CombatVerification.Fixtures;
using Xunit;

namespace CombatVerification.Tests;

public sealed class FixtureShapeValidatorTests
{
    private static FixtureDescriptor Valid() => new()
    {
        Build = BuildEnvelopeTestData.Create(),
        Name = "shape-check",
        Seed = 7,
        Character = new CharacterSpec
        {
            Class = "Warrior",
            Race = "Human",
            Level = 50,
            AllocatedAttributes = new Dictionary<string, int>(),
            Skills = new List<SkillSpec>(),
            Equipment = new List<EquipmentSpec>
            {
                new() { Slot = 12, ItemId = "sword", Durability = 100 },
            },
        },
        Consumables = new List<string>(),
    };

    [Fact]
    public void AcceptsShapeWithoutGameRules()
    {
        var fixture = Valid();
        fixture.Character.Class = "A class the game does not define";
        fixture.Character.Level = 999;
        fixture.Character.Skills.Add(new SkillSpec { Name = "Unknown skill", Level = 999 });
        fixture.Character.Equipment[0].Slot = 999;

        Assert.True(FixtureShapeValidator.Validate(fixture).Ok);
    }

    [Fact]
    public void RefusesUnsupportedSchemaAndMissingSectionsTogether()
    {
        var fixture = Valid();
        fixture.Build.SerializedSchemaVersion = 99;
        fixture.Build.CaptureSchemaVersion = 99;
        fixture.Character.Skills = null!;
        fixture.Character.Equipment = null!;
        fixture.Consumables = null!;

        var fields = FixtureShapeValidator.Validate(fixture).Problems
            .Select(problem => problem.Field)
            .ToArray();

        Assert.Contains("build.serializedSchemaVersion", fields);
        Assert.Contains("build.captureSchemaVersion", fields);
        Assert.Contains("character.skills", fields);
        Assert.Contains("character.equipment", fields);
        Assert.Contains("consumables", fields);
    }

    [Fact]
    public void RefusesOneSlotNamedTwice()
    {
        var fixture = Valid();
        fixture.Character.Equipment.Add(
            new EquipmentSpec { Slot = 12, ItemId = "shield", Durability = 100 });

        var problem = Assert.Single(FixtureShapeValidator.Validate(fixture).Problems);
        Assert.Equal("character.equipment[12]", problem.Field);
    }

    [Fact]
    public void RefusesNegativeValuesWithoutAReachabilityTable()
    {
        var fixture = Valid();
        fixture.Character.Level = -1;
        fixture.Character.VeteranPoints = -1;
        fixture.Character.AllocatedAttributes["strength"] = -1;
        fixture.Character.Skills.Add(new SkillSpec { Name = "Melee Attack", Level = -1 });

        var fields = FixtureShapeValidator.Validate(fixture).Problems
            .Select(problem => problem.Field)
            .ToArray();

        Assert.Contains("character.level", fields);
        Assert.Contains("character.veteranPoints", fields);
        Assert.Contains("character.allocatedAttributes.strength", fields);
        Assert.Contains("character.skills.Melee Attack", fields);
    }

    [Fact]
    public void RefusesAnItemWithoutReproducibleInstanceState()
    {
        var fixture = Valid();
        fixture.Character.Equipment[0].Durability = null;

        var problem = Assert.Single(FixtureShapeValidator.Validate(fixture).Problems);
        Assert.Equal("character.equipment[12].durability", problem.Field);
    }
}
