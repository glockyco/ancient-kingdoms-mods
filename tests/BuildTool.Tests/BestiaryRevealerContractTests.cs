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
        Assert.Contains("BestiaryGridRenderer.ApplyFallbackIcons", source);
        Assert.Contains("HarmonyPatch(typeof(UIJournal), \"Update\")", source);

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

    [Fact]
    public void BestiaryRevealerCanAutoAddLoadedMissingBossesWhenEnabled()
    {
        var repoRoot = FindRepoRoot();
        var modRoot = Path.Combine(repoRoot, "mods", "BestiaryRevealer");
        var sourceFiles = Directory.GetFiles(modRoot, "*.cs", SearchOption.AllDirectories);
        var source = string.Join("\n", sourceFiles.Select(File.ReadAllText));
        var augmenterSource = File.ReadAllText(Path.Combine(modRoot, "BestiaryListAugmenter.cs"));

        Assert.Contains("AutoAddMissingBestiaryEntries", source);
        Assert.Contains("false,", source);
        Assert.Contains("HarmonyPatch(typeof(UIJournal), \"OpenBestiary\")", source);
        Assert.Contains("HarmonyPrefix", source);
        Assert.Contains("Resources.FindObjectsOfTypeAll", source);
        Assert.Contains("Il2CppType.Of<Monster>()", source);
        Assert.Contains("monster.isBoss || monster.isElite || monster.isFabled", source);
        Assert.Contains("!monster.isForgotttenAltarEvent", source);
        Assert.DoesNotContain("monster.portraitBoss != null", augmenterSource, StringComparison.Ordinal);
        Assert.DoesNotContain("monster.imageBossBestiary != null", augmenterSource, StringComparison.Ordinal);
        Assert.Contains("_hasScannedWorldScene", source);
        Assert.Contains("if (_hasScannedWorldScene)", source);
        Assert.Contains("if (objects.Length == 0)", source);
        Assert.Contains("_loggedNoLoadedMonsters", source);
        Assert.Contains("monster.imageBossBestiary ?? BlankMonsterSprite()", source);
        Assert.Contains("BlankIconColor", source);
        Assert.Contains("elitesBosses.Add", source);
        Assert.Contains("string.Join(\", \", addedNames)", source);
        Assert.Contains("SceneManager.GetActiveScene().name", source);
        Assert.Contains("\"World\"", source);
        Assert.Contains("Auto-add scan skipped", source);
        Assert.Contains("All loaded boss, elite, and fabled monsters are already in the Bestiary list", source);
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
