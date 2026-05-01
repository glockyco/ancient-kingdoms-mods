using System.Linq;
using System.Text.Json.Nodes;
using System.IO;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using Xunit;

namespace BossMod.Core.Tests;

public class StateJsonTests
{
    [Fact]
    public void RoundTrip_PreservesCatalogAndGlobals()
    {
        var cat = new SkillCatalog();
        var s = cat.GetOrCreateSkill("inferno_blast", "Inferno Blast", "infernal_skeleton");
        s.UserThreat = ThreatTier.Critical;
        s.CastBarVisibility = AbilityDisplayPolicy.Always;
        s.BossAbilityVisibility = AbilityDisplayPolicy.Hidden;
        var b = cat.GetOrCreateBoss("infernal_skeleton", "Infernal Skeleton",
            "Undead", "Warrior", "Crypt of Decay", BossKind.Boss, 10);
        var bs = cat.GetOrCreateBossSkill(b, "inferno_blast");
        bs.AutoThreat = ThreatTier.High;
        bs.CastBarVisibility = AbilityDisplayPolicy.Always;
        bs.BossAbilityVisibility = AbilityDisplayPolicy.Hidden;

        var globals = new Globals
        {
            ProximityRadius = 45f,
            BossAbilitiesDensity = BossAbilityDensity.Expanded,
            ShowBossAbilitiesWindow = false,
        };
        globals.Thresholds.CriticalDamage = 999;

        var path = Path.Combine(Path.GetTempPath(), $"bossmod-test-{System.Guid.NewGuid():N}.json");
        try
        {
            StateJson.Write(path, cat, globals);
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.Loaded, result.Status);
            Assert.Null(result.ErrorMessage);
            Assert.Single(result.Catalog.Skills);
            Assert.Equal("Inferno Blast", result.Catalog.Skills["inferno_blast"].DisplayName);
            Assert.Equal(ThreatTier.Critical, result.Catalog.Skills["inferno_blast"].UserThreat);
            Assert.Equal(AbilityDisplayPolicy.Always, result.Catalog.Skills["inferno_blast"].CastBarVisibility);
            Assert.Equal(AbilityDisplayPolicy.Hidden, result.Catalog.Skills["inferno_blast"].BossAbilityVisibility);
            Assert.Single(result.Catalog.Bosses);
            var b2 = result.Catalog.Bosses["infernal_skeleton"];
            Assert.Equal("Crypt of Decay", b2.ZoneBestiary);
            Assert.Single(b2.Skills);
            Assert.Equal(AbilityDisplayPolicy.Always, b2.Skills["inferno_blast"].CastBarVisibility);
            Assert.Equal(AbilityDisplayPolicy.Hidden, b2.Skills["inferno_blast"].BossAbilityVisibility);

            Assert.Equal(45f, result.Globals.ProximityRadius);
            Assert.Equal(BossAbilityDensity.Expanded, result.Globals.BossAbilitiesDensity);
            Assert.False(result.Globals.ShowBossAbilitiesWindow);
            Assert.Equal(999, result.Globals.Thresholds.CriticalDamage);
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }

    [Fact]
    public void Globals_DefaultsIncludeAbilityFocusedWindowSettings()
    {
        var globals = new Globals();

        Assert.Equal(BossAbilityDensity.Compact, globals.BossAbilitiesDensity);
        Assert.True(globals.ShowCastBarWindow);
        Assert.True(globals.ShowBossAbilitiesWindow);
        Assert.Equal(3, globals.MaxCastBars);
        Assert.Equal("F8", globals.Hotkeys["toggle_settings"]);
    }

