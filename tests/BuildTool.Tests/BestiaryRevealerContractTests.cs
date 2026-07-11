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
        var modRoot = Path.Combine(repoRoot, "mods", "BetterBestiary");
        Assert.True(Directory.Exists(modRoot), "mods/BetterBestiary must exist.");

        var projectFile = Path.Combine(modRoot, "BetterBestiary.csproj");
        Assert.True(File.Exists(projectFile), "BestiaryRevealer.csproj must exist.");

        var projectText = File.ReadAllText(projectFile);
        Assert.Contains("<AssemblyName>BetterBestiary</AssemblyName>", projectText);
        Assert.Contains("<RootNamespace>BetterBestiary</RootNamespace>", projectText);
        Assert.Contains("0Harmony", projectText);
        Assert.Contains("UnityEngine.UI", projectText);

        var sourceFiles = Directory.GetFiles(modRoot, "*.cs", SearchOption.AllDirectories);
        Assert.NotEmpty(sourceFiles);
        var source = string.Join("\n", sourceFiles.Select(File.ReadAllText));

        Assert.Contains("Better Bestiary", source);
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
        var modRoot = Path.Combine(repoRoot, "mods", "BetterBestiary");
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
        Assert.Contains("BestiaryMonsterSprites.GridSpriteFor(monster, out var imageColor)", source);
        Assert.Contains("BlankIconColor", source);
        Assert.Contains("elitesBosses.Add", source);
        Assert.Contains("string.Join(\", \", addedNames)", source);
        Assert.Contains("SceneManager.GetActiveScene().name", source);
        Assert.Contains("\"World\"", source);
        Assert.Contains("Auto-add scan skipped", source);
        Assert.Contains("All loaded boss, elite, and fabled monsters are already in the Bestiary list", source);
    }

    [Fact]
    public void BestiaryRevealerUsesLiveSpriteFallbackForMissingDetailImages()
    {
        var repoRoot = FindRepoRoot();
        var modRoot = Path.Combine(repoRoot, "mods", "BetterBestiary");
        var detailRenderer = File.ReadAllText(Path.Combine(modRoot, "Ui", "BestiaryDetailRenderer.cs"));
        var gridRenderer = File.ReadAllText(Path.Combine(modRoot, "Ui", "BestiaryGridRenderer.cs"));
        var spriteFallback = File.ReadAllText(Path.Combine(modRoot, "Ui", "BestiaryMonsterSprites.cs"));

        Assert.Contains("BestiaryMonsterSprites.DetailSpriteFor(monster, out var imageColor)", detailRenderer);
        Assert.Contains("detail.imageBoss.color = imageColor", detailRenderer);
        Assert.DoesNotContain("portraitBoss", detailRenderer, StringComparison.Ordinal);
        Assert.Contains("monster.imageBossBestiary", spriteFallback);
        Assert.Contains("GetComponent<SpriteRenderer>()", spriteFallback);
        Assert.Contains("BlankMonsterSprite()", spriteFallback);
        Assert.Contains("BestiaryMonsterSprites.GridSpriteFor(monster, out var imageColor)", gridRenderer);
        Assert.DoesNotContain("GetComponentsInChildren<SpriteRenderer>", spriteFallback, StringComparison.Ordinal);
        Assert.DoesNotContain("\"Front\"", spriteFallback, StringComparison.Ordinal);
    }

    [Fact]
    public void BestiaryRevealerFallsBackToMonsterZoneName()
    {
        var repoRoot = FindRepoRoot();
        var renderer = File.ReadAllText(Path.Combine(repoRoot, "mods", "BetterBestiary", "Ui", "BestiaryDetailRenderer.cs"));

        Assert.Contains("SetText(detail.zoneBoss, ZoneText(monster))", renderer);
        Assert.Contains("private static string ZoneText(Monster monster)", renderer);
        Assert.Contains("!string.IsNullOrWhiteSpace(monster.zoneMonster)", renderer);
        Assert.Contains("ZoneInfo.zones.ContainsKey(monster.idZone)", renderer);
        Assert.Contains("ZoneInfo.zones[monster.idZone].name", renderer);
        Assert.DoesNotContain("monster.zoneMonster =", renderer, StringComparison.Ordinal);
    }

    [Fact]
    public void BestiaryRevealerOpensBestiaryFromMonsterAltClick()
    {
        var repoRoot = FindRepoRoot();
        var modRoot = Path.Combine(repoRoot, "mods", "BetterBestiary");
        var projectFile = Path.Combine(modRoot, "BetterBestiary.csproj");
        var projectText = File.ReadAllText(projectFile);
        var sourceFiles = Directory.GetFiles(modRoot, "*.cs", SearchOption.AllDirectories);
        var source = string.Join("\n", sourceFiles.Select(File.ReadAllText));

        Assert.Contains("Unity.InputSystem", projectText);
        Assert.Contains("override void OnUpdate()", source);
        Assert.Contains("Mouse.current", source);
        Assert.Contains("mouse.leftButton.wasPressedThisFrame", source);
        Assert.Contains("Physics2D.OverlapPointAll", source);
        Assert.Contains("GameManager.clickableFilter", source);
        Assert.Contains("GameManager.noFilter", source);
        Assert.Contains("GameManager.monsterFilter", source);
        Assert.Contains("GetComponentInParent<Monster>()", source);
        Assert.DoesNotContain("new Collider2D[32]", source, StringComparison.Ordinal);
        Assert.Contains("BestiaryPageOpener.Open", source);
        Assert.Contains("EnsureBestiaryEntry", source);
        Assert.Contains("journal.OpenBestiary()", source);
        Assert.Contains("journal.rectTransformJournal.SetAsLastSibling()", source);
        Assert.Contains("detail.monster = monster", source);
        Assert.Contains("BestiaryDetailRenderer.Reveal(detail)", source);
        Assert.Contains("Utils.normalMonsterColor", source);
        Assert.DoesNotContain("HarmonyPatch(typeof(PointerInput2DManager), \"TryClickOnPress\")", source, StringComparison.Ordinal);
        Assert.DoesNotContain("[HarmonyPatch(typeof(Entity), \"OnClick\")]", source, StringComparison.Ordinal);
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
