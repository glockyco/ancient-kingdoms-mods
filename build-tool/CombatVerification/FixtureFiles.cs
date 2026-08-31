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
    internal static IReadOnlyList<string> ValidateShapes(string repoRoot)
    {
        var directory = BuildTool.Game.ScratchStates.FixturesDirectory(repoRoot);
        if (!Directory.Exists(directory))
            return Array.Empty<string>();

        var problems = new List<string>();
        foreach (var file in Directory.GetFiles(directory, "*.json", SearchOption.AllDirectories)
                     .OrderBy(path => path, StringComparer.Ordinal))
        {
            var relativePath = Path.GetRelativePath(repoRoot, file).Replace('\\', '/');
            FixtureDescriptor? fixture;
            try
            {
                fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(File.ReadAllText(file));
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
        }

        return problems;
    }
}
