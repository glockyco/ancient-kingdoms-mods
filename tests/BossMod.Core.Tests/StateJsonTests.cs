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
        s.Sound = "klaxon";

        var b = cat.GetOrCreateBoss("infernal_skeleton", "Infernal Skeleton",
            "Undead", "Warrior", "Crypt of Decay", BossKind.Boss, 10);
        var bs = cat.GetOrCreateBossSkill(b, "inferno_blast");
        bs.AutoThreat = ThreatTier.High;
        bs.Sound = "boss_specific";

        var globals = new Globals
        {
            ProximityRadius = 45f,
            Muted = true,
            MasterVolume = 0.4f,
            ExpansionDefault = ExpansionDefault.ExpandAll,
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
            Assert.Equal("klaxon", result.Catalog.Skills["inferno_blast"].Sound);

            Assert.Single(result.Catalog.Bosses);
            var b2 = result.Catalog.Bosses["infernal_skeleton"];
            Assert.Equal("Crypt of Decay", b2.ZoneBestiary);
            Assert.Single(b2.Skills);
            Assert.Equal("boss_specific", b2.Skills["inferno_blast"].Sound);

            Assert.Equal(45f, result.Globals.ProximityRadius);
            Assert.True(result.Globals.Muted);
            Assert.Equal(0.4f, result.Globals.MasterVolume);
            Assert.Equal(ExpansionDefault.ExpandAll, result.Globals.ExpansionDefault);
            Assert.Equal(999, result.Globals.Thresholds.CriticalDamage);
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }

    [Fact]
    public void Globals_DefaultsIncludeMasterVolumeAndEnumExpansionDefault()
    {
        var globals = new Globals();

        Assert.Equal(1.0f, globals.MasterVolume);
        Assert.Equal(ExpansionDefault.ExpandTargetedOnly, globals.ExpansionDefault);
        Assert.True(globals.ShowCastBarWindow);
        Assert.True(globals.ShowCooldownWindow);
        Assert.True(globals.ShowBuffTrackerWindow);
        Assert.Equal(3, globals.MaxCastBars);
        Assert.Equal("F8", globals.Hotkeys["toggle_settings"]);
    }

    [Fact]
    public void Write_SerializesExpansionDefaultAsString()
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-enum-{System.Guid.NewGuid():N}.json");
        try
        {
            StateJson.Write(path, new SkillCatalog(), new Globals { ExpansionDefault = ExpansionDefault.CollapseAll });

            var json = File.ReadAllText(path);
            Assert.Contains("\"ExpansionDefault\": \"CollapseAll\"", json);
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }

    [Fact]
    public void Read_LegacyExpansionDefaultString_MigratesToEnum()
    {
        var path = WriteRaw("""
        {
          "Version": 1,
          "Global": { "ExpansionDefault": "expand_targeted_only" },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.Loaded, result.Status);
            Assert.Equal(ExpansionDefault.ExpandTargetedOnly, result.Globals.ExpansionDefault);
            Assert.Null(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Read_LegacyMutedOverrides_MigratesToAudioMuted()
    {
        var path = WriteRaw("""
        {
          "Version": 1,
          "Global": {},
          "Skills": {
            "inferno_blast": {
              "Id": "inferno_blast",
              "DisplayName": "Inferno Blast",
              "Muted": true
            }
          },
          "Bosses": {
            "infernal_skeleton": {
              "Id": "infernal_skeleton",
              "DisplayName": "Infernal Skeleton",
              "Skills": {
                "inferno_blast": {
                  "Muted": false
                }
              }
            }
          }
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.Loaded, result.Status);
            Assert.True(result.Catalog.Skills["inferno_blast"].AudioMuted);
            Assert.False(result.Catalog.Bosses["infernal_skeleton"].Skills["inferno_blast"].AudioMuted);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Read_NumericExpansionDefault_ReturnsCorruptDefaults()
    {
        var path = WriteRaw("""
        {
          "Version": 1,
          "Global": { "ExpansionDefault": 999 },
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
    [Theory]
    [InlineData("Thresholds")]
    [InlineData("Hotkeys")]
    public void Read_ExplicitNullGlobalObjects_ReturnsCorruptDefaults(string property)
    {
        var path = WriteRaw($$"""
        {
          "Version": 1,
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
    public void Read_ValidVersionOne_ReturnsLoadedStatus()
    {
        var path = WriteRaw("""
        {
          "Version": 1,
          "Global": { "ProximityRadius": 45, "MasterVolume": 0.75, "MaxCastBars": 4 },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.Loaded, result.Status);
            Assert.Equal(45f, result.Globals.ProximityRadius);
            Assert.Equal(0.75f, result.Globals.MasterVolume);
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
    public void Read_UnsupportedVersion_ReturnsDefaultsWithUnsupportedStatus()
    {
        var path = WriteRaw("""
        {
          "Version": 999,
          "Global": { "ProximityRadius": 45, "MasterVolume": 0.75 },
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
    [InlineData("MasterVolume", -0.1)]
    [InlineData("MasterVolume", 1.1)]
    [InlineData("MaxCastBars", 0)]
    [InlineData("ProximityRadius", 0)]
    [InlineData("UiScale", 0)]
    public void Read_StructurallyInvalidGlobals_ReturnsDefaultsWithCorruptStatus(string property, double value)
    {
        var path = WriteRaw($$"""
        {
          "Version": 1,
          "Global": { "{{property}}": {{value.ToString(System.Globalization.CultureInfo.InvariantCulture)}} },
          "Skills": {},
          "Bosses": {}
        }
        """);
        try
        {
            var result = StateJson.Read(path);

            Assert.Equal(StateReadStatus.CorruptUsedDefaults, result.Status);
            Assert.Equal(1.0f, result.Globals.MasterVolume);
            Assert.Equal(3, result.Globals.MaxCastBars);
            Assert.NotNull(result.ErrorMessage);
        }
        finally { File.Delete(path); }
    }

    [Theory]
    [InlineData("""
    {
      "Version": 1,
      "Global": { "ProximityRadius": 45 },
      "Bosses": {}
    }
    """)]
    [InlineData("""
    {
      "Version": 1,
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
          "Version": 1,
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
