using System.Collections.Generic;
using System.Linq;
using CombatVerification.Fixtures;
using Xunit;

namespace CombatVerification.Tests;

public sealed class FixtureShapeValidatorTests
{
    private static FixtureDescriptor Valid() => new()
    {
        SchemaVersion = FixtureShapeValidator.SupportedFixtureSchemaVersion,
        Build = BuildEnvelopeTestData.Create(),
        Name = "shape-check",
        BuildData = new LogicalBuildData
        {
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
            Companions = new List<CompanionSpec>(),
            Consumables = new List<string>(),
            LearnedBookIds = new List<string>(),
            Provenance = new BuildProvenance { Kind = "authored", Source = "test" },
        },
        Execution = new FixtureExecution { Seed = 7 },
    };

    [Fact]
    public void AcceptsShapeWithoutGameRules()
    {
        var fixture = Valid();
        fixture.BuildData.Character.Class = "A class the game does not define";
        fixture.BuildData.Character.Level = 999;
        fixture.BuildData.Character.Skills.Add(new SkillSpec { Name = "Unknown skill", Level = 999 });
        fixture.BuildData.Character.Equipment[0].Slot = 999;

        Assert.True(FixtureShapeValidator.Validate(fixture).Ok);
    }

    [Fact]
    public void RefusesUnsupportedSchemaAndMissingSectionsTogether()
    {
        var fixture = Valid();
        fixture.SchemaVersion = 99;
        fixture.Build.SerializedSchemaVersion = 99;
        fixture.Build.CaptureSchemaVersion = 99;
        fixture.BuildData.Character.Skills = null!;
        fixture.BuildData.Character.Equipment = null!;
        fixture.BuildData.Consumables = null!;
        fixture.BuildData.LearnedBookIds = null!;
        fixture.BuildData.Provenance = null!;
        fixture.Execution = null!;

        var fields = FixtureShapeValidator.Validate(fixture).Problems
            .Select(problem => problem.Field)
            .ToArray();

        Assert.Contains("schemaVersion", fields);
        Assert.Contains("build.serializedSchemaVersion", fields);
        Assert.Contains("build.captureSchemaVersion", fields);
        Assert.Contains("buildData.character.skills", fields);
        Assert.Contains("buildData.character.equipment", fields);
        Assert.Contains("buildData.consumables", fields);
        Assert.Contains("buildData.learnedBookIds", fields);
        Assert.Contains("buildData.provenance", fields);
        Assert.Contains("execution", fields);
    }

    [Fact]
    public void RefusesOldSchemaWithoutBuildData()
    {
        var fixture = Valid();
        fixture.SchemaVersion = 1;
        fixture.BuildData = null!;

        var fields = FixtureShapeValidator.Validate(fixture).Problems
            .Select(problem => problem.Field)
            .ToArray();

        Assert.Contains("schemaVersion", fields);
        Assert.Contains("buildData", fields);
    }

    [Fact]
    public void RefusesOneSlotNamedTwice()
    {
        var fixture = Valid();
        fixture.BuildData.Character.Equipment.Add(
            new EquipmentSpec { Slot = 12, ItemId = "shield", Durability = 100 });

        var problem = Assert.Single(FixtureShapeValidator.Validate(fixture).Problems);
        Assert.Equal("buildData.character.equipment[12]", problem.Field);
    }

    [Fact]
    public void RefusesNegativeValuesWithoutAReachabilityTable()
    {
        var fixture = Valid();
        fixture.BuildData.Character.Level = -1;
        fixture.BuildData.Character.VeteranPoints = -1;
        fixture.BuildData.Character.AllocatedAttributes["strength"] = -1;
        fixture.BuildData.Character.Skills.Add(new SkillSpec { Name = "Melee Attack", Level = -1 });

        var fields = FixtureShapeValidator.Validate(fixture).Problems
            .Select(problem => problem.Field)
            .ToArray();

        Assert.Contains("buildData.character.level", fields);
        Assert.Contains("buildData.character.veteranPoints", fields);
        Assert.Contains("buildData.character.allocatedAttributes.strength", fields);
        Assert.Contains("buildData.character.skills.Melee Attack", fields);
    }

    [Fact]
    public void RefusesAnItemWithoutReproducibleInstanceState()
    {
        var fixture = Valid();
        fixture.BuildData.Character.Equipment[0].Durability = null;

        var problem = Assert.Single(FixtureShapeValidator.Validate(fixture).Problems);
        Assert.Equal("buildData.character.equipment[12].durability", problem.Field);
    }
}
