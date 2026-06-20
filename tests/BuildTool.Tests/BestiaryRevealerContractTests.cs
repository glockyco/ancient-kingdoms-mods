using System;
using System.IO;
using System.Linq;
using Xunit;

namespace BuildTool.Tests;

public class BestiaryRevealerContractTests
{
    [Fact]
    public void BestiaryRevealerUsesRenderOnlyDetailPatch()
    {
        var repoRoot = FindRepoRoot();
        var modRoot = Path.Combine(repoRoot, "mods", "BestiaryRevealer");
        Assert.True(Directory.Exists(modRoot), "mods/BestiaryRevealer must exist.");

        var projectFile = Path.Combine(modRoot, "BestiaryRevealer.csproj");
        Assert.True(File.Exists(projectFile), "BestiaryRevealer.csproj must exist.");

        var projectText = File.ReadAllText(projectFile);
        Assert.Contains("<AssemblyName>BestiaryRevealer</AssemblyName>", projectText);
        Assert.Contains("<RootNamespace>BestiaryRevealer</RootNamespace>", projectText);
        Assert.Contains("0Harmony", projectText);
        Assert.Contains("UnityEngine.UI", projectText);

        var sourceFiles = Directory.GetFiles(modRoot, "*.cs", SearchOption.AllDirectories);
        Assert.NotEmpty(sourceFiles);
        var source = string.Join("\n", sourceFiles.Select(File.ReadAllText));

        Assert.Contains("Bestiary Revealer", source);
        Assert.Contains("UIBestiaryDetail", source);
        Assert.Contains("\"Update\"", source);
        Assert.Contains("HarmonyPostfix", source);
        Assert.Contains("UIShowToolTip", source);
        Assert.Contains("Color.white", source);
        Assert.DoesNotContain("HarmonyPatch(typeof(UIJournal", source, StringComparison.Ordinal);

        string[] forbiddenPersistenceOrDiscoveryCalls =
        [
            "TargetRpcUpdateKillsBestiary",
            "TargetRpcUpdateLootItemDiscovered",
            "updateBossEliteKills",
            "updateHuntKills",
            "updateLootBosses",
            "bossesKilled.Add",
            "huntKilled.Add",
            "listBossesLootDiscovered"
        ];

        foreach (var forbidden in forbiddenPersistenceOrDiscoveryCalls)
        {
            Assert.DoesNotContain(forbidden, source, StringComparison.Ordinal);
        }
    }

    private static string FindRepoRoot()
    {
        var dir = AppContext.BaseDirectory;
        while (dir is not null && !File.Exists(Path.Combine(dir, "AncientKingdomsMods.sln")))
        {
            dir = Directory.GetParent(dir)?.FullName;
        }

        if (dir is null)
            throw new InvalidOperationException("Could not find repository root.");

        return dir;
    }
}
