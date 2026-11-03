// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.IO;
using System.Text;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>
/// A verified download waits in the updates folder until the updater moves it over the installed DLL,
/// before MelonLoader loads mods, because a loaded DLL can't be replaced.
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
    /// Moves the staged file over the installed one when it is intact and names a higher version, and
    /// returns the two versions. A damaged, older or orphaned staged file is deleted and nothing moves.
    /// </summary>
    /// <param name="versionOf">Reads the version a DLL names, or null when it names none.</param>
    /// <exception cref="UpdateException">The staged file is damaged, or the move failed.</exception>
    public static (ModVersion From, ModVersion To)? Apply(UpdateFiles files, Func<string, ModVersion?> versionOf)
    {
        if (!File.Exists(files.Staged)) return null;
        try
        {
            string expected = File.Exists(files.StagedHash) ? File.ReadAllText(files.StagedHash).Trim() : "";
            if (!string.Equals(ListSignature.Sha256(File.ReadAllBytes(files.Staged)), expected, StringComparison.OrdinalIgnoreCase))
            {
                Discard(files);
                throw new UpdateException("the downloaded file changed while it waited");
            }

            // Without an installed mod the player removed it, and the updater must not put it back.
            var from = File.Exists(files.Installed) ? versionOf(files.Installed) : null;
            var to = versionOf(files.Staged);
            if (from == null || to == null || to.Value <= from.Value)
            {
                Discard(files);
                return null;
            }

            File.Copy(files.Staged, files.Installed, overwrite: true);
            Discard(files);
            return (from.Value, to.Value);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            throw new UpdateException("the new version could not be put in place: " + e.Message, e);
        }
    }

    public static void Discard(UpdateFiles files)
    {
        File.Delete(files.Staged);
        File.Delete(files.StagedHash);
    }
}