    [Fact]
    public void Write_SerializesCurrentCleanShape()
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-enum-{System.Guid.NewGuid():N}.json");
        try
        {
            var catalog = new SkillCatalog();
            var skill = catalog.GetOrCreateSkill("inferno_blast", "Inferno Blast", "infernal_skeleton");
            skill.UserThreat = ThreatTier.Critical;
            skill.CastBarVisibility = AbilityDisplayPolicy.Always;
            skill.BossAbilityVisibility = AbilityDisplayPolicy.Hidden;
            var boss = catalog.GetOrCreateBoss("infernal_skeleton", "Infernal Skeleton", "Undead", "Warrior", "Crypt", BossKind.Boss, 10);
            var bossSkill = catalog.GetOrCreateBossSkill(boss, "inferno_blast", skillIndex: 0);
            bossSkill.UserThreat = ThreatTier.High;
            bossSkill.CastBarVisibility = AbilityDisplayPolicy.Hidden;
            bossSkill.BossAbilityVisibility = AbilityDisplayPolicy.Always;

            StateJson.Write(path, catalog, new Globals { BossAbilitiesDensity = BossAbilityDensity.Expanded });

            var json = File.ReadAllText(path);
            Assert.Contains("\"BossAbilitiesDensity\": \"Expanded\"", json);
            var root = Assert.IsType<JsonObject>(JsonNode.Parse(json));
            Assert.Equal(2, root["Version"]!.GetValue<int>());
            Assert.Empty(root.Select(entry => entry.Key).Except(new[] { "Version", "Global", "Skills", "Bosses" }));
            var global = Assert.IsType<JsonObject>(root["Global"]);
            Assert.Empty(global.Select(entry => entry.Key).Except(new[]
            {
                "Thresholds",
                "ProximityRadius",
                "UiScale",
                "MaxCastBars",
                "BossAbilitiesDensity",
                "Hotkeys",
                "ShowCastBarWindow",
                "ShowBossAbilitiesWindow",
                "ConfigMode",
            }));
            var skills = Assert.IsType<JsonObject>(root["Skills"]);
            var serializedSkill = Assert.IsType<JsonObject>(skills["inferno_blast"]);
            Assert.Empty(serializedSkill.Select(entry => entry.Key).Except(new[]
            {
                "Id",
                "DisplayName",
                "FirstSeenUtc",
                "LastSeenInBoss",
                "RawSnapshot",
                "UserThreat",
                "CastBarVisibility",
                "BossAbilityVisibility",
            }));

            var bosses = Assert.IsType<JsonObject>(root["Bosses"]);
            var serializedBoss = Assert.IsType<JsonObject>(bosses["infernal_skeleton"]);
            Assert.Empty(serializedBoss.Select(entry => entry.Key).Except(new[]
            {
                "Id",
                "DisplayName",
                "Type",
                "Class",
                "ZoneBestiary",
                "Kind",
                "LastSeenLevel",
                "FirstSeenUtc",
                "LastSeenUtc",
                "Skills",
            }));

            var serializedBossSkills = Assert.IsType<JsonObject>(serializedBoss["Skills"]);
            var serializedBossSkill = Assert.IsType<JsonObject>(serializedBossSkills["inferno_blast"]);
            Assert.Empty(serializedBossSkill.Select(entry => entry.Key).Except(new[]
            {
                "SkillIndex",
                "EffectiveSnapshot",
                "AutoThreat",
                "UserThreat",
                "CastBarVisibility",
                "BossAbilityVisibility",
                "LastObservedUtc",
            }));
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }


