using System.IO;
using BuildTool.Abstractions;

namespace BuildTool.Game;

/// <summary>
/// The Steam client inside a CrossOver bottle, and the requests that drive it.
/// </summary>
/// <remarks>
/// Every path here is derived from the two keys <c>Local.props</c> already carries. The
/// launcher sits beside the configured wine binary and the bottle is named by the prefix, so
/// neither needs its own setting that could disagree with the one it is derived from.
/// </remarks>
public static class SteamBottle
{
    /// <summary>Where Steam installs itself inside the bottle, in the bottle's own path form.</summary>
    public const string SteamExecutableWindowsPath = @"C:\Program Files (x86)\Steam\steam.exe";

    public const string LauncherFileName = "cxstart";

    /// <summary>CrossOver's launcher, a sibling of the configured wine binary.</summary>
    public static string LauncherPath(string winePath) =>
        Path.Combine(Path.GetDirectoryName(winePath) ?? string.Empty, LauncherFileName);

    public static string BottleName(string winePrefix) => Path.GetFileName(winePrefix);

    public static string ManifestPath(string winePrefix, string appId) =>
        Path.Combine(GameDiscovery.SteamAppsDirectory(winePrefix), SteamAppManifests.FileName(appId));

    /// <summary>The client's own log, which records each logon and so shows when it is ready.</summary>
    public static string ConnectionLogPath(string winePrefix) =>
        Path.Combine(winePrefix, "drive_c", "Program Files (x86)", "Steam", "logs", "connection_log.txt");

    /// <summary>Marks a completed logon in the connection log.</summary>
    public const string LoggedOnMarker = "RecvMsgClientLogOnResponse";

    /// <summary>
    /// Starts the client itself and holds it. The request deliberately omits <c>--no-wait</c>:
    /// this invocation is what keeps the client alive while it works.
    /// </summary>
    public static ProcessRequest StartClientRequest(string launcherPath, string bottleName) =>
        new(
            Program: launcherPath,
            Arguments: new[] { "--bottle", bottleName, SteamExecutableWindowsPath });

    /// <summary>
    /// Asks the running client to verify and bring the application current.
    /// </summary>
    /// <remarks>
    /// A validation, not an install. Measured against the live bottle, <c>steam://install</c>
    /// only detects the update and then defers the download by the client's own stagger, so a
    /// command that waited for completion would wait about a day.
    /// </remarks>
    public static ProcessRequest ValidateRequest(string launcherPath, string bottleName, string appId) =>
        new(
            Program: launcherPath,
            Arguments: new[] { "--bottle", bottleName, "--no-wait", $"steam://validate/{appId}" });
}
