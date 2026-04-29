using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Xunit;

namespace BossMod.Core.Tests;

public class ThreatClassifierTests
{
    private static readonly Thresholds Default = new();

    private static (SkillSnapshot raw, BossSkillSnapshot eff) Make(
        string skillClass = "TargetDamageSkill",
        int outgoing = 0, int auraDps = 0, float castTime = 1.0f,
        DebuffKind debuffs = DebuffKind.None, bool isAura = false)
    {
        return (
            new SkillSnapshot
            {
                SkillClass = skillClass, CastTime = castTime,
                Debuffs = debuffs, IsAura = isAura,
            },
            new BossSkillSnapshot
            {
                OutgoingDamage = outgoing, AuraDpsApprox = auraDps,
                CastTimeEffective = castTime,
            });
    }

    [Fact]
    public void AreaDamage_AboveCriticalThreshold_IsCritical()
    {
        var (r, e) = Make(skillClass: "AreaDamageSkill", outgoing: 250);
        Assert.Equal(ThreatTier.Critical, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void AreaDamage_BetweenHighAndCritical_IsHigh()
    {
        var (r, e) = Make(skillClass: "AreaDamageSkill", outgoing: 100);
        Assert.Equal(ThreatTier.High, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void TargetDamage_BelowHigh_IsMedium()
    {
        var (r, e) = Make(skillClass: "TargetDamageSkill", outgoing: 50);
        Assert.Equal(ThreatTier.Medium, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void BuffSkill_NotAura_IsLow()
    {
        var (r, e) = Make(skillClass: "BuffSkill", outgoing: 0);
        Assert.Equal(ThreatTier.Low, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void LongCastTime_IsCritical()
    {
        // 4-second cast on otherwise low-damage skill still flags critical (telegraph).
        var (r, e) = Make(skillClass: "TargetDamageSkill", outgoing: 10, castTime: 4.0f);
        Assert.Equal(ThreatTier.Critical, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void StunDebuff_IsHigh()
    {
        var (r, e) = Make(skillClass: "TargetDebuffSkill", debuffs: DebuffKind.Stun);
        Assert.Equal(ThreatTier.High, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void AuraDpsAboveThreshold_IsHigh()
    {
        var (r, e) = Make(skillClass: "AreaBuffSkill", isAura: true, auraDps: 50);
        Assert.Equal(ThreatTier.High, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void Classifier_IsPure_CallableTwiceWithSameResult()
    {
        var (r, e) = Make(skillClass: "AreaDamageSkill", outgoing: 250);
        var a = ThreatClassifier.Classify(r, e, Default);
        var b = ThreatClassifier.Classify(r, e, Default);
        Assert.Equal(a, b);
    }

    [Fact]
    public void RaisingCriticalThreshold_DemotesPreviouslyCritical()
    {
        var (r, e) = Make(skillClass: "AreaDamageSkill", outgoing: 250);
        var stricter = new Thresholds { CriticalDamage = 500, HighDamage = 80 };
        Assert.Equal(ThreatTier.High, ThreatClassifier.Classify(r, e, stricter));
    }
}
