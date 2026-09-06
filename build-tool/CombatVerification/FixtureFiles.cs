using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using CombatVerification.Fixtures;
using Newtonsoft.Json;

namespace BuildTool.CombatVerification;

/// <summary>Reads committed fixtures and checks their structure before the game starts.</summary>
internal static class FixtureFiles
{
    private static readonly JsonSerializerSettings StrictFixtureJsonSettings = new()
    {
        MissingMemberHandling = MissingMemberHandling.Error,
    };

    internal static string DirectoryFor(string repoRoot) =>
        Path.Combine(repoRoot, "verification", "fixtures");

    private static FixtureDescriptor DeserializeFixture(string path) =>
        JsonConvert.DeserializeObject<FixtureDescriptor>(
            File.ReadAllText(path), StrictFixtureJsonSettings)!;

    internal static FixtureMatrix ReadMatrix(string repoRoot)
    {
        var directory = DirectoryFor(repoRoot);
        var files = Directory.Exists(directory)
            ? Directory.GetFiles(directory, "*.json", SearchOption.AllDirectories)
            : Array.Empty<string>();
        var fixtures = files
            .OrderBy(path => path, StringComparer.Ordinal)
            .Select(DeserializeFixture)
            .Select(fixture => new FixtureMatrixEntry
            {
                Tier = fixture.Tier,
                Coverage = fixture.Coverage,
                DurationSeconds = fixture.Execution?.DurationSeconds,
                Repetitions = fixture.Execution?.Repetitions ?? 1,
                Fixture = fixture,
            })
            .ToList();
        return new FixtureMatrix
        {
            SchemaVersion = FixtureMatrixValidator.SchemaVersion,
            Fixtures = fixtures,
        };
    }

    internal static IReadOnlyList<string> ValidateShapes(string repoRoot)
    {
        var directory = DirectoryFor(repoRoot);
        if (!Directory.Exists(directory))
            return Array.Empty<string>();

        var problems = new List<string>();
        var entries = new List<(string Path, FixtureMatrixEntry Entry)>();
        foreach (var file in Directory.GetFiles(directory, "*.json", SearchOption.AllDirectories)
                     .OrderBy(path => path, StringComparer.Ordinal))
        {
            var relativePath = Path.GetRelativePath(repoRoot, file).Replace('\\', '/');
            FixtureDescriptor? fixture;
            try
            {
                fixture = DeserializeFixture(file);
            }
            catch (JsonException exception)
            {
                problems.Add($"{relativePath}: fixture: Invalid JSON: {exception.Message}");
                continue;
            }
            catch (IOException exception)
            {
                problems.Add($"{relativePath}: fixture: Cannot read the file: {exception.Message}");
                continue;
            }
            catch (UnauthorizedAccessException exception)
            {
                problems.Add($"{relativePath}: fixture: Cannot read the file: {exception.Message}");
                continue;
            }

            foreach (var problem in FixtureShapeValidator.Validate(fixture).Problems)
                problems.Add($"{relativePath}: {problem}");
            if (fixture is not null)
            {
                entries.Add((relativePath, new FixtureMatrixEntry
                {
                    Tier = fixture.Tier,
                    Coverage = fixture.Coverage,
                    DurationSeconds = fixture.Execution?.DurationSeconds,
                    Repetitions = fixture.Execution?.Repetitions ?? 1,
                    Fixture = fixture,
                }));
            }
        }

        if (entries.Count > 0)
        {
            var matrix = FixtureMatrixValidator.Validate(new FixtureMatrix
            {
                SchemaVersion = FixtureMatrixValidator.SchemaVersion,
                Fixtures = entries.Select(entry => entry.Entry).ToList(),
            }, rules: null!);
            foreach (var problem in matrix.MatrixProblems)
                problems.Add($"verification/fixtures: {problem.Field}: {problem.Message}");
            for (var index = 0; index < matrix.Fixtures.Count; index++)
            {
                foreach (var problem in matrix.Fixtures[index].Problems)
                    problems.Add($"{entries[index].Path}: {problem.Field}: {problem.Message}");
            }
        }

        return problems;
    }
}
