using System;
using System.IO;

namespace BuildTool.Game;

/// <summary>
/// Translates a path the game reported into one this host can open.
/// </summary>
/// <remarks>
/// The game runs under Wine and reports Windows paths, so a value it produced cannot be
/// opened directly. Anything that acts on a path the game reported has to translate it
/// first; a check against an untranslated path silently answers "absent" for a file that
/// exists.
/// </remarks>
public static class WinePath
{
    private const string DriveCPrefix = "C:";
    private const string DriveCDirectory = "drive_c";

    /// <summary>
    /// Host path for a path the game reported, or null when it names a drive this mapping
    /// does not cover. Returns the input unchanged when it is already a host path.
    /// </summary>
    public static string? ToHost(string? reportedPath, string winePrefix)
    {
        if (string.IsNullOrWhiteSpace(reportedPath))
            return null;

        var normalized = reportedPath.Replace('\\', '/');

        // Already a host path: the game reports Windows paths, but a caller may pass one
        // that was resolved on this side.
        if (normalized.StartsWith('/'))
            return normalized;

        if (!normalized.StartsWith(DriveCPrefix, StringComparison.OrdinalIgnoreCase))
            return null;

        if (string.IsNullOrWhiteSpace(winePrefix))
            return null;

        var relative = normalized[DriveCPrefix.Length..].TrimStart('/');
        return Path.Combine(winePrefix, DriveCDirectory, relative);
    }

    /// <summary>Whether a path the game reported names a file this host can see.</summary>
    public static bool ExistsOnHost(string? reportedPath, string winePrefix)
    {
        var host = ToHost(reportedPath, winePrefix);
        return host is not null && File.Exists(host);
    }
}
