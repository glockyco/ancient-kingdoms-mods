using System.IO;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public class GameDiscoveryTests
{
    [Fact]
    public void Manifest_ReadsInstallDirBuildIdAndStateFlags()
    {
        var root = Directory.CreateTempSubdirectory().FullName;
        var manifest = Path.Combine(root, "appmanifest_2241380.acf");
        File.WriteAllText(manifest, ManifestText(installDir: "Ancient Kingdoms", buildId: "24878482", stateFlags: 4));

        var read = SteamAppManifests.Read(manifest);

        Assert.NotNull(read);
        Assert.Equal("Ancient Kingdoms", read!.InstallDir);
        Assert.Equal("24878482", read.BuildId);
        Assert.Equal(4, read.StateFlags);
        Assert.True(read.IsFullyInstalled);

        Directory.Delete(root, recursive: true);
    }

    [Theory]
    [InlineData(6)]
    [InlineData(1030)]
    public void Manifest_IsNotFullyInstalledWhileWorkIsPending(int stateFlags)
    {
        var root = Directory.CreateTempSubdirectory().FullName;
        var manifest = Path.Combine(root, "appmanifest_2241380.acf");
        File.WriteAllText(manifest, ManifestText("Ancient Kingdoms", "24878482", stateFlags));

        var read = SteamAppManifests.Read(manifest);

        Assert.NotNull(read);
        Assert.False(read!.IsFullyInstalled);

        Directory.Delete(root, recursive: true);
    }

    [Fact]
    public void Manifest_ReturnsNullWhenAbsent() =>
        Assert.Null(SteamAppManifests.Read(Path.Combine(Path.GetTempPath(), "no_such_appmanifest.acf")));

    [Fact]
    public void Discover_ResolvesTheInstallationTheManifestNames()
    {
        var bottles = Directory.CreateTempSubdirectory().FullName;
        var install = CreateBottle(bottles, "Steam", installDir: "Ancient Kingdoms", complete: true);

        var result = GameDiscovery.Discover(bottles);

        Assert.Equal(GameDiscoveryOutcome.Found, result.Outcome);
        Assert.Equal(install, result.GamePath);

        Directory.Delete(bottles, recursive: true);
    }

    [Fact]
    public void Discover_FollowsARenamedInstallationDirectory()
    {
        var bottles = Directory.CreateTempSubdirectory().FullName;
        var install = CreateBottle(bottles, "Steam", installDir: "Ancient Kingdoms Renamed", complete: true);

        var result = GameDiscovery.Discover(bottles);

        Assert.Equal(GameDiscoveryOutcome.Found, result.Outcome);
        Assert.Equal(install, result.GamePath);
        Assert.EndsWith("Ancient Kingdoms Renamed", result.GamePath!);

        Directory.Delete(bottles, recursive: true);
    }

    [Fact]
    public void Discover_FailsAndNamesEveryCandidateWhenTwoBottlesMatch()
    {
        var bottles = Directory.CreateTempSubdirectory().FullName;
        var first = CreateBottle(bottles, "Steam", "Ancient Kingdoms", complete: true);
        var second = CreateBottle(bottles, "Steam Copy", "Ancient Kingdoms", complete: true);

        var result = GameDiscovery.Discover(bottles);

        Assert.Equal(GameDiscoveryOutcome.Ambiguous, result.Outcome);
        Assert.Null(result.GamePath);
        Assert.Equal(2, result.Candidates.Count);
        Assert.Contains(first, result.Candidates);
        Assert.Contains(second, result.Candidates);

        Directory.Delete(bottles, recursive: true);
    }

    [Fact]
    public void Discover_RejectsACandidateHoldingOnlyTheExecutable()
    {
        var bottles = Directory.CreateTempSubdirectory().FullName;
        CreateBottle(bottles, "Steam", "Ancient Kingdoms", complete: false);

        var result = GameDiscovery.Discover(bottles);

        Assert.Equal(GameDiscoveryOutcome.NotFound, result.Outcome);
        Assert.Empty(result.Candidates);

        Directory.Delete(bottles, recursive: true);
    }

    [Fact]
    public void Discover_IgnoresABottleHoldingOnlyAnotherGame()
    {
        var bottles = Directory.CreateTempSubdirectory().FullName;
        var steamApps = GameDiscovery.SteamAppsDirectory(Path.Combine(bottles, "Steam"));
        Directory.CreateDirectory(steamApps);
        File.WriteAllText(
            Path.Combine(steamApps, "appmanifest_2382520.acf"),
            ManifestText("Erenshor", "1234", 4));

        var result = GameDiscovery.Discover(bottles);

        Assert.Equal(GameDiscoveryOutcome.NotFound, result.Outcome);

        Directory.Delete(bottles, recursive: true);
    }

    /// <summary>Builds a bottle holding an Ancient Kingdoms manifest, and returns the install path.</summary>
    private static string CreateBottle(string bottlesRoot, string bottleName, string installDir, bool complete)
    {
        var steamApps = GameDiscovery.SteamAppsDirectory(Path.Combine(bottlesRoot, bottleName));
        Directory.CreateDirectory(steamApps);
        File.WriteAllText(
            Path.Combine(steamApps, SteamAppManifests.FileName(SteamAppManifests.AncientKingdomsAppId)),
            ManifestText(installDir, "24878482", 4));

        var install = Path.Combine(steamApps, "common", installDir);
        Directory.CreateDirectory(install);
        File.WriteAllText(Path.Combine(install, "ancientkingdoms.exe"), "exe");
        if (complete)
            Directory.CreateDirectory(Path.Combine(install, "MelonLoader", "Il2CppAssemblies"));

        return install;
    }

    private static string ManifestText(string installDir, string buildId, int stateFlags) =>
        "\"AppState\"\n{\n"
        + "\t\"appid\"\t\t\"2241380\"\n"
        + "\t\"LauncherPath\"\t\t\"C:\\\\Program Files (x86)\\\\Steam\\\\steam.exe\"\n"
        + $"\t\"StateFlags\"\t\t\"{stateFlags}\"\n"
        + $"\t\"installdir\"\t\t\"{installDir}\"\n"
        + $"\t\"buildid\"\t\t\"{buildId}\"\n"
        + "}\n";
}
