using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace BuildTool.Game;

/// <summary>Owns the scratch database used by a verification run.</summary>
public static class VerificationScratch
{
    public const string DirectoryName = "verification-scratch";

    /// <summary>Scratch directory beside the installation's live Unity data directory.</summary>
    public static string DirectoryFor(string gamePath)
    {
        RequireHostPath(gamePath, "game installation");
        return Path.Combine(gamePath, PlayerSave.DataDirectoryName, DirectoryName);
    }

    /// <summary>Scratch database path used by a verification run.</summary>
    public static string DatabasePath(string gamePath) =>
        Path.Combine(DirectoryFor(gamePath), PlayerSave.DatabaseFileName);

    /// <summary>
    /// Validates the installation and the complete existing scratch tree without changing it.
    /// Missing data and scratch directories are safe and can be created by <see cref="Prepare"/>.
    /// </summary>
    public static string Validate(string gamePath)
    {
        RequireHostPath(gamePath, "game installation");

        var game = FullPath(gamePath, "game installation");
        var gameEntry = Inspect(game);
        if (gameEntry.Kind == EntryKind.Missing)
            throw Unsafe($"Game installation does not exist: {game}");
        if (gameEntry.Kind != EntryKind.Directory)
            throw Unsafe($"Game installation is not a directory: {game}");
        if (gameEntry.IsLink)
            throw Unsafe($"Game installation is a symbolic link: {game}");

        var canonicalGame = Canonicalize(game, "game installation").Path;
        var data = Path.Combine(game, PlayerSave.DataDirectoryName);
        var dataEntry = Inspect(data);
        if (dataEntry.Kind is EntryKind.File or EntryKind.Other)
            throw Unsafe($"Game data path is not a directory: {data}");
        if (dataEntry.IsLink)
            throw Unsafe($"Game data directory is a symbolic link: {data}");

        var canonicalData = dataEntry.Kind == EntryKind.Missing
            ? Path.Combine(canonicalGame, PlayerSave.DataDirectoryName)
            : Canonicalize(data, "game data directory").Path;
        EnsureChild(canonicalData, canonicalGame, "game data directory");

        var scratch = Path.Combine(data, DirectoryName);
        var scratchEntry = Inspect(scratch);
        if (scratchEntry.Kind is EntryKind.File or EntryKind.Other)
            throw Unsafe($"Verification scratch path is not a directory: {scratch}");
        if (scratchEntry.IsLink)
            throw Unsafe($"Verification scratch directory is a symbolic link: {scratch}");

        var canonicalScratch = scratchEntry.Kind == EntryKind.Missing
            ? Path.Combine(canonicalData, DirectoryName)
            : Canonicalize(scratch, "verification scratch directory").Path;
        EnsureChild(canonicalScratch, canonicalData, "verification scratch directory");

        if (scratchEntry.Kind == EntryKind.Directory)
            ValidateTree(scratch);

        return canonicalScratch;
    }

    /// <summary>
    /// Validates the owned paths, optionally removes only verified scratch, and creates the
    /// parent required by SQLite. The returned path is canonical even when the tree was new.
    /// </summary>
    public static string Prepare(string gamePath, bool reset)
    {
        var canonicalScratch = Validate(gamePath);
        var scratch = DirectoryFor(gamePath);
        var data = PlayerSave.DirectoryFor(gamePath);

        if (reset && Directory.Exists(scratch))
        {
            // Validate completed before this call. Delete entries one by one so a symlink
            // discovered during a later operation cannot make recursive deletion follow it.
            DeleteVerifiedTree(scratch);
        }

        if (!Directory.Exists(data))
            Directory.CreateDirectory(data);
        if (!Directory.Exists(scratch))
            Directory.CreateDirectory(scratch);

        // Confirm the creation did not produce a reparse point and return the path SQLite may open.
        var after = Validate(gamePath);
        if (!string.Equals(after, canonicalScratch, StringComparison.Ordinal))
            throw Unsafe($"Verification scratch path changed while preparing: {after}");
        return Path.Combine(after, PlayerSave.DatabaseFileName);
    }

