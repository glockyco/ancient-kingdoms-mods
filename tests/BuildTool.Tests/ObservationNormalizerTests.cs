using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using BuildTool.CombatVerification;
using BuildTool.Game;
using CombatVerification.Fixtures;
using Xunit;

namespace BuildTool.Tests;

public sealed class ObservationNormalizerTests
{
    [Fact]
    public void TierDTraceBecomesOneCompactWindowSample()
    {
        var compact = ObservationNormalizer.Normalize(ClassFixture(), DetailedTierD()).GetProperty(
            "measurements")[0].GetProperty("samples")[0];

        Assert.Equal(20.25, compact.GetProperty("durationSeconds").GetDouble());
        Assert.Equal(10, compact.GetProperty("playerDamage").GetInt64());
        var companion = compact.GetProperty("companionDamage")[0];
        Assert.Equal("companion", companion.GetProperty("entityId").GetString());
        Assert.Equal("Rogue", companion.GetProperty("archetype").GetString());
        Assert.Equal(9, companion.GetProperty("damage").GetInt64());
        Assert.Equal(3, compact.GetProperty("counts").GetProperty("attempted").GetInt32());
        Assert.Equal("perHitAttributed", compact.GetProperty("fidelity").GetString());

        var resources = compact.GetProperty("resourceTransitions");
        Assert.Equal(2, resources.GetArrayLength());
        Assert.Equal(0, resources[0].GetProperty("atSeconds").GetDouble());
        Assert.Equal(5, resources[1].GetProperty("atSeconds").GetDouble());
        var effect = Assert.Single(compact.GetProperty("maintainedEffects").EnumerateArray());
        Assert.Equal("adrenaline_rush", effect.GetProperty("skillId").GetString());
        Assert.Equal(1, effect.GetProperty("firstObservedAtSeconds").GetDouble());
        Assert.Equal(19, effect.GetProperty("lastObservedAtSeconds").GetDouble());

        foreach (var diagnostic in new[]
                 {
                     "hits", "attempts", "completions", "intervals", "openedAt", "closedAt",
                 })
            Assert.False(compact.TryGetProperty(diagnostic, out _), diagnostic);
    }

    [Theory]
    [InlineData("resourceTransitions")]
    [InlineData("counts")]
    public void MissingTierDEvidenceNamesFixtureAndField(string field)
    {
        var root = JsonNode.Parse(DetailedTierD().GetRawText())!.AsObject();
        var sample = root["measurements"]![0]!["samples"]![0]!.AsObject();
        sample.Remove(field);
        var malformed = JsonSerializer.SerializeToElement(root);

        var error = Assert.Throws<InvalidDataException>(
            () => ObservationNormalizer.Normalize(ClassFixture(), malformed));

        Assert.Contains("D-class-test", error.Message);
        Assert.Contains(field, error.Message);
    }

    [Fact]
    public void ClassWindowWithoutDeclaredEffectIsRefused()
    {
        var text = DetailedTierD().GetRawText().Replace(
            "Adrenaline Rush", "Unrelated Effect", StringComparison.Ordinal);
        var observation = JsonDocument.Parse(text).RootElement.Clone();

        var error = Assert.Throws<InvalidDataException>(
            () => ObservationNormalizer.Normalize(ClassFixture(), observation));

        Assert.Contains("D-class-test", error.Message);
        Assert.Contains("observedEffects", error.Message);
    }

    [Fact]
    public void EarlierTiersOnlyChangeTheOuterSchemaVersion()
    {
        var root = Directory.CreateTempSubdirectory("observation-normalizer").FullName;
        try
        {
            var fixturePath = Path.Combine(root, "A-test.json");
            File.WriteAllText(fixturePath, "{}");
            var payload = JsonDocument.Parse(
                "{\"tier\":\"A\",\"measurements\":[{\"quantity\":\"statSheet\",\"samples\":[{\"value\":7}]}]}")
                .RootElement.Clone();
            var achieved = JsonDocument.Parse("{\"ok\":true}").RootElement.Clone();
            var fixture = new FixtureDescriptor
            {
                Name = "A-test",
                Tier = "A",
                Coverage = "A.class.Warrior",
            };

            var record = ObservationFiles.Build(
                root,
                fixturePath,
                fixture,
                new GameBuildIdentity("abc", "1", "2"),
                achieved,
                payload,
                DateTimeOffset.UnixEpoch);

            Assert.Equal(2, record.SchemaVersion);
            Assert.Equal(payload.GetRawText(), record.Observation.GetRawText());
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static FixtureDescriptor ClassFixture() => new()
    {
        Name = "D-class-test",
        Tier = "D",
        Coverage = "D.class.Rogue",
        Execution = new FixtureExecution
        {
            Actions = new()
            {
                new ActionSpec { Skill = "Adrenaline Rush", Facing = "front" },
            },
        },
    };

    private static JsonElement DetailedTierD() => JsonDocument.Parse(
        """
        {
          "tier":"D",
          "measurements":[{
            "quantity":"window",
            "unit":"damage",
            "samplingUnit":"window",
            "windowSeconds":20,
            "counts":{"attempted":3,"accepted":2,"completed":2,"landed":2},
            "samples":[{
              "openedAt":100,
              "closedAt":120.25,
              "hits":[{"amount":4},{"amount":6}],
              "attempts":[{"at":100,"skill":"Adrenaline Rush","mana":10,"energy":20}],
              "completions":[101,105],
              "intervals":[4],
              "companionDamage":[{"entityId":"companion","name":"Merc","archetype":"Rogue","damage":9}],
              "counts":{"attempted":3,"accepted":2,"completed":2,"landed":2},
              "fidelity":"perHitAttributed",
              "fidelityLimit":null,
              "resourceTransitions":[{"at":100,"mana":10,"energy":20},{"at":101,"mana":10,"energy":20},{"at":105,"mana":8,"energy":20}],
              "observedEffects":[{"skillId":"adrenaline_rush","name":"Adrenaline Rush","firstObservedAt":101,"lastObservedAt":119}]
            }]
          }]
        }
        """).RootElement.Clone();
}
