using System;
using System.IO;
using Newtonsoft.Json;
using Xunit;

namespace BuildTool.Tests;

public sealed class FixtureFilesTests : IDisposable
{
    private const string ValidFixture = """
        {
          "schemaVersion": 3,
          "build": {
            "serializedSchemaVersion": 3,
            "modelVersion": "1",
            "gameData": {
              "gameVersion": "0.9.31.0",
              "steamBuildId": "24925347",
              "assemblySha256": "bd2521453b35dfb58c4feec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc"
            }
          },
          "name": "strict-fixture",
          "tier": "A",
          "coverage": "A.class.Warrior",
          "buildData": {
            "schemaVersion": 1,
            "player": {
              "entityId": "player",
              "classId": "warrior",
              "raceId": "human",
              "level": 1,
              "veteranPoints": 0,
              "attributes": {
                "rawObserved": null,
                "baseProgression": { "strength": 2, "constitution": 2, "dexterity": 1, "intelligence": 1, "wisdom": 1, "charisma": 1 },
                "allocated": { "strength": 2, "constitution": 0, "dexterity": 0, "intelligence": 0, "wisdom": 0, "charisma": 0 },
                "derivedObserved": null
              },
              "skills": [],
              "equipment": []
            },
            "companions": [],
            "consumables": [],
            "ammunition": [],
            "learnedBookIds": [],
            "provenance": { "kind": "authored", "source": "test" }
          },
          "execution": { "seed": 7 }
        }
        """;

    private readonly string _root = Directory.CreateTempSubdirectory("ak-fixtures").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    [Theory]
    [InlineData(false, "unknownRoot")]
    [InlineData(true, "buildData.player.unknownNested")]
    public void ReadMatrixRejectsUnknownFields(bool nested, string expectedPath)
    {
        WriteFixture(WithUnknownField(nested));

        var exception = Assert.Throws<JsonSerializationException>(
            () => BuildTool.CombatVerification.FixtureFiles.ReadMatrix(_root));

        Assert.Contains(expectedPath, exception.Message);
    }

    [Theory]
    [InlineData(false, "unknownRoot")]
    [InlineData(true, "buildData.player.unknownNested")]
    public void ValidateShapesReportsUnknownFieldsWithRelativePath(
        bool nested, string expectedPath)
    {
        WriteFixture(WithUnknownField(nested));

        var problems = BuildTool.CombatVerification.FixtureFiles.ValidateShapes(_root);
        var report = string.Join("\n", problems);

        Assert.Contains("verification/fixtures/fixture.json", report);
        Assert.Contains(expectedPath, report);
    }

    [Fact]
    public void RepositoryFixtureCorpusUsesTheSupportedShape()
    {
        var repoRoot = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "../../../../.."));

        Assert.Empty(BuildTool.CombatVerification.FixtureFiles.ValidateShapes(repoRoot));
    }

    [Fact]
    public void ReadMatrixRetainsSupportedFieldsAndDictionaryKeys()
    {
        WriteFixture(ValidFixture);

        var matrix = BuildTool.CombatVerification.FixtureFiles.ReadMatrix(_root);
        var entry = Assert.Single(matrix.Fixtures);
        var fixture = entry.Fixture;

        Assert.Equal(2, fixture.BuildData.Player.Attributes.Allocated.Strength);

        var problems = BuildTool.CombatVerification.FixtureFiles.ValidateShapes(_root);
        Assert.DoesNotContain(problems, problem => problem.Contains("Invalid JSON", StringComparison.Ordinal));
    }

    private string WithUnknownField(bool nested) => nested
        ? ValidFixture.Replace(
            "\"classId\": \"warrior\",",
            "\"classId\": \"warrior\",\n    \"unknownNested\": true,")
        : ValidFixture.Replace(
            "\"name\": \"strict-fixture\",",
            "\"name\": \"strict-fixture\",\n  \"unknownRoot\": true,");

    private void WriteFixture(string contents)
    {
        var directory = BuildTool.CombatVerification.FixtureFiles.DirectoryFor(_root);
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, "fixture.json"), contents);
    }
}
