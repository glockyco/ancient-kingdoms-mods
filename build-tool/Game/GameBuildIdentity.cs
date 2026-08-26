using System;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;

namespace BuildTool.Game;

/// <summary>
/// Which game build a measurement was taken against.
/// </summary>
/// <param name="AssemblySha256">
/// Hash of the server assembly the decompiled evidence was produced from. This is the
/// comparison key, because it is the only field that can be recomputed from the
/// installation.
/// </param>
/// <param name="GameVersion">Version the game reports for itself. A label, not a key.</param>
/// <param name="SteamBuildId">Steam's build identifier. A label, not a key.</param>
public sealed record GameBuildIdentity(string AssemblySha256, string GameVersion, string SteamBuildId)
{
    /// <summary>Short form for a report or a directory name, matching the snapshot naming.</summary>
    public string ShortName =>
        $"steam-{SteamBuildId}-{AssemblySha256[..Math.Min(12, AssemblySha256.Length)]}";

    public override string ToString() => $"{GameVersion} ({ShortName})";
}

/// <summary>
/// Why an installation and the decompiled evidence beside it do not describe one build.
/// </summary>
public enum GameBuildAgreement
{
    /// <summary>The installed assembly hashes to the value the snapshot records.</summary>
    Agrees,

    /// <summary>The snapshot is absent or lacks a field, so there is nothing to compare.</summary>
    SnapshotUnavailable,

    /// <summary>The installed assembly is absent, so the recorded value cannot be confirmed.</summary>
    AssemblyUnavailable,

    /// <summary>Both were read and they name different builds.</summary>
    Differs,
}

public sealed record GameBuildCheck(
    GameBuildAgreement Agreement,
    GameBuildIdentity? Recorded,
    string? InstalledAssemblySha256,
    string Detail);

/// <summary>
/// Reads the build identity the repository already keys its decompiled evidence by, and
/// confirms the installation still matches it.
/// </summary>
/// <remarks>
/// Every citation in this repository resolves against <c>server-scripts</c>, which is a
/// decompilation of one server assembly. Stamping a measurement with that assembly's hash
/// makes the measurement, the citations, and the evidence name the same build. A version
/// string cannot serve as the key, because nothing can recompute it from the installation.
/// </remarks>
public static class GameBuildIdentities
{
    /// <summary>Snapshot the decompile writes beside the sources it produced.</summary>
    public const string SnapshotFileName = "SNAPSHOT.toml";

    /// <summary>Symlink in the repository that points at the current decompiled entry.</summary>
    public const string ServerScriptsLink = "server-scripts";

    /// <summary>Server assembly, relative to the installation root, that the decompile reads.</summary>
    public static readonly string ServerAssemblyRelativePath =
        Path.Combine("server", "server_Data", "Managed", "Assembly-CSharp.dll");

    public static string SnapshotPath(string repoRoot)
        => Path.Combine(repoRoot, ServerScriptsLink, SnapshotFileName);

    public static string ServerAssemblyPath(string gamePath)
        => Path.Combine(gamePath, ServerAssemblyRelativePath);

    /// <summary>Reads the recorded identity, or null when it is absent or incomplete.</summary>
    public static GameBuildIdentity? ReadRecorded(string repoRoot)
    {
        var path = SnapshotPath(repoRoot);
        if (!File.Exists(path))
            return null;

        string? assembly = null;
        string? version = null;
        string? buildId = null;

        foreach (var line in File.ReadLines(path))
        {
            if (!TryReadAssignment(line, out var key, out var value))
                continue;

            switch (key)
            {
                case "assembly_sha256": assembly = value; break;
                case "game_version": version = value; break;
                case "steam_build_id": buildId = value; break;
            }
        }

        return assembly is null || version is null || buildId is null
            ? null
            : new GameBuildIdentity(assembly, version, buildId);
    }

    /// <summary>SHA-256 of the installed server assembly, or null when it is absent.</summary>
    public static string? HashInstalledAssembly(string gamePath)
    {
        var path = ServerAssemblyPath(gamePath);
        if (!File.Exists(path))
            return null;

        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }

    /// <summary>
    /// Confirms the installation and the decompiled evidence name one build. A run that
    /// measures a build its evidence does not describe would attribute its results to the
    /// wrong source, so this is checked rather than assumed.
    /// </summary>
    public static GameBuildCheck Check(string repoRoot, string gamePath)
    {
        var recorded = ReadRecorded(repoRoot);
        var installed = HashInstalledAssembly(gamePath);

        if (recorded is null)
            return new GameBuildCheck(
                GameBuildAgreement.SnapshotUnavailable, null, installed,
                $"No usable build snapshot at {SnapshotPath(repoRoot)}. "
                + "Run scripts/update-server-scripts.sh to record one.");

        if (installed is null)
            return new GameBuildCheck(
                GameBuildAgreement.AssemblyUnavailable, recorded, null,
                $"No server assembly at {ServerAssemblyPath(gamePath)}, so the recorded build "
                + $"{recorded} cannot be confirmed.");

        if (!string.Equals(installed, recorded.AssemblySha256, StringComparison.OrdinalIgnoreCase))
            return new GameBuildCheck(
                GameBuildAgreement.Differs, recorded, installed,
                $"The installation does not match the decompiled evidence. Recorded {recorded}, "
                + $"installed assembly {installed[..Math.Min(12, installed.Length)]}. "
                + "Run scripts/update-server-scripts.sh before measuring, so results and "
                + "citations describe the same build.");

        return new GameBuildCheck(
            GameBuildAgreement.Agrees, recorded, installed,
            $"Installation matches the recorded build {recorded}.");
    }

    /// <summary>Reads a <c>key = "value"</c> assignment from one snapshot line.</summary>
    private static bool TryReadAssignment(string line, out string key, out string value)
    {
        key = string.Empty;
        value = string.Empty;

        var trimmed = line.Trim();
        if (trimmed.Length == 0 || trimmed[0] == '#')
            return false;

        var split = trimmed.IndexOf('=');
        if (split <= 0)
            return false;

        key = trimmed[..split].Trim();

        var raw = trimmed[(split + 1)..].Trim();
        var comment = raw.IndexOf('#');
        if (comment >= 0 && !raw.StartsWith('"'))
            raw = raw[..comment].Trim();

        if (raw.Length >= 2 && raw[0] == '"' && raw[^1] == '"')
            raw = raw[1..^1];

        value = raw;
        return key.Length > 0 && value.Length > 0;
    }
}
