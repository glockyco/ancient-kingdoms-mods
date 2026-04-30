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
        var liveGlobals = new Globals { Muted = true, MasterVolume = 0.2f, ProximityRadius = 55f };
        var skillsReference = liveCatalog.Skills;
        var bossesReference = liveCatalog.Bosses;
        var thresholdsReference = liveGlobals.Thresholds;

        var loadedCatalog = CatalogWithSkill("new", ThreatTier.Critical, userThreat: ThreatTier.Medium);
        var loadedGlobals = new Globals { Muted = false, MasterVolume = 0.8f, ProximityRadius = 25f };

        bool changed = StateMutation.ApplyLoadedStateInPlace(liveCatalog, liveGlobals, loadedCatalog, loadedGlobals);

        Assert.True(changed);
        Assert.Same(skillsReference, liveCatalog.Skills);
        Assert.Same(bossesReference, liveCatalog.Bosses);
        Assert.Same(thresholdsReference, liveGlobals.Thresholds);
        Assert.False(liveCatalog.Skills.ContainsKey("old"));
        Assert.True(liveCatalog.Skills.ContainsKey("new"));
        Assert.False(liveGlobals.Muted);
        Assert.Equal(0.8f, liveGlobals.MasterVolume);
        Assert.Equal(25f, liveGlobals.ProximityRadius);
    }

    [Fact]
    public void ApplyLoadedStateInPlace_EquivalentStateReturnsFalse()
    {
        var liveCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        var liveGlobals = new Globals
        {
            Muted = true,
            MasterVolume = 0.4f,
            ProximityRadius = 40f,
            Thresholds = new Thresholds { CriticalDamage = 300, HighDamage = 100, AuraDpsHigh = 50, CriticalCastTime = 4.5f },
        };
        var loadedCatalog = CatalogWithSkill("inferno", ThreatTier.High, userThreat: ThreatTier.Critical);
        var loadedGlobals = new Globals
        {
            Muted = true,
            MasterVolume = 0.4f,
            ProximityRadius = 40f,
            Thresholds = new Thresholds { CriticalDamage = 300, HighDamage = 100, AuraDpsHigh = 50, CriticalCastTime = 4.5f },
        };

        bool changed = StateMutation.ApplyLoadedStateInPlace(liveCatalog, liveGlobals, loadedCatalog, loadedGlobals);

        Assert.False(changed);
    }

    [Fact]
    public void ResetUserSettingsToDefaults_PreservesDiscoveryAndClearsUserOverrides()
    {
        var catalog = CatalogWithSkill("inferno", ThreatTier.Critical, userThreat: ThreatTier.High);
        var skill = catalog.Skills["inferno"];
        skill.Sound = "custom";
        skill.AlertText = "";
        skill.FireOn = AlertTrigger.CooldownReady;
        skill.AudioMuted = true;
        var boss = catalog.Bosses["boss"];
        var bossSkill = boss.Skills["inferno"];
        bossSkill.Sound = "boss_custom";
        bossSkill.AlertText = "boss text";
        bossSkill.FireOn = AlertTrigger.CastFinish;
        bossSkill.AudioMuted = false;
        bossSkill.LastObservedUtc = new DateTime(2026, 4, 30, 12, 0, 0, DateTimeKind.Utc);

        var globals = new Globals
        {
            Muted = true,
            MasterVolume = 0.25f,
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
        Assert.Null(skill.Sound);
        Assert.Null(skill.AlertText);
        Assert.Null(skill.FireOn);
        Assert.Null(skill.AudioMuted);
        Assert.Null(bossSkill.UserThreat);
        Assert.Null(bossSkill.Sound);
        Assert.Null(bossSkill.AlertText);
        Assert.Null(bossSkill.FireOn);
        Assert.Null(bossSkill.AudioMuted);
        Assert.False(globals.Muted);
        Assert.Equal(1.0f, globals.MasterVolume);
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
