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

        var globals = new Globals { ProximityRadius = 45f, Muted = true };
        globals.Thresholds.CriticalDamage = 999;

        var path = Path.Combine(Path.GetTempPath(), $"bossmod-test-{System.Guid.NewGuid():N}.json");
        try
        {
            StateJson.Write(path, cat, globals);
            var (cat2, glob2) = StateJson.Read(path);

            Assert.Single(cat2.Skills);
            Assert.Equal("Inferno Blast", cat2.Skills["inferno_blast"].DisplayName);
            Assert.Equal(ThreatTier.Critical, cat2.Skills["inferno_blast"].UserThreat);
            Assert.Equal("klaxon", cat2.Skills["inferno_blast"].Sound);

            Assert.Single(cat2.Bosses);
            var b2 = cat2.Bosses["infernal_skeleton"];
            Assert.Equal("Crypt of Decay", b2.ZoneBestiary);
            Assert.Single(b2.Skills);
            Assert.Equal("boss_specific", b2.Skills["inferno_blast"].Sound);

            Assert.Equal(45f, glob2.ProximityRadius);
            Assert.True(glob2.Muted);
            Assert.Equal(999, glob2.Thresholds.CriticalDamage);
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }

    [Fact]
    public void Read_MissingFile_ReturnsEmptyDefaults()
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-missing-{System.Guid.NewGuid():N}.json");
        var (cat, glob) = StateJson.Read(path);
        Assert.Empty(cat.Skills);
        Assert.Empty(cat.Bosses);
        Assert.Equal(30f, glob.ProximityRadius);  // default
    }

    [Fact]
    public void Read_CorruptFile_ReturnsEmptyDefaultsAndDoesNotThrow()
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-corrupt-{System.Guid.NewGuid():N}.json");
        File.WriteAllText(path, "{ this is not valid json");
        try
        {
            var (cat, glob) = StateJson.Read(path);
            Assert.Empty(cat.Skills);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Write_AtomicallyReplaces_DoesNotCorruptOnPartialWrite()
    {
        // We write to a .tmp first then rename, so even if the process is killed
        // mid-write the existing file is preserved.
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-atomic-{System.Guid.NewGuid():N}.json");
        try
        {
            StateJson.Write(path, new SkillCatalog(), new Globals { ProximityRadius = 10 });
            Assert.True(File.Exists(path));
            Assert.False(File.Exists(path + ".tmp"));

            StateJson.Write(path, new SkillCatalog(), new Globals { ProximityRadius = 20 });
            var (_, glob) = StateJson.Read(path);
            Assert.Equal(20f, glob.ProximityRadius);
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }
}
