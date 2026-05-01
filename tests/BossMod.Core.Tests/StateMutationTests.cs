using System;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using Xunit;

namespace BossMod.Core.Tests;

public class StateMutationTests
{
    [Fact]
    public void ApplyLoadedStateInPlace_ChangedStateMutatesExistingRoots()
    {
        var liveCatalog = CatalogWithSkill("old", ThreatTier.Low, userThreat: ThreatTier.High);
        var liveGlobals = new Globals
        {
            BossAbilitiesDensity = BossAbilityDensity.Expanded,
            ProximityRadius = 55f,
            ShowBossAbilitiesWindow = false,
        };
        var skillsReference = liveCatalog.Skills;
        var bossesReference = liveCatalog.Bosses;
        var thresholdsReference = liveGlobals.Thresholds;

        var loadedCatalog = CatalogWithSkill("new", ThreatTier.Critical, userThreat: ThreatTier.Medium);
        var loadedGlobals = new Globals
        {
            BossAbilitiesDensity = BossAbilityDensity.Compact,
            ProximityRadius = 25f,
            ShowBossAbilitiesWindow = true,
        };

        bool changed = StateMutation.ApplyLoadedStateInPlace(liveCatalog, liveGlobals, loadedCatalog, loadedGlobals);

        Assert.True(changed);
        Assert.Same(skillsReference, liveCatalog.Skills);
        Assert.Same(bossesReference, liveCatalog.Bosses);
        Assert.Same(thresholdsReference, liveGlobals.Thresholds);
        Assert.False(liveCatalog.Skills.ContainsKey("old"));
        Assert.True(liveCatalog.Skills.ContainsKey("new"));
        Assert.Equal(BossAbilityDensity.Compact, liveGlobals.BossAbilitiesDensity);
        Assert.Equal(25f, liveGlobals.ProximityRadius);
        Assert.True(liveGlobals.ShowBossAbilitiesWindow);
    }

    [Fact]
    public void ApplyLoadedStateInPlace_EquivalentStateReturnsFalse()
    {
        var liveCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        var liveGlobals = new Globals
        {
            BossAbilitiesDensity = BossAbilityDensity.Expanded,
            ProximityRadius = 40f,
            ShowBossAbilitiesWindow = false,
            Thresholds = new Thresholds { CriticalDamage = 300, HighDamage = 100, AuraDpsHigh = 50, CriticalCastTime = 4.5f },
        };
        var loadedCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        var loadedGlobals = new Globals
        {
            BossAbilitiesDensity = BossAbilityDensity.Expanded,
            ProximityRadius = 40f,
            ShowBossAbilitiesWindow = false,
            Thresholds = new Thresholds { CriticalDamage = 300, HighDamage = 100, AuraDpsHigh = 50, CriticalCastTime = 4.5f },
        };

        bool changed = StateMutation.ApplyLoadedStateInPlace(liveCatalog, liveGlobals, loadedCatalog, loadedGlobals);

        Assert.False(changed);
    }

    [Fact]
    public void ApplyLoadedStateInPlace_BossAbilityDensityDifferenceMutatesExistingGlobals()
    {
        var liveCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        var loadedCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        var liveGlobals = new Globals { BossAbilitiesDensity = BossAbilityDensity.Compact };
        var loadedGlobals = new Globals { BossAbilitiesDensity = BossAbilityDensity.Expanded };

        bool changed = StateMutation.ApplyLoadedStateInPlace(liveCatalog, liveGlobals, loadedCatalog, loadedGlobals);

        Assert.True(changed);
        Assert.Equal(BossAbilityDensity.Expanded, liveGlobals.BossAbilitiesDensity);
    }

    [Fact]
    public void ApplyLoadedStateInPlace_DisplayPolicyDifferenceMutatesExistingRoots()
    {
        var liveCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        liveCatalog.Skills["inferno"].CastBarVisibility = AbilityDisplayPolicy.Hidden;
        liveCatalog.Bosses["boss"].Skills["inferno"].BossAbilityVisibility = AbilityDisplayPolicy.Hidden;

        var loadedCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        loadedCatalog.Skills["inferno"].CastBarVisibility = AbilityDisplayPolicy.Always;
        loadedCatalog.Bosses["boss"].Skills["inferno"].BossAbilityVisibility = AbilityDisplayPolicy.Always;

        bool changed = StateMutation.ApplyLoadedStateInPlace(liveCatalog, new Globals(), loadedCatalog, new Globals());

        Assert.True(changed);
        Assert.Equal(AbilityDisplayPolicy.Always, liveCatalog.Skills["inferno"].CastBarVisibility);
        Assert.Equal(AbilityDisplayPolicy.Always, liveCatalog.Bosses["boss"].Skills["inferno"].BossAbilityVisibility);
    }