    /// <summary>
    /// Translates a runtime-reported path and requires the exact canonical owned database path.
    /// </summary>
    public static string ConfirmReportedPath(
        string gamePath,
        string winePrefix,
        string reportedPath)
    {
        var canonicalScratch = Validate(gamePath);
        var expected = Path.Combine(canonicalScratch, PlayerSave.DatabaseFileName);
        var canonicalGame = Canonicalize(
            FullPath(gamePath, "game installation"), "game installation").Path;
        RequireHostPath(winePrefix, "Wine prefix");

        if (string.IsNullOrWhiteSpace(reportedPath))
            throw Unsafe("The runtime reported no database path.");

        var normalized = reportedPath.Replace('\\', '/');
        if (IsWineCPath(normalized))
        {
            RejectTraversal(normalized, "reported database path");
        }
        else if (reportedPath.IndexOf('\\') >= 0)
        {
            throw Unsafe($"The runtime reported an unsupported database path: {reportedPath}");
        }
        else if (!normalized.StartsWith("/", StringComparison.Ordinal))
        {
            throw Unsafe($"The runtime reported an unsupported database path: {reportedPath}");
        }
        else
        {
            RequireHostPath(normalized, "reported database path");
        }

        var translated = WinePath.ToHost(reportedPath, winePrefix);
        if (translated is null)
            throw Unsafe($"The runtime database path cannot be translated: {reportedPath}");

        RequireHostPath(translated, "translated database path");
        var actualPath = Canonicalize(translated, "reported database path");
        if (actualPath.Links.Any(target => string.Equals(target, canonicalGame, StringComparison.Ordinal)
            || target.StartsWith(canonicalGame + Path.DirectorySeparatorChar, StringComparison.Ordinal)))
            throw Unsafe($"The runtime database path uses a symbolic link: {reportedPath}");
        var actual = actualPath.Path;
        if (!string.Equals(actual, expected, StringComparison.Ordinal))
            throw Unsafe(
                $"The runtime database path is not the owned path. Expected {expected}; reported {actual}.");

        return actual;
    }

    private static void DeleteVerifiedTree(string scratch)
    {
        // Recheck every entry immediately before deletion. This does not replace Validate:
        // Validate is the all-or-nothing gate, while this pass avoids recursive deletion.
        ValidateTree(scratch);
        foreach (var entry in Directory.EnumerateFileSystemEntries(scratch).ToArray())
        {
            var inspected = Inspect(entry);
            if (inspected.IsLink)
                throw Unsafe($"Verification scratch contains a symbolic link: {entry}");
            if (inspected.Kind == EntryKind.Directory)
            {
                DeleteVerifiedTree(entry);
                Directory.Delete(entry);
            }
            else if (inspected.Kind == EntryKind.File)
            {
                File.Delete(entry);
            }
            else
            {
                throw Unsafe($"Verification scratch contains an unsupported entry: {entry}");
            }
        }
    }

    private static void ValidateTree(string root)
    {
        foreach (var entry in Directory.EnumerateFileSystemEntries(root))
        {
            var inspected = Inspect(entry);
            if (inspected.IsLink)
                throw Unsafe($"Verification scratch contains a symbolic link: {entry}");
            if (inspected.Kind == EntryKind.Directory)
                ValidateTree(entry);
            else if (inspected.Kind != EntryKind.File)
                throw Unsafe($"Verification scratch contains an unsupported entry: {entry}");
        }
    }

