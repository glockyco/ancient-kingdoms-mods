using System.Collections.Generic;
using System.Linq;
using CombatVerification.Builds;
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
            SchemaVersion = LogicalBuildAdapter.SchemaVersion,
            Player = new PlayerBuild
            {
                EntityId = "player",
                ClassId = "warrior",
                RaceId = "human",
                Level = 50,
                Attributes = BuildEnvelopeTestData.Attributes(),
                Skills = new List<AllocatedSkill>(),
                Equipment = new List<EquippedItem>
                {
                    new() { Slot = 12, ItemId = "sword", Durability = 100, Amount = 1 },
                },
            },
            Companions = new List<CompanionBuild>(),
            Consumables = new List<ItemQuantity>(),
            Ammunition = new List<ItemQuantity>(),
            LearnedBookIds = new List<string>(),
            Provenance = new BuildProvenance { Kind = "authored", Source = "test" },
        },
        Execution = new FixtureExecution { Seed = 7 },
    };

    [Fact]
    public void AcceptsShapeWithoutGameRules()
    {
        var fixture = Valid();
        fixture.BuildData.Player.ClassId = "unknown_class";
        fixture.BuildData.Player.Level = 999;
        fixture.BuildData.Player.Skills.Add(new AllocatedSkill
        {
            SkillId = "unknown_skill",
            Level = 999,
            Pool = "normal",
        });
        fixture.BuildData.Player.Equipment[0].Slot = 999;

        Assert.True(FixtureShapeValidator.Validate(fixture).Ok);
    }

    [Fact]
    public void RefusesUnsupportedSchemaAndMissingSectionsTogether()
    {
        var fixture = Valid();
        fixture.SchemaVersion = 99;
        fixture.Build.SerializedSchemaVersion = 99;
        fixture.BuildData.Player.Skills = null!;
        fixture.BuildData.Player.Equipment = null!;
        fixture.BuildData.Consumables = null!;
        fixture.BuildData.Ammunition = null!;
        fixture.BuildData.LearnedBookIds = null!;
        fixture.BuildData.Provenance = null!;
        fixture.Execution = null!;

        var fields = FixtureShapeValidator.Validate(fixture).Problems
            .Select(problem => problem.Field)
            .ToArray();

        Assert.Contains("schemaVersion", fields);
        Assert.Contains("build.serializedSchemaVersion", fields);
        Assert.Contains("buildData.player.skills", fields);
        Assert.Contains("buildData.player.equipment", fields);
        Assert.Contains("buildData.consumables", fields);
        Assert.Contains("buildData.ammunition", fields);
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
        fixture.BuildData.Player.Equipment.Add(
            new EquippedItem { Slot = 12, ItemId = "shield", Durability = 100, Amount = 1 });

        var problem = Assert.Single(FixtureShapeValidator.Validate(fixture).Problems);
        Assert.Equal("buildData.player.equipment[1].slot", problem.Field);
    }

    [Fact]
    public void RefusesNegativeValuesWithoutAReachabilityTable()
    {
        var fixture = Valid();
        fixture.BuildData.Player.Level = -1;
        fixture.BuildData.Player.VeteranPoints = -1;
        fixture.BuildData.Player.Attributes.Allocated.Strength = -1;
        fixture.BuildData.Player.Skills.Add(new AllocatedSkill
        {
            SkillId = "melee_attack",
            Level = -1,
            Pool = "normal",
        });

        var fields = FixtureShapeValidator.Validate(fixture).Problems
            .Select(problem => problem.Field)
            .ToArray();

        Assert.Contains("buildData.player.level", fields);
        Assert.Contains("buildData.player.veteranPoints", fields);
        Assert.Contains("buildData.player.attributes.allocated.strength", fields);
        Assert.Contains("buildData.player.skills[0].level", fields);
    }

    [Fact]
    public void RefusesAnItemWithoutPositiveAmount()
    {
        var fixture = Valid();
        fixture.BuildData.Player.Equipment[0].Amount = 0;

        var problem = Assert.Single(FixtureShapeValidator.Validate(fixture).Problems);
        Assert.Equal("buildData.player.equipment[0].amount", problem.Field);
    }
}
