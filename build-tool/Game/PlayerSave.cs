using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;

namespace BuildTool.Game;

/// <summary>Content hash of one file belonging to the save.</summary>
public sealed record SaveFileHash(string FileName, string Sha256);

/// <summary>
/// The save's content at one moment, covering the database and any sidecar beside it.
/// Two snapshots compare equal only when every file matches.
/// </summary>
public sealed record SaveSnapshot(IReadOnlyList<SaveFileHash> Files)
{
    public bool Matches(SaveSnapshot other)
    {
        if (Files.Count != other.Files.Count)
            return false;

        foreach (var file in Files)
        {
            var counterpart = other.Files.FirstOrDefault(f => f.FileName == file.FileName);
            if (counterpart is null
                || !string.Equals(counterpart.Sha256, file.Sha256, StringComparison.OrdinalIgnoreCase))
                return false;
        }

        return true;
    }

    /// <summary>Names the files that differ between two snapshots.</summary>
    public IReadOnlyList<string> Differences(SaveSnapshot other)
    {
        var names = Files.Select(f => f.FileName)
            .Union(other.Files.Select(f => f.FileName), StringComparer.Ordinal)
            .OrderBy(n => n, StringComparer.Ordinal);

        var changed = new List<string>();
        foreach (var name in names)
        {
            var mine = Files.FirstOrDefault(f => f.FileName == name)?.Sha256;
            var theirs = other.Files.FirstOrDefault(f => f.FileName == name)?.Sha256;
            if (!string.Equals(mine, theirs, StringComparison.OrdinalIgnoreCase))
                changed.Add(name);
        }

        return changed;
    }

    public override string ToString() =>
        Files.Count == 0
            ? "no save files"
            : string.Join(", ", Files.Select(f => $"{f.FileName}={f.Sha256[..Math.Min(12, f.Sha256.Length)]}"));
}

public sealed record SaveBackupResult(bool Ok, string? Directory, SaveSnapshot? Snapshot, string Detail);

/// <summary>
/// Reads and copies the player's save. A verification run redirects the game away from
/// this file, but the redirect is confirmed rather than trusted, so a verified copy exists
/// before the game starts and the original is compared again afterwards.
/// </summary>
public static class PlayerSave
{
    /// <summary>Unity data directory beside the executable, which holds the save.</summary>
    public const string DataDirectoryName = "ancientkingdoms_Data";

    public const string DatabaseFileName = "game.dat";

    /// <summary>
    /// SQLite writes these beside the database. A copy that omits them can hold less than
    /// the game had, because a write-ahead log can be larger than the database itself.
    /// </summary>
    public static readonly string[] SidecarSuffixes = { "-wal", "-shm" };

    public static string DirectoryFor(string gamePath) =>
        Path.Combine(gamePath, DataDirectoryName);

    public static string DatabasePath(string gamePath) =>
        Path.Combine(DirectoryFor(gamePath), DatabaseFileName);

    /// <summary>Every save file that exists, in a stable order.</summary>
    public static IReadOnlyList<string> ExistingFiles(string gamePath)
    {
        var found = new List<string>();
        var database = DatabasePath(gamePath);
        if (File.Exists(database))
            found.Add(database);

        foreach (var suffix in SidecarSuffixes)
        {
            var sidecar = database + suffix;
            if (File.Exists(sidecar))
                found.Add(sidecar);
        }

        return found;
    }

    /// <summary>Hashes every save file present, or null when the database is absent.</summary>
    public static SaveSnapshot? Read(string gamePath)
    {
        var files = ExistingFiles(gamePath);
        if (files.Count == 0)
            return null;

        return new SaveSnapshot(files
            .Select(path => new SaveFileHash(Path.GetFileName(path), HashFile(path)))
            .ToList());
    }

    /// <summary>
    /// Copies the save into a timestamped directory and confirms each copy against its
    /// source. A copy that cannot be confirmed is worse than none, because it would be
    /// trusted later, so this reports failure rather than leaving one behind.
    /// </summary>
    public static SaveBackupResult Create(string gamePath, string backupRoot, DateTimeOffset now)
    {
        var files = ExistingFiles(gamePath);
        if (files.Count == 0)
            return new SaveBackupResult(false, null, null,
                $"No save database at {DatabasePath(gamePath)}, so nothing can be backed up.");

        var stamp = now.UtcDateTime.ToString("yyyyMMdd-HHmmss");
        var directory = Path.Combine(backupRoot, $"game-dat-backup-{stamp}");
        System.IO.Directory.CreateDirectory(directory);

        var hashes = new List<SaveFileHash>();
        foreach (var source in files)
        {
            var name = Path.GetFileName(source);
            var destination = Path.Combine(directory, name);
            File.Copy(source, destination, overwrite: true);

            var sourceHash = HashFile(source);
            var copyHash = HashFile(destination);
            if (!string.Equals(sourceHash, copyHash, StringComparison.OrdinalIgnoreCase))
                return new SaveBackupResult(false, directory, null,
                    $"Backup of {name} does not match its source, so it cannot be relied on. "
                    + $"Source {sourceHash[..12]}, copy {copyHash[..12]}.");

            hashes.Add(new SaveFileHash(name, sourceHash));
        }

        var snapshot = new SaveSnapshot(hashes);
        return new SaveBackupResult(true, directory, snapshot,
            $"Backed up {hashes.Count} file(s) to {directory} and confirmed each against its source.");
    }

    private static string HashFile(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }
}