    private static void EnsureChild(string child, string parent, string description)
    {
        if (string.Equals(child, parent, StringComparison.Ordinal)
            || !child.StartsWith(parent + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw Unsafe($"{description} escapes its owned parent: {child}");
    }

    private static CanonicalPath Canonicalize(string path, string description)
    {
        var full = FullPath(path, description);
        var root = Path.GetPathRoot(full);
        if (string.IsNullOrEmpty(root))
            throw Unsafe($"{description} is not rooted: {path}");

        var current = root;
        var remainder = full[root.Length..];
        var parts = remainder.Split(
            new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar },
            StringSplitOptions.RemoveEmptyEntries);
        var links = new List<string>();
        for (var index = 0; index < parts.Length; index++)
        {
            var next = Path.Combine(current, parts[index]);
            var entry = Inspect(next);
            if (entry.Kind == EntryKind.Missing)
            {
                current = Path.Combine(current, string.Join(Path.DirectorySeparatorChar, parts[index..]));
                break;
            }

            if (entry.IsLink)
            {
                var target = ResolveLink(next, description);
                links.Add(target);
                if (index < parts.Length - 1 && Inspect(target).Kind != EntryKind.Directory)
                    throw Unsafe($"{description} has a file in its parent path: {next}");
                current = target;
            }
            else
            {
                if (entry.Kind != EntryKind.Directory && index < parts.Length - 1)
                    throw Unsafe($"{description} has a file in its parent path: {next}");
                current = next;
            }
        }

        return new CanonicalPath(Path.GetFullPath(current), links);
    }

    private static string ResolveLink(string path, string description)
    {
        FileSystemInfo info = new DirectoryInfo(path);
        string? linkTarget = info.LinkTarget;
        if (linkTarget is null)
        {
            info = new FileInfo(path);
            linkTarget = info.LinkTarget;
        }

        if (linkTarget is null)
            throw Unsafe($"{description} contains an unresolved symbolic link: {path}");

        var target = info.ResolveLinkTarget(returnFinalTarget: true);
        if (target is null)
            throw new IOException($"Broken symbolic link in {description}: {path}");
        try
        {
            _ = File.GetAttributes(target.FullName);
        }
        catch (FileNotFoundException)
        {
            throw new IOException($"Broken symbolic link in {description}: {path}");
        }
        catch (DirectoryNotFoundException)
        {
            throw new IOException($"Broken symbolic link in {description}: {path}");
        }
        return Path.GetFullPath(target.FullName);
    }

    private static Entry Inspect(string path)
    {
        var directory = new DirectoryInfo(path);
        if (directory.LinkTarget is not null)
            return new Entry(EntryKind.Directory, true);

        var file = new FileInfo(path);
        if (file.LinkTarget is not null)
            return new Entry(EntryKind.File, true);

        try
        {
            var attributes = File.GetAttributes(path);
            return attributes.HasFlag(FileAttributes.Directory)
                ? new Entry(EntryKind.Directory, false)
                : new Entry(EntryKind.File, false);
        }
        catch (FileNotFoundException)
        {
            return new Entry(EntryKind.Missing, false);
        }
        catch (DirectoryNotFoundException)
        {
            return new Entry(EntryKind.Missing, false);
        }
    }

    private static string FullPath(string path, string description)
    {
        try
        {
            return Path.GetFullPath(path);
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException)
        {
            throw Unsafe($"Invalid {description} path: {path}", ex);
        }
    }

    private static void RequireHostPath(string path, string description)
    {
        if (string.IsNullOrWhiteSpace(path) || path.IndexOf('\0') >= 0)
            throw Unsafe($"Invalid {description} path: {path}");
        if (path.IndexOf('\\') >= 0)
            throw Unsafe($"Unsupported Windows path for {description}: {path}");
        if (!Path.IsPathRooted(path))
            throw Unsafe($"{description} must be absolute: {path}");
        RejectTraversal(path, description);
    }

    private static void RejectTraversal(string path, string description)
    {
        var parts = path.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Any(part => part == ".."))
            throw Unsafe($"{description} contains traversal: {path}");
    }

    private static bool IsWineCPath(string path) =>
        path.Length >= 3
        && path[1] == ':'
        && path[0] is 'c' or 'C'
        && path[2] == '/';

    private static IOException Unsafe(string message, Exception? inner = null) =>
        new IOException(message, inner);

    private readonly record struct CanonicalPath(string Path, IReadOnlyList<string> Links);
    private readonly record struct Entry(EntryKind Kind, bool IsLink);
    private enum EntryKind
    {
        Missing,
        File,
        Directory,
        Other,
    }
}
