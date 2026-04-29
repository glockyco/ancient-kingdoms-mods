using BossMod.Core.Catalog;
using Xunit;

namespace BossMod.Core.Tests;

public class SkillCatalogTests
{
    [Fact]
    public void GetOrCreateSkill_FirstSight_StampsFirstSeenAndReturns()
    {
        var cat = new SkillCatalog();
        var s = cat.GetOrCreateSkill("inferno_blast", "Inferno Blast", "infernal_skeleton");

        Assert.Equal("inferno_blast", s.Id);
        Assert.Equal("Inferno Blast", s.DisplayName);
        Assert.Equal("infernal_skeleton", s.LastSeenInBoss);
        Assert.NotEqual(default, s.FirstSeenUtc);
    }

    [Fact]
    public void GetOrCreateSkill_SecondSight_PreservesUserFields_RefreshesLastSeen()
    {
        var cat = new SkillCatalog();
        var s = cat.GetOrCreateSkill("a", "A", "boss1");
        s.UserThreat = ThreatTier.Critical;
        s.Sound = "klaxon";

        var s2 = cat.GetOrCreateSkill("a", "A renamed", "boss2");

        Assert.Same(s, s2);
        Assert.Equal("boss2", s2.LastSeenInBoss);
        Assert.Equal(ThreatTier.Critical, s2.UserThreat);
        Assert.Equal("klaxon", s2.Sound);
    }

    [Fact]
    public void GetOrCreateBoss_StampsAndReturns()
    {
        var cat = new SkillCatalog();
        var b = cat.GetOrCreateBoss("infernal_skeleton", "Infernal Skeleton",
            type: "Undead", className: "Warrior", zone: "Crypt of Decay",
            kind: BossKind.Boss, level: 10);

        Assert.Equal("infernal_skeleton", b.Id);
        Assert.Equal("Crypt of Decay", b.ZoneBestiary);
        Assert.Equal(10, b.LastSeenLevel);
    }

    [Fact]
    public void GetOrCreateBoss_Reseen_PreservesPerSkillUserFields()
    {
        var cat = new SkillCatalog();
        var b = cat.GetOrCreateBoss("b", "B", "T", "C", "Z", BossKind.Elite, 5);
        var bs = cat.GetOrCreateBossSkill(b, "skill_a");
        bs.Sound = "klaxon";
        bs.UserThreat = ThreatTier.High;

        var b2 = cat.GetOrCreateBoss("b", "B updated", "T2", "C2", "Z2", BossKind.Boss, 6);
        var bs2 = cat.GetOrCreateBossSkill(b2, "skill_a");

        Assert.Same(b, b2);
        Assert.Same(bs, bs2);
        Assert.Equal("klaxon", bs2.Sound);
        Assert.Equal(ThreatTier.High, bs2.UserThreat);
        Assert.Equal(BossKind.Boss, b2.Kind);    // metadata refreshed
        Assert.Equal(6, b2.LastSeenLevel);
    }
}
