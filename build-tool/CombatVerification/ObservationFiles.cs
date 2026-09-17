using System;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using BuildTool.Game;
using CombatVerification.Fixtures;

namespace BuildTool.CombatVerification;

/// <summary>One committed observation: what the game measured for one fixture, with its identities.</summary>
public sealed record ObservationRecord(
    [property: JsonPropertyName("schemaVersion")] int SchemaVersion,
    [property: JsonPropertyName("fixture")] ObservationFixture Fixture,
    [property: JsonPropertyName("game")] ObservationGame Game,
    [property: JsonPropertyName("recordedAt")] DateTimeOffset RecordedAt,
    [property: JsonPropertyName("achieved")] JsonElement Achieved,
    [property: JsonPropertyName("observation")] JsonElement Observation);

public sealed record ObservationFixture(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("tier")] string Tier,
    [property: JsonPropertyName("coverage")] string Coverage,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("contentSha256")] string ContentSha256);

public sealed record ObservationGame(
    [property: JsonPropertyName("assemblySha256")] string AssemblySha256,
    [property: JsonPropertyName("gameVersion")] string GameVersion,
    [property: JsonPropertyName("steamBuildId")] string SteamBuildId);

/// <summary>Writes observation records where the website comparison reads them.</summary>
internal static class ObservationFiles
{
    public const int SchemaVersion = 1;

    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
    };

    internal static string DirectoryFor(string repoRoot) =>
        Path.Combine(repoRoot, "verification", "observations");

    internal static string PathFor(string repoRoot, string fixtureName) =>
        Path.Combine(DirectoryFor(repoRoot), fixtureName + ".json");

    internal static ObservationRecord Build(
        string repoRoot,
        string fixturePath,
        FixtureDescriptor fixture,
        GameBuildIdentity game,
        JsonElement achieved,
        JsonElement observation,
        DateTimeOffset recordedAt)
    {
        var bytes = File.ReadAllBytes(fixturePath);
        var relative = Path.GetRelativePath(repoRoot, fixturePath).Replace('\\', '/');
        return new ObservationRecord(
            SchemaVersion,
            new ObservationFixture(
                fixture.Name,
                fixture.Tier,
                fixture.Coverage,
                relative,
                Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant()),
            new ObservationGame(game.AssemblySha256, game.GameVersion, game.SteamBuildId),
            recordedAt,
            achieved,
            observation);
    }

    internal static string Write(string repoRoot, ObservationRecord record)
    {
        var path = PathFor(repoRoot, record.Fixture.Name);
        Directory.CreateDirectory(DirectoryFor(repoRoot));
        File.WriteAllText(path, JsonSerializer.Serialize(record, Options) + "\n");
        return path;
    }
}
