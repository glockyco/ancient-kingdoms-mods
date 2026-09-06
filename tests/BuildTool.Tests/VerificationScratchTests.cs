using System;
using System.IO;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

/// <summary>Scratch preparation must never remove data outside the owned tree.</summary>
public sealed class VerificationScratchTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("ak-verification-scratch").FullName;

    public void Dispose()
    {
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
    }

    private string GamePath => Path.Combine(_root, "game");
    private string DataPath => PlayerSave.DirectoryFor(GamePath);
    private string ScratchPath => VerificationScratch.DirectoryFor(GamePath);

    [Fact]
    public void ResetRemovesScratchButPreservesDataSiblings()
    {
        Directory.CreateDirectory(ScratchPath);
        File.WriteAllText(Path.Combine(ScratchPath, "stale.txt"), "stale");
        File.WriteAllText(Path.Combine(DataPath, "player-sidecar"), "keep");

        var database = VerificationScratch.Prepare(GamePath, reset: true);

        Assert.True(Directory.Exists(ScratchPath));
        Assert.False(File.Exists(Path.Combine(ScratchPath, "stale.txt")));
        Assert.Equal("keep", File.ReadAllText(Path.Combine(DataPath, "player-sidecar")));
        Assert.Equal(
            Path.Combine(VerificationScratch.Validate(GamePath), PlayerSave.DatabaseFileName),
            database);
    }

    [Fact]
    public void PrepareCreatesTheDataParentBeforeTheScratchDirectory()
    {
        Directory.CreateDirectory(GamePath);

        var database = VerificationScratch.Prepare(GamePath, reset: true);

        Assert.True(Directory.Exists(DataPath));
        Assert.True(Directory.Exists(ScratchPath));
        Assert.Equal(
            Path.Combine(VerificationScratch.Validate(GamePath), PlayerSave.DatabaseFileName),
            database);
    }

    [Fact]
    public void NonResetPreparationRetainsVerifiedScratchFiles()
    {
        Directory.CreateDirectory(ScratchPath);
        var retained = Path.Combine(ScratchPath, "retained.txt");
        File.WriteAllText(retained, "retained");

        VerificationScratch.Prepare(GamePath, reset: false);

        Assert.Equal("retained", File.ReadAllText(retained));
    }

    [Fact]
    public void RefusesASymlinkedScratchBeforeTouchingItsTarget()
    {
        Directory.CreateDirectory(GamePath);
        Directory.CreateDirectory(DataPath);
        var outside = Path.Combine(_root, "outside");
        Directory.CreateDirectory(outside);
        var protectedFile = Path.Combine(outside, "protected.txt");
        File.WriteAllText(protectedFile, "protected");
        Directory.CreateSymbolicLink(ScratchPath, outside);

        Assert.Throws<IOException>(() => VerificationScratch.Prepare(GamePath, reset: true));

        Assert.Equal("protected", File.ReadAllText(protectedFile));
        Assert.True(Directory.Exists(ScratchPath));
        Assert.NotNull(new DirectoryInfo(ScratchPath).LinkTarget);
    }

    [Fact]
    public void RefusesANestedEscapedSymlinkBeforeRemovingAnyScratchEntry()
    {
        Directory.CreateDirectory(ScratchPath);
        var preserved = Path.Combine(ScratchPath, "preserved.txt");
        File.WriteAllText(preserved, "preserved");
        var outside = Path.Combine(_root, "outside.txt");
        File.WriteAllText(outside, "protected");
        Directory.CreateSymbolicLink(Path.Combine(ScratchPath, "escape.txt"), outside);

        Assert.Throws<IOException>(() => VerificationScratch.Prepare(GamePath, reset: true));

        Assert.Equal("preserved", File.ReadAllText(preserved));
        Assert.Equal("protected", File.ReadAllText(outside));
    }

    [Fact]
    public void RefusesABrokenScratchLinkInsteadOfTreatingItAsMissing()
    {
        Directory.CreateDirectory(GamePath);
        Directory.CreateDirectory(DataPath);
        Directory.CreateSymbolicLink(ScratchPath, Path.Combine(_root, "missing"));

        Assert.Throws<IOException>(() => VerificationScratch.Prepare(GamePath, reset: true));
    }

    [Fact]
    public void RefusesASymlinkedDataBoundary()
    {
        Directory.CreateDirectory(GamePath);
        var outside = Path.Combine(_root, "outside-data");
        Directory.CreateDirectory(outside);
        Directory.CreateSymbolicLink(DataPath, outside);

        Assert.Throws<IOException>(() => VerificationScratch.Prepare(GamePath, reset: true));
        Assert.True(Directory.Exists(outside));
    }

    [Fact]
    public void RefusesASymlinkedInstallationBoundary()
    {
        var outside = Path.Combine(_root, "outside-game");
        Directory.CreateDirectory(outside);
        Directory.CreateSymbolicLink(GamePath, outside);

        Assert.Throws<IOException>(() => VerificationScratch.Prepare(GamePath, reset: true));
        Assert.True(Directory.Exists(outside));
    }

    [Fact]
    public void ConfirmsOnlyTheExactCanonicalDatabasePath()
    {
        Directory.CreateDirectory(GamePath);
        VerificationScratch.Prepare(GamePath, reset: true);
        var mismatch = Path.Combine(DataPath, "other.dat");

        Assert.Throws<IOException>(() => VerificationScratch.ConfirmReportedPath(
            GamePath, _root, mismatch));
    }

    [Fact]
    public void RefusesAReportedSymlinkAliasToTheOwnedDatabase()
    {
        Directory.CreateDirectory(GamePath);
        VerificationScratch.Prepare(GamePath, reset: true);
        var alias = Path.Combine(_root, "database-alias");
        Directory.CreateSymbolicLink(alias, ScratchPath);

        Assert.Throws<IOException>(() => VerificationScratch.ConfirmReportedPath(
            GamePath, _root, Path.Combine(alias, PlayerSave.DatabaseFileName)));
    }

    [Fact]
    public void ConfirmsAValidWineCPath()
    {
        var prefix = Path.Combine(_root, "prefix");
        var game = Path.Combine(prefix, "drive_c", "Game");
        Directory.CreateDirectory(game);
        VerificationScratch.Prepare(game, reset: true);
        var expected = Path.Combine(VerificationScratch.Validate(game), PlayerSave.DatabaseFileName);

        var actual = VerificationScratch.ConfirmReportedPath(
            game, prefix, "C:/Game/ancientkingdoms_Data/verification-scratch/game.dat");

        Assert.Equal(Path.GetFullPath(expected), actual);
    }

    [Theory]
    [InlineData("game")]
    [InlineData("../game")]
    public void RefusesRelativeAndTraversalInstallationPaths(string path)
    {
        Assert.Throws<IOException>(() => VerificationScratch.Validate(path));
    }

    [Theory]
    [InlineData("C:relative/game.dat")]
    [InlineData("C:/Game/../other.dat")]
    [InlineData("relative/game.dat")]
    public void RefusesRelativeOrTraversalReportedPaths(string path)
    {
        Directory.CreateDirectory(GamePath);
        VerificationScratch.Prepare(GamePath, reset: true);

        Assert.Throws<IOException>(() => VerificationScratch.ConfirmReportedPath(
            GamePath, _root, path));
    }
}
