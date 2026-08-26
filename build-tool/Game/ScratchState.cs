using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace BuildTool.Game;

/// <summary>What a retained scratch database was built from, and where it is.</summary>
/// <param name="AssemblySha256">Build identity the fixtures were materialized against.</param>
/// <param name="FixturesSha256">Digest of the fixture definitions that were materialized.</param>
/// <param name="DatabasePath">
/// Database the run actually opened, as the game reported it. Recorded rather than
/// reconstructed: the game owns where its scratch database lives, so restating that
/// location here would be a second source of truth that could disagree with it.
/// </param>
public sealed record ScratchMarker(
    string AssemblySha256,
    string FixturesSha256,
    string? DatabasePath = null);

public enum ScratchDecision
{
    /// <summary>Nothing retained, or what was retained is gone, so materialize afresh.</summary>
    Build,

    /// <summary>Retained state was built from this build and these fixtures.</summary>
    Reuse,

    /// <summary>The game moved since the retained state was built.</summary>
    RebuildGameChanged,

    /// <summary>A fixture definition changed since the retained state was built.</summary>
    RebuildFixturesChanged,
}

public sealed record ScratchPlan(ScratchDecision Decision, string Detail)
{
    /// <summary>Whether existing scratch state may be measured without rebuilding.</summary>
    public bool CanReuse => Decision == ScratchDecision.Reuse;
}

/// <summary>
/// Decides whether a retained scratch database can be measured again. Materializing a
/// fixture matrix costs real time, so state is retained, but a game update can change a
/// class's abilities and an edited fixture describes a different build.
/// </summary>
public static class ScratchStates
{
    public const string MarkerFileName = "scratch-state.toml";

    /// <summary>Committed fixture definitions this repository measures.</summary>
    public static readonly string FixturesRelativeDirectory =
        Path.Combine("verification", "fixtures");

    public static string MarkerPath(string scratchDirectory) =>
        Path.Combine(scratchDirectory, MarkerFileName);

    public static string FixturesDirectory(string repoRoot) =>
        Path.Combine(repoRoot, FixturesRelativeDirectory);

    /// <summary>
    /// Digest of every fixture definition, by name and content. Returns a stable value when
    /// no fixtures exist yet, so that adding the first one is itself a change.
    /// </summary>
    public static string HashFixtures(string repoRoot)
    {
        var directory = FixturesDirectory(repoRoot);
        var files = Directory.Exists(directory)
            ? Directory.GetFiles(directory, "*.json", SearchOption.AllDirectories)
                .OrderBy(p => p, StringComparer.Ordinal)
                .ToArray()
            : Array.Empty<string>();

        using var digest = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        foreach (var file in files)
        {
            // Name and content both matter: a rename changes which fixture a baseline keys on.
            digest.AppendData(Encoding.UTF8.GetBytes(
                Path.GetRelativePath(directory, file).Replace('\\', '/')));
            digest.AppendData(File.ReadAllBytes(file));
        }

        return Convert.ToHexString(digest.GetHashAndReset()).ToLowerInvariant();
    }

    public static ScratchMarker? ReadMarker(string scratchDirectory)
    {
        var path = MarkerPath(scratchDirectory);
        if (!File.Exists(path))
            return null;

        string? assembly = null;
        string? fixtures = null;
        string? database = null;

        foreach (var line in File.ReadLines(path))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed[0] == '#')
                continue;

            var split = trimmed.IndexOf('=');
            if (split <= 0)
                continue;

            var key = trimmed[..split].Trim();
            var value = trimmed[(split + 1)..].Trim().Trim('"');
            if (value.Length == 0)
                continue;

            if (key == "assembly_sha256") assembly = value;
            else if (key == "fixtures_sha256") fixtures = value;
            else if (key == "database_path") database = value;
        }

        return assembly is null || fixtures is null
            ? null
            : new ScratchMarker(assembly, fixtures, database);
    }

    public static void WriteMarker(string scratchDirectory, ScratchMarker marker)
    {
        Directory.CreateDirectory(scratchDirectory);
        File.WriteAllText(MarkerPath(scratchDirectory),
            $"""
            # Written by a verification run. Records what the retained scratch state was
            # built from, so a later run can tell whether it may be measured again.
            assembly_sha256 = "{marker.AssemblySha256}"
            fixtures_sha256 = "{marker.FixturesSha256}"
            database_path = "{marker.DatabasePath}"

            """);
    }

    /// <summary>
    /// Compares retained state against the current build and fixtures.
    /// </summary>
    /// <param name="databaseExists">
    /// Whether the recorded database is present. Supplied by the caller, because the game
    /// reports its path in its own terms and only the caller knows how to resolve one.
    /// </param>
    public static ScratchPlan Plan(
        string scratchDirectory,
        ScratchMarker current,
        Func<string?, bool> databaseExists)
    {
        var recorded = ReadMarker(scratchDirectory);
        if (recorded is null)
            return new ScratchPlan(ScratchDecision.Build,
                "No retained scratch state, so it is materialized from the beginning.");

        if (!string.Equals(recorded.AssemblySha256, current.AssemblySha256,
                StringComparison.OrdinalIgnoreCase))
            return new ScratchPlan(ScratchDecision.RebuildGameChanged,
                "The game changed since the scratch state was built, and an update can alter a "
                + "class's abilities, so it is rebuilt.");

        if (!string.Equals(recorded.FixturesSha256, current.FixturesSha256,
                StringComparison.OrdinalIgnoreCase))
            return new ScratchPlan(ScratchDecision.RebuildFixturesChanged,
                "A fixture definition changed since the scratch state was built, so it is rebuilt.");

        if (!databaseExists(recorded.DatabasePath))
            return new ScratchPlan(ScratchDecision.Build,
                "The scratch database the marker names is gone, so it is materialized afresh.");

        return new ScratchPlan(ScratchDecision.Reuse,
            "Retained scratch state was built from this game build and these fixtures.");
    }
}
