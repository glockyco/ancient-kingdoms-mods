using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace BuildTool.Game;

public enum GameDiscoveryOutcome
{
    NotFound,
    Found,
    Ambiguous,
}

public sealed record GameDiscoveryResult(
    GameDiscoveryOutcome Outcome,
    string? GamePath,
    IReadOnlyList<string> Candidates);

/// <summary>
/// Finds the one Ancient Kingdoms installation in a CrossOver Steam bottle, by reading the
/// Steam application manifest rather than by matching an installation directory name.
/// </summary>
public static class GameDiscovery
{
    public static string DefaultBottlesRoot => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
        "Library", "Application Support", "CrossOver", "Bottles");

    public static GameDiscoveryResult Discover() => Discover(DefaultBottlesRoot);

    public static GameDiscoveryResult Discover(string bottlesRoot)
    {
        var candidates = new List<string>();

        if (Directory.Exists(bottlesRoot))
        {
            foreach (var bottle in Directory.GetDirectories(bottlesRoot).OrderBy(p => p, StringComparer.Ordinal))
            {
                var steamApps = SteamAppsDirectory(bottle);
                var manifest = SteamAppManifests.Read(
                    Path.Combine(steamApps, SteamAppManifests.FileName(SteamAppManifests.AncientKingdomsAppId)));
                if (manifest is null)
                    continue;

                var install = Path.Combine(steamApps, "common", manifest.InstallDir);
                if (IsUsableInstall(install))
                    candidates.Add(install);
            }
        }

        return candidates.Count switch
        {
            0 => new GameDiscoveryResult(GameDiscoveryOutcome.NotFound, null, candidates),
            1 => new GameDiscoveryResult(GameDiscoveryOutcome.Found, candidates[0], candidates),
            _ => new GameDiscoveryResult(GameDiscoveryOutcome.Ambiguous, null, candidates),
        };
    }

    public static string SteamAppsDirectory(string bottlePath) =>
        Path.Combine(bottlePath, "drive_c", "Program Files (x86)", "Steam", "steamapps");

    /// <summary>
    /// The executable alone does not prove a usable installation. The mod build reads the
    /// generated IL2CPP assemblies under the game path, so a tree without them cannot serve
    /// the commands that follow discovery.
    /// </summary>
    public static bool IsUsableInstall(string gamePath) =>
        File.Exists(Path.Combine(gamePath, "ancientkingdoms.exe"))
        && Directory.Exists(Path.Combine(gamePath, "MelonLoader", "Il2CppAssemblies"));
}
