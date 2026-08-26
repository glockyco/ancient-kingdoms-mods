using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

/// <summary>
/// A measurement is attributed to a build, and every citation in this repository resolves
/// against one decompiled assembly. These tests pin that the two are compared rather than
/// assumed to agree, because measuring a build the evidence does not describe would
/// attribute results to the wrong source.
/// </summary>
public sealed class GameBuildIdentityTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("ak-build-identity").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private string RepoRoot => Path.Combine(_root, "repo");
    private string GamePath => Path.Combine(_root, "game");

    private void WriteSnapshot(string body)
    {
        var dir = Path.Combine(RepoRoot, GameBuildIdentities.ServerScriptsLink);
        Directory.CreateDirectory(dir);
        File.WriteAllText(Path.Combine(dir, GameBuildIdentities.SnapshotFileName), body);
    }

    private string WriteAssembly(string contents)
    {
        var path = GameBuildIdentities.ServerAssemblyPath(GamePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, contents);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(contents))).ToLowerInvariant();
    }

    private static string SnapshotFor(string sha, string version = "0.9.31.0", string build = "24925347")
        => $"""
        game_version = "{version}"
        ilspycmd_version = "10.1.1.8388"
        assembly_sha256 = "{sha}"
        steam_build_id = "{build}"
        generated_at = "2026-08-25T17:01:45Z"
        """;

    // --- reading the recorded identity ---

    [Fact]
    public void ReadsTheRecordedIdentity()
    {
        WriteSnapshot(SnapshotFor("abc123"));

        var recorded = GameBuildIdentities.ReadRecorded(RepoRoot)!;

        Assert.Equal("abc123", recorded.AssemblySha256);
        Assert.Equal("0.9.31.0", recorded.GameVersion);
        Assert.Equal("24925347", recorded.SteamBuildId);
    }

    [Fact]
    public void ToleratesCommentsAndBlankLines()
    {
        WriteSnapshot("# written by the decompile\n\n" + SnapshotFor("abc123") + "\n");

        Assert.Equal("abc123", GameBuildIdentities.ReadRecorded(RepoRoot)!.AssemblySha256);
    }

    [Fact]
    public void AnAbsentSnapshotReadsAsNothing()
        => Assert.Null(GameBuildIdentities.ReadRecorded(RepoRoot));

    [Theory]
    [InlineData("game_version = \"1\"\nsteam_build_id = \"2\"")]          // no hash
    [InlineData("assembly_sha256 = \"a\"\nsteam_build_id = \"2\"")]      // no version
    [InlineData("assembly_sha256 = \"a\"\ngame_version = \"1\"")]        // no build id
    public void AnIncompleteSnapshotReadsAsNothing(string body)
    {
        WriteSnapshot(body);

        // Partial provenance is worse than none: it would stamp a result with a gap.
        Assert.Null(GameBuildIdentities.ReadRecorded(RepoRoot));
    }

    // --- hashing the installation ---

    [Fact]
    public void HashesTheInstalledServerAssembly()
    {
        var expected = WriteAssembly("assembly bytes");

        Assert.Equal(expected, GameBuildIdentities.HashInstalledAssembly(GamePath));
    }

    [Fact]
    public void AnAbsentAssemblyHashesToNothing()
        => Assert.Null(GameBuildIdentities.HashInstalledAssembly(GamePath));

    // --- agreement ---

    [Fact]
    public void AgreesWhenTheInstallationMatchesTheRecordedBuild()
    {
        var sha = WriteAssembly("build A");
        WriteSnapshot(SnapshotFor(sha));

        var check = GameBuildIdentities.Check(RepoRoot, GamePath);

        Assert.Equal(GameBuildAgreement.Agrees, check.Agreement);
        Assert.Equal(sha, check.InstalledAssemblySha256);
        Assert.Equal(sha, check.Recorded!.AssemblySha256);
    }

    [Fact]
    public void AgreementIgnoresHashLetterCase()
    {
        var sha = WriteAssembly("build A");
        WriteSnapshot(SnapshotFor(sha.ToUpperInvariant()));

        Assert.Equal(GameBuildAgreement.Agrees,
            GameBuildIdentities.Check(RepoRoot, GamePath).Agreement);
    }

    [Fact]
    public void DiffersWhenTheInstallationMovedButTheEvidenceDidNot()
    {
        // The exact hazard: the game updated, the decompile was not re-run, so results
        // would be attributed to source that no longer describes the build.
        WriteSnapshot(SnapshotFor(WriteAssembly("build A")));
        WriteAssembly("build B");

        var check = GameBuildIdentities.Check(RepoRoot, GamePath);

        Assert.Equal(GameBuildAgreement.Differs, check.Agreement);
        Assert.Contains("update-server-scripts", check.Detail);
    }

    [Fact]
    public void ReportsAMissingSnapshotRatherThanAssumingAgreement()
    {
        WriteAssembly("build A");

        var check = GameBuildIdentities.Check(RepoRoot, GamePath);

        Assert.Equal(GameBuildAgreement.SnapshotUnavailable, check.Agreement);
        Assert.Null(check.Recorded);
        Assert.NotNull(check.InstalledAssemblySha256);
    }

    [Fact]
    public void ReportsAMissingAssemblyRatherThanAssumingAgreement()
    {
        WriteSnapshot(SnapshotFor("abc123"));

        var check = GameBuildIdentities.Check(RepoRoot, GamePath);

        Assert.Equal(GameBuildAgreement.AssemblyUnavailable, check.Agreement);
        Assert.NotNull(check.Recorded);
        Assert.Null(check.InstalledAssemblySha256);
    }

    // --- naming ---

    [Fact]
    public void ShortNameMatchesTheDecompiledEntryNaming()
    {
        var identity = new GameBuildIdentity(
            "0bef5c978745771c5482e6b5cb1931dbfe8527b621d48a60d1ef1c411cb8aeba",
            "0.9.31.0",
            "24925347");

        // The same form scripts/update-server-scripts.sh gives its snapshot directory.
        Assert.Equal("steam-24925347-0bef5c978745", identity.ShortName);
    }

    [Fact]
    public void ToStringNamesTheVersionAndTheBuild()
    {
        var identity = new GameBuildIdentity("0bef5c978745771c", "0.9.31.0", "24925347");

        Assert.Equal("0.9.31.0 (steam-24925347-0bef5c978745)", identity.ToString());
    }

    [Fact]
    public void ShortNameToleratesAShortHash()
    {
        var identity = new GameBuildIdentity("abc", "0.9.31.0", "1");

        Assert.Equal("steam-1-abc", identity.ShortName);
    }
}
