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
    private const string DriveCDirectory = "drive_c";
    private const string DriveDirectory = "dosdevices";

    /// <summary>
    /// Host path for a path the game reported, or null when it names a drive the prefix does
    /// not map. Returns the input unchanged when it is already a host path.
    /// </summary>
    /// <remarks>
    /// Wine maps each drive letter through a link in the prefix's <c>dosdevices</c> directory,
    /// such as <c>z:</c> to the host root. A prefix without that link still keeps drive C in
    /// <c>drive_c</c>.
    /// </remarks>
    public static string? ToHost(string? reportedPath, string winePrefix)
    {
        if (string.IsNullOrWhiteSpace(reportedPath))
            return null;

        var normalized = reportedPath.Replace('\\', '/');

        // Already a host path: the game reports Windows paths, but a caller may pass one
        // that was resolved on this side.
        if (normalized.StartsWith('/'))
            return normalized;

        if (normalized.Length < 2 || normalized[1] != ':' || !char.IsAsciiLetter(normalized[0]))
            return null;

        if (string.IsNullOrWhiteSpace(winePrefix))
            return null;

        var drive = char.ToLowerInvariant(normalized[0]);
        var relative = normalized[2..].TrimStart('/');
        var root = DriveRoot(winePrefix, drive);
        return root is null ? null : Path.Combine(root, relative);
    }

    private static string? DriveRoot(string winePrefix, char drive)
    {
        var devices = Path.Combine(winePrefix, DriveDirectory);
        var target = new DirectoryInfo(Path.Combine(devices, drive + ":")).LinkTarget;
        if (target is not null)
            return Path.GetFullPath(target, devices);

        return drive == 'c' ? Path.Combine(winePrefix, DriveCDirectory) : null;
    }

    /// <summary>Whether a path the game reported names a file this host can see.</summary>
    public static bool ExistsOnHost(string? reportedPath, string winePrefix)
    {
        var host = ToHost(reportedPath, winePrefix);
        return host is not null && File.Exists(host);
    }
}