    [Fact]
    public void ApplyLoadedStateInPlace_SkillIndexDifferenceMutatesExistingRoots()
    {
        var liveCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        liveCatalog.Bosses["boss"].Skills["inferno"].SkillIndex = 2;
        var loadedCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        loadedCatalog.Bosses["boss"].Skills["inferno"].SkillIndex = 0;

        bool changed = StateMutation.ApplyLoadedStateInPlace(liveCatalog, new Globals(), loadedCatalog, new Globals());

        Assert.True(changed);
        Assert.Equal(0, liveCatalog.Bosses["boss"].Skills["inferno"].SkillIndex);
    }
    [Fact]
    public void ResetUserSettingsToDefaults_PreservesDiscoveryAndClearsUserOverrides()
    {
        var catalog = CatalogWithSkill("inferno", ThreatTier.Critical, userThreat: ThreatTier.High);
        var skill = catalog.Skills["inferno"];
        skill.CastBarVisibility = AbilityDisplayPolicy.Hidden;
        skill.BossAbilityVisibility = AbilityDisplayPolicy.Always;
        var boss = catalog.Bosses["boss"];
        var bossSkill = boss.Skills["inferno"];
        bossSkill.CastBarVisibility = AbilityDisplayPolicy.Always;
        bossSkill.BossAbilityVisibility = AbilityDisplayPolicy.Hidden;
        bossSkill.LastObservedUtc = new DateTime(2026, 4, 30, 12, 0, 0, DateTimeKind.Utc);

        var globals = new Globals
        {
            BossAbilitiesDensity = BossAbilityDensity.Expanded,
            ShowBossAbilitiesWindow = false,
            ProximityRadius = 75f,
            UiScale = 1.5f,
            Thresholds = new Thresholds { CriticalDamage = 500, HighDamage = 150, AuraDpsHigh = 80, CriticalCastTime = 6f },
        };

        bool changed = StateMutation.ResetUserSettingsToDefaults(catalog, globals);

        Assert.True(changed);
        Assert.True(catalog.Skills.ContainsKey("inferno"));
        Assert.True(catalog.Bosses.ContainsKey("boss"));
        Assert.Equal(ThreatTier.Critical, bossSkill.AutoThreat);
        Assert.Equal(new DateTime(2026, 4, 30, 12, 0, 0, DateTimeKind.Utc), bossSkill.LastObservedUtc);
        Assert.Null(skill.UserThreat);
        Assert.Null(skill.CastBarVisibility);
        Assert.Null(skill.BossAbilityVisibility);
        Assert.Null(bossSkill.UserThreat);
        Assert.Null(bossSkill.CastBarVisibility);
        Assert.Null(bossSkill.BossAbilityVisibility);
        Assert.Equal(BossAbilityDensity.Compact, globals.BossAbilitiesDensity);
        Assert.True(globals.ShowBossAbilitiesWindow);
        Assert.Equal(30f, globals.ProximityRadius);
        Assert.Equal(200, globals.Thresholds.CriticalDamage);
    }

    private static SkillCatalog CatalogWithSkill(string skillId, ThreatTier autoThreat, ThreatTier? userThreat)
    {
        var catalog = new SkillCatalog();
        var firstSeen = new DateTime(2026, 4, 30, 1, 0, 0, DateTimeKind.Utc);
        var lastSeen = new DateTime(2026, 4, 30, 2, 0, 0, DateTimeKind.Utc);
        var skill = catalog.GetOrCreateSkill(skillId, "Inferno", "boss");
        skill.FirstSeenUtc = firstSeen;
        skill.UserThreat = userThreat;
        var boss = catalog.GetOrCreateBoss("boss", "Boss", "Type", "Class", "Zone", BossKind.Boss, 10);
        boss.FirstSeenUtc = firstSeen;
        boss.LastSeenUtc = lastSeen;
        var bossSkill = catalog.GetOrCreateBossSkill(boss, skillId);
        bossSkill.AutoThreat = autoThreat;
        bossSkill.UserThreat = userThreat;
        bossSkill.LastObservedUtc = lastSeen;
        return catalog;
    }
}
