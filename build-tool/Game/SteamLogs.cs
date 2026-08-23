using System.IO;
using System.Text.RegularExpressions;

namespace BuildTool.Game;

/// <summary>
/// The logs the Steam client writes inside the bottle. They report what the client is doing,
/// which the application manifest does not: the manifest records the installation, and is only
/// rewritten when the installation changes.
/// </summary>
public static class SteamLogs
{
    /// <summary>Records each logon, and so shows when the client is ready for a request.</summary>
    public static string ConnectionLogPath(string winePrefix) =>
        Path.Combine(SteamRoot(winePrefix), "logs", "connection_log.txt");

    /// <summary>Records the lifecycle of every download, verification and install.</summary>
    public static string ContentLogPath(string winePrefix) =>
        Path.Combine(SteamRoot(winePrefix), "logs", "content_log.txt");

    private const string LoggedOnMarker = "RecvMsgClientLogOnResponse";

    public static bool ShowsLogon(string appendedText) =>
        appendedText.Contains(LoggedOnMarker, System.StringComparison.Ordinal);

    /// <summary>
    /// The result Steam recorded when it finished with an application and dropped it from the
    /// schedule, or null while it is still working.
    /// </summary>
    /// <remarks>
    /// Steam writes two dispositions. "removed from schedule" means it is done with the
    /// application. "staying in schedule" means it stopped for now and intends to resume, which
    /// is what a suspended download reports, so only the first can end a wait.
    /// </remarks>
    public static string? FindSchedulerResult(string appendedText, string appId)
    {
        var pattern =
            $@"AppID\s+{Regex.Escape(appId)}\s+scheduler finished\s*:\s*removed from schedule\s*\(result\s+([^,)]+)";

        var matches = Regex.Matches(appendedText, pattern);
        return matches.Count == 0 ? null : matches[^1].Groups[1].Value.Trim();
    }

    /// <summary>Steam records success as this result; anything else names a problem.</summary>
    public const string NoErrorResult = "No Error";

    public static long Length(string path)
    {
        try
        {
            return File.Exists(path) ? new FileInfo(path).Length : 0;
        }
        catch (IOException)
        {
            return 0;
        }
    }

    /// <summary>Reads whatever has been appended past <paramref name="offset"/>.</summary>
    public static string ReadFrom(string path, long offset)
    {
        try
        {
            if (!File.Exists(path))
                return string.Empty;

            using var stream = new FileStream(
                path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            if (stream.Length <= offset)
                return string.Empty;

            stream.Seek(offset, SeekOrigin.Begin);
            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        }
        catch (IOException)
        {
            return string.Empty;
        }
    }

    private static string SteamRoot(string winePrefix) =>
        Path.Combine(winePrefix, "drive_c", "Program Files (x86)", "Steam");
}
