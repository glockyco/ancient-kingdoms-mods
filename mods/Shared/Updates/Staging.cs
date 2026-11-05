// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>What <see cref="Staging.Settle"/> left in the Mods folder.</summary>
internal sealed class Settled
{
    public Settled(ModVersion? installed, ModVersion? replaced, bool updated, IReadOnlyList<string> removed, IReadOnlyList<string> leftovers, string discarded)
    {
        Installed = installed;
        Replaced = replaced;
        Updated = updated;
        Removed = removed;
        Leftovers = leftovers;
        Discarded = discarded;
    }

    public static Settled Nothing { get; } = new(null, null, false, Array.Empty<string>(), Array.Empty<string>(), null);

    /// <summary>The version under the usual name, or null without a readable copy.</summary>
    public ModVersion? Installed { get; }

    /// <summary>The newest version the Mods folder held before a download replaced it.</summary>
    public ModVersion? Replaced { get; }

    /// <summary>Whether a download was put in place.</summary>
    public bool Updated { get; }

    /// <summary>Copies under other names that were removed.</summary>
    public IReadOnlyList<string> Removed { get; }

    /// <summary>Copies under other names that could not be removed.</summary>
    public IReadOnlyList<string> Leftovers { get; }

    /// <summary>Why a waiting download was thrown away, or null.</summary>
    public string Discarded { get; }
}

/// <summary>
/// A verified download waits in the updates folder until the updater settles the Mods folder before
/// MelonLoader loads mods, because a loaded DLL can't be replaced.
/// </summary>
internal static class Staging
{
    public static void Stage(UpdateFiles files, byte[] file, string sha256)
    {
        UpdateFiles.WriteAtomically(files.Staged, file);
        UpdateFiles.WriteAtomically(files.StagedHash, Encoding.ASCII.GetBytes(sha256.ToLowerInvariant()));
    }

    public static bool HasStaged(UpdateFiles files) => File.Exists(files.Staged);

    /// <summary>
    /// Leaves one Pocket Compendium in the Mods folder, under its usual name, with the newest version
    /// among the installed copies and an intact waiting download. MelonLoader loads only one of several
    /// copies, the first by name, which can be an older one, so every other copy goes. A Mods folder
    /// without a copy means the player removed the mod, and nothing is put back.
    /// </summary>
    /// <param name="versionOf">Reads the version a DLL names, or null when it names none or can't be read.</param>
    /// <exception cref="UpdateException">The newest version could not be put under the usual name.</exception>
    public static Settled Settle(UpdateFiles files, Func<string, ModVersion?> versionOf)
    {
        var copies = files.Copies();
        string discarded = null;
        ModVersion? staged = HasStaged(files) ? Verified(files, versionOf, out discarded) : null;
        if (copies.Count == 0)
        {
            Discard(files);
            return Settled.Nothing;
        }

        // The newest copy, and among equals the one under the usual name. A copy without a readable
        // version counts as the oldest, so a broken file is replaced rather than kept.
        string newest = null;
        ModVersion? newestVersion = null;
        foreach (var copy in copies)
        {
            var version = versionOf(copy);
            bool newer = newest == null || Compare(version, newestVersion) > 0;
            bool usualAmongEquals = Compare(version, newestVersion) == 0 && IsUsual(files, copy);
            if (!newer && !usualAmongEquals) continue;
            newest = copy;
            newestVersion = version;
        }

        bool updated = staged != null && Compare(staged, newestVersion) > 0;
        try
        {
            if (updated) Replace(files.Installed, files.Staged);
            else if (!IsUsual(files, newest)) Replace(files.Installed, newest);
            Discard(files);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            throw new UpdateException("the new version could not be put in place: " + e.Message, e);
        }

        var removed = new List<string>();
        var leftovers = new List<string>();
        foreach (var copy in copies)
        {
            if (IsUsual(files, copy)) continue;
            try
            {
                File.Delete(copy);
                removed.Add(Path.GetFileName(copy));
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException) { leftovers.Add(Path.GetFileName(copy)); }
        }

        return new Settled(updated ? staged : newestVersion, newestVersion, updated, removed, leftovers, discarded);
    }

    public static void Discard(UpdateFiles files)
    {
        // File.Delete passes over a missing file but not a missing folder.
        if (File.Exists(files.Staged)) File.Delete(files.Staged);
        if (File.Exists(files.StagedHash)) File.Delete(files.StagedHash);
    }

    // The waiting download's version when it still matches the hash the signed list named. A damaged or
    // unreadable download is thrown away, and the next check downloads it again.
    private static ModVersion? Verified(UpdateFiles files, Func<string, ModVersion?> versionOf, out string discarded)
    {
        discarded = null;
        try
        {
            string expected = File.Exists(files.StagedHash) ? File.ReadAllText(files.StagedHash).Trim() : "";
            if (string.Equals(ListSignature.Sha256(File.ReadAllBytes(files.Staged)), expected, StringComparison.OrdinalIgnoreCase))
            {
                var version = versionOf(files.Staged);
                if (version != null) return version;
                discarded = "the downloaded file names no version";
            }
            else
            {
                discarded = "the downloaded file changed while it waited";
            }
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            discarded = "the downloaded file could not be read: " + e.Message;
        }

        try { Discard(files); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { }
        return null;
    }

    // Beside the target first, so an interrupted copy never leaves a broken mod.
    private static void Replace(string target, string source)
    {
        string part = target + ".part";
        File.Copy(source, part, overwrite: true);
        File.Move(part, target, overwrite: true);
    }

    private static bool IsUsual(UpdateFiles files, string path) =>
        string.Equals(Path.GetFullPath(path), Path.GetFullPath(files.Installed), StringComparison.OrdinalIgnoreCase);

    // A missing version sorts before every version.
    private static int Compare(ModVersion? a, ModVersion? b) =>
        a == null ? (b == null ? 0 : -1) : b == null ? 1 : a.Value.CompareTo(b.Value);
}