    [Theory]
    [InlineData("Thresholds")]
    [InlineData("Hotkeys")]
    public void Read_ExplicitNullGlobalObjects_ReturnsCorruptDefaults(string property)
    {
        var path = WriteRaw($$"""
        {
          "Version": 2,
          "Global": { "{{property}}": null },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.CorruptUsedDefaults, result.Status);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Read_MissingFile_ReturnsDefaultsWithMissingStatus()
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-missing-{System.Guid.NewGuid():N}.json");
        var result = StateJson.Read(path);

        Assert.Equal(StateReadStatus.MissingUsedDefaults, result.Status);
        Assert.Empty(result.Catalog.Skills);
        Assert.Empty(result.Catalog.Bosses);
        Assert.Equal(30f, result.Globals.ProximityRadius);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public void Read_MissingVersion_ReturnsCorruptDefaults()
    {
        var path = WriteRaw("""
        {
          "Global": { "ProximityRadius": 45 },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.CorruptUsedDefaults, result.Status);
            Assert.Equal(30f, result.Globals.ProximityRadius);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Read_ValidVersionTwo_ReturnsLoadedStatus()
    {
        var path = WriteRaw("""
        {
          "Version": 2,
          "Global": { "ProximityRadius": 45, "MaxCastBars": 4 },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.Loaded, result.Status);
            Assert.Equal(45f, result.Globals.ProximityRadius);
            Assert.Equal(4, result.Globals.MaxCastBars);
            Assert.Null(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Read_MalformedJson_ReturnsDefaultsWithCorruptStatus()
    {
        var path = WriteRaw("{ this is not valid json");
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.CorruptUsedDefaults, result.Status);
            Assert.Empty(result.Catalog.Skills);
            Assert.Empty(result.Catalog.Bosses);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Read_PreCutoverVersionOne_ReturnsUnsupportedDefaults()
    {
        var path = WriteRaw("""
        {
          "Version": 1,
          "Global": { "ProximityRadius": 45 },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.UnsupportedVersionUsedDefaults, result.Status);
            Assert.Equal(30f, result.Globals.ProximityRadius);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Read_UnsupportedVersion_ReturnsDefaultsWithUnsupportedStatus()
    {
        var path = WriteRaw("""
        {
          "Version": 999,
          "Global": { "ProximityRadius": 45 },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.UnsupportedVersionUsedDefaults, result.Status);
            Assert.Equal(30f, result.Globals.ProximityRadius);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Theory]
    [InlineData("MaxCastBars", 0)]
    [InlineData("ProximityRadius", 0)]
    [InlineData("UiScale", 0)]
    [InlineData("BossAbilitiesDensity", 999)]
    public void Read_StructurallyInvalidGlobals_ReturnsDefaultsWithCorruptStatus(string property, double value)
    {
        var path = WriteRaw($$"""
        {
          "Version": 2,
          "Global": { "{{property}}": {{value.ToString(System.Globalization.CultureInfo.InvariantCulture)}} },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.CorruptUsedDefaults, result.Status);
            Assert.Equal(3, result.Globals.MaxCastBars);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Theory]
    [InlineData("""
    {
      "Version": 2,
      "Global": { "ProximityRadius": 45 },
      "Bosses": {}
    }
    """)]
    [InlineData("""
    {
      "Version": 2,
      "Global": { "ProximityRadius": 45 },
      "Skills": {}
    }
    """)]
    public void Read_MissingTopLevelCatalogSections_ReturnsCorruptDefaults(string json)
    {
        var path = WriteRaw(json);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.CorruptUsedDefaults, result.Status);
            Assert.Empty(result.Catalog.Skills);
            Assert.Empty(result.Catalog.Bosses);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Read_NullNestedCatalogObjects_ReturnsCorruptDefaults()
    {
        var path = WriteRaw("""
        {
          "Version": 2,
          "Global": { "ProximityRadius": 45 },
          "Skills": {
            "inferno": {
              "Id": "inferno",
              "DisplayName": "Inferno",
              "RawSnapshot": null
            }
          },
          "Bosses": {
            "boss": {
              "Id": "boss",
              "DisplayName": "Boss",
              "Skills": null
            }
          }
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.CorruptUsedDefaults, result.Status);
            Assert.Empty(result.Catalog.Skills);
            Assert.Empty(result.Catalog.Bosses);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Write_AtomicallyReplaces_DoesNotLeaveTempFile()
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-atomic-{System.Guid.NewGuid():N}.json");
        try
        {
            StateJson.Write(path, new SkillCatalog(), new Globals { ProximityRadius = 10 });
            Assert.True(File.Exists(path));
            Assert.False(File.Exists(path + ".tmp"));

            StateJson.Write(path, new SkillCatalog(), new Globals { ProximityRadius = 20 });
            var result = StateJson.Read(path);
            Assert.Equal(StateReadStatus.Loaded, result.Status);
            Assert.Equal(20f, result.Globals.ProximityRadius);
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }

    private static string WriteRaw(string content)
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-state-{System.Guid.NewGuid():N}.json");
        File.WriteAllText(path, content);
        return path;
    }
}
