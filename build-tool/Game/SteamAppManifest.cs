using System.Globalization;
using System.IO;
using System.Text;

namespace BuildTool.Game;

/// <summary>
/// The fields this repository reads from a Steam application manifest
/// (<c>appmanifest_&lt;app id&gt;.acf</c>), which is the record Steam maintains for one
/// installed application.
/// </summary>
public sealed record SteamAppManifest(string InstallDir, string BuildId, int StateFlags)
{
    /// <summary>
    /// Installed with nothing pending. Steam reports 6 when an update is required and 1030
    /// while one runs, so an update has settled only when the flags read exactly this.
    /// </summary>
    public const int StateFullyInstalled = 4;

    public bool IsFullyInstalled => StateFlags == StateFullyInstalled;
}

public static class SteamAppManifests
{
    /// <summary>
    /// Ancient Kingdoms on Steam. The bottle holds several applications, so the application id
    /// is what identifies this one; the installation directory name is not reliable.
    /// </summary>
    public const string AncientKingdomsAppId = "2241380";

    public static string FileName(string appId) => $"appmanifest_{appId}.acf";

    /// <summary>Reads the manifest, or returns null when it is absent or lacks a needed field.</summary>
    public static SteamAppManifest? Read(string manifestPath)
    {
        if (!File.Exists(manifestPath))
            return null;

        string? installDir = null;
        string? buildId = null;
        int? stateFlags = null;

        foreach (var line in File.ReadLines(manifestPath))
        {
            if (!TryReadPair(line, out var key, out var value))
                continue;

            switch (key)
            {
                case "installdir":
                    installDir ??= value;
                    break;
                case "buildid":
                    buildId ??= value;
                    break;
                case "StateFlags":
                    if (stateFlags is null
                        && int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
                    {
                        stateFlags = parsed;
                    }

                    break;
            }
        }

        if (installDir is null || buildId is null || stateFlags is null)
            return null;

        return new SteamAppManifest(installDir, buildId, stateFlags.Value);
    }

    /// <summary>Reads a <c>"key"  "value"</c> pair from one manifest line.</summary>
    private static bool TryReadPair(string line, out string key, out string value)
    {
        value = string.Empty;
        return TryReadQuoted(line, 0, out key, out var afterKey)
            && TryReadQuoted(line, afterKey, out value, out _);
    }

    private static bool TryReadQuoted(string line, int from, out string text, out int next)
    {
        text = string.Empty;
        next = from;

        var open = line.IndexOf('"', from);
        if (open < 0)
            return false;

        var sb = new StringBuilder();
        for (var i = open + 1; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '\\' && i + 1 < line.Length)
            {
                sb.Append(line[++i]);
                continue;
            }

            if (c == '"')
            {
                text = sb.ToString();
                next = i + 1;
                return true;
            }

            sb.Append(c);
        }

        return false;
    }
}
