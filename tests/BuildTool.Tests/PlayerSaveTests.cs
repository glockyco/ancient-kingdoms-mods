using System;
using System.IO;
using System.Linq;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

/// <summary>
/// A verification run redirects the game away from the player's save, but the redirect is
/// confirmed rather than trusted. These tests pin the copy that exists before the game
/// starts and the comparison that runs afterwards.
/// </summary>
public sealed class PlayerSaveTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("ak-save").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private string GamePath => Path.Combine(_root, "game");
    private string BackupRoot => Path.Combine(_root, "backups");
    private static readonly DateTimeOffset When = new(2026, 8, 26, 17, 4, 5, TimeSpan.Zero);

    private void WriteSave(string database, string? wal = null, string? shm = null)
    {
        Directory.CreateDirectory(PlayerSave.DirectoryFor(GamePath));
        var path = PlayerSave.DatabasePath(GamePath);
        File.WriteAllText(path, database);
        if (wal is not null) File.WriteAllText(path + "-wal", wal);
        if (shm is not null) File.WriteAllText(path + "-shm", shm);
    }

    // --- reading ---

    [Fact]
    public void ReadsTheDatabaseAndEverySidecar()
    {
        WriteSave("db", wal: "write ahead", shm: "shared");

        var snapshot = PlayerSave.Read(GamePath)!;

        Assert.Equal(
            new[] { "game.dat", "game.dat-shm", "game.dat-wal" },
            snapshot.Files.Select(f => f.FileName).OrderBy(n => n, StringComparer.Ordinal));
    }

    [Fact]
    public void ReadsTheDatabaseAloneWhenNoSidecarExists()
    {
        WriteSave("db");

        Assert.Equal("game.dat", Assert.Single(PlayerSave.Read(GamePath)!.Files).FileName);
    }

    [Fact]
    public void AnAbsentSaveReadsAsNothing()
        => Assert.Null(PlayerSave.Read(GamePath));

    // --- comparing ---

    [Fact]
    public void AnUnchangedSaveMatches()
    {
        WriteSave("db", wal: "w");
        var before = PlayerSave.Read(GamePath)!;

        var after = PlayerSave.Read(GamePath)!;

        Assert.True(before.Matches(after));
        Assert.Empty(before.Differences(after));
    }

    [Fact]
    public void AChangedDatabaseDoesNotMatchAndIsNamed()
    {
        WriteSave("db");
        var before = PlayerSave.Read(GamePath)!;
        WriteSave("db changed");

        var after = PlayerSave.Read(GamePath)!;

        Assert.False(before.Matches(after));
        Assert.Equal("game.dat", Assert.Single(before.Differences(after)));
    }

    [Fact]
    public void ASidecarAppearingIsADifference()
    {
        // A run that leaves a write-ahead log behind has changed the save's content.
        WriteSave("db");
        var before = PlayerSave.Read(GamePath)!;
        WriteSave("db", wal: "left behind");

        var after = PlayerSave.Read(GamePath)!;

        Assert.False(before.Matches(after));
        Assert.Equal("game.dat-wal", Assert.Single(before.Differences(after)));
    }

    // --- backing up ---

    [Fact]
    public void BacksUpEveryFileAndConfirmsEachAgainstItsSource()
    {
        WriteSave("db", wal: "w", shm: "s");

        var result = PlayerSave.Create(GamePath, BackupRoot, When);

        Assert.True(result.Ok, result.Detail);
        Assert.Equal(3, result.Snapshot!.Files.Count);
        foreach (var name in new[] { "game.dat", "game.dat-wal", "game.dat-shm" })
            Assert.True(File.Exists(Path.Combine(result.Directory!, name)), name);
    }

    [Fact]
    public void TheBackupDirectoryCarriesTheTimestamp()
    {
        WriteSave("db");

        var result = PlayerSave.Create(GamePath, BackupRoot, When);

        Assert.Equal("game-dat-backup-20260826-170405", Path.GetFileName(result.Directory));
    }

    [Fact]
    public void TheBackupContentEqualsTheSource()
    {
        WriteSave("original bytes", wal: "log bytes");

        var result = PlayerSave.Create(GamePath, BackupRoot, When);

        Assert.Equal("original bytes",
            File.ReadAllText(Path.Combine(result.Directory!, "game.dat")));
        Assert.Equal("log bytes",
            File.ReadAllText(Path.Combine(result.Directory!, "game.dat-wal")));
    }

    [Fact]
    public void TheRecordedSnapshotMatchesTheLiveSave()
    {
        WriteSave("db", wal: "w");

        var result = PlayerSave.Create(GamePath, BackupRoot, When);

        // The snapshot a run compares against afterwards must describe what was copied.
        Assert.True(result.Snapshot!.Matches(PlayerSave.Read(GamePath)!));
    }

    [Fact]
    public void AnAbsentSaveIsReportedRatherThanBackedUpEmpty()
    {
        var result = PlayerSave.Create(GamePath, BackupRoot, When);

        Assert.False(result.Ok);
        Assert.Null(result.Snapshot);
        Assert.Contains("nothing can be backed up", result.Detail);
    }

    [Fact]
    public void BackingUpTwiceAtDifferentTimesKeepsBothCopies()
    {
        WriteSave("db");

        var first = PlayerSave.Create(GamePath, BackupRoot, When);
        var second = PlayerSave.Create(GamePath, BackupRoot, When.AddSeconds(1));

        Assert.NotEqual(first.Directory, second.Directory);
        Assert.True(Directory.Exists(first.Directory));
        Assert.True(Directory.Exists(second.Directory));
    }
}
