using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Xunit;

namespace BossMod.Core.Tests;

public class SettingsResolverTests
{
    private static (SkillRecord s, BossSkillRecord b) Pair(
        ThreatTier auto = ThreatTier.Medium,
        ThreatTier? skillUser = null,
        ThreatTier? bossUser = null,
        AbilityDisplayPolicy? skillCastBars = null,
        AbilityDisplayPolicy? bossCastBars = null,
        AbilityDisplayPolicy? skillBossAbilities = null,
        AbilityDisplayPolicy? bossBossAbilities = null)
    {
        return (
            new SkillRecord
            {
                DisplayName = "TestSkill",
                UserThreat = skillUser,
                CastBarVisibility = skillCastBars,
                BossAbilityVisibility = skillBossAbilities,
            },
            new BossSkillRecord
            {
                AutoThreat = auto,
                UserThreat = bossUser,
                CastBarVisibility = bossCastBars,
                BossAbilityVisibility = bossBossAbilities,
            });
    }

    [Fact]
    public void Threat_BossOverrideWins()
    {
        var (s, b) = Pair(auto: ThreatTier.Low, skillUser: ThreatTier.Medium, bossUser: ThreatTier.Critical);
        Assert.Equal(ThreatTier.Critical, SettingsResolver.ResolveThreat(s, b));
    }

    [Fact]
    public void Threat_SkillOverrideWinsWhenBossIsNull()
    {
        var (s, b) = Pair(auto: ThreatTier.Low, skillUser: ThreatTier.Medium, bossUser: null);
        Assert.Equal(ThreatTier.Medium, SettingsResolver.ResolveThreat(s, b));
    }

    [Fact]
    public void Threat_AutoUsedWhenBothNull()
    {
        var (s, b) = Pair(auto: ThreatTier.High);
        Assert.Equal(ThreatTier.High, SettingsResolver.ResolveThreat(s, b));
    }

    [Fact]
    public void ResolveThreatWithSource_ReportsBossSkillAndAutoSources()
    {
        var (skillOverride, bossOverride) = Pair(
            auto: ThreatTier.Low,
            skillUser: ThreatTier.Medium,
            bossUser: ThreatTier.Critical);
        var bossValue = SettingsResolver.ResolveThreatWithSource(skillOverride, bossOverride);
        Assert.Equal(ThreatTier.Critical, bossValue.Value);
        Assert.Equal(SettingSource.BossOverride, bossValue.Source);

        var (skillOnly, noBossOverride) = Pair(auto: ThreatTier.Low, skillUser: ThreatTier.High);
        var skillValue = SettingsResolver.ResolveThreatWithSource(skillOnly, noBossOverride);
        Assert.Equal(ThreatTier.High, skillValue.Value);
        Assert.Equal(SettingSource.SkillOverride, skillValue.Source);

        var (autoSkill, autoBoss) = Pair(auto: ThreatTier.Medium);
        var autoValue = SettingsResolver.ResolveThreatWithSource(autoSkill, autoBoss);
        Assert.Equal(ThreatTier.Medium, autoValue.Value);
        Assert.Equal(SettingSource.AutoThreat, autoValue.Source);
    }

    [Fact]
    public void CastBarVisibility_BossOverrideWins()
    {
        var (s, b) = Pair(
            skillCastBars: AbilityDisplayPolicy.Hidden,
            bossCastBars: AbilityDisplayPolicy.Always);

        var resolved = SettingsResolver.ResolveCastBarVisibilityWithSource(s, b);

        Assert.Equal(AbilityDisplayPolicy.Always, resolved.Value);
        Assert.Equal(SettingSource.BossOverride, resolved.Source);
    }

    [Fact]
    public void CastBarVisibility_SkillOverrideWinsWhenBossIsNull()
    {
        var (s, b) = Pair(skillCastBars: AbilityDisplayPolicy.Hidden);

        var resolved = SettingsResolver.ResolveCastBarVisibilityWithSource(s, b);

        Assert.Equal(AbilityDisplayPolicy.Hidden, resolved.Value);
        Assert.Equal(SettingSource.SkillOverride, resolved.Source);
    }

    [Fact]
    public void BossAbilityVisibility_BossOverrideWins()
    {
        var (s, b) = Pair(
            skillBossAbilities: AbilityDisplayPolicy.Always,
            bossBossAbilities: AbilityDisplayPolicy.Hidden);

        var resolved = SettingsResolver.ResolveBossAbilityVisibilityWithSource(s, b);

        Assert.Equal(AbilityDisplayPolicy.Hidden, resolved.Value);
        Assert.Equal(SettingSource.BossOverride, resolved.Source);
    }

    [Fact]
    public void BossAbilityVisibility_SkillOverrideWinsWhenBossIsNull()
    {
        var (s, b) = Pair(skillBossAbilities: AbilityDisplayPolicy.Hidden);

        var resolved = SettingsResolver.ResolveBossAbilityVisibilityWithSource(s, b);

        Assert.Equal(AbilityDisplayPolicy.Hidden, resolved.Value);
        Assert.Equal(SettingSource.SkillOverride, resolved.Source);
    }

    [Fact]
    public void DisplayPolicies_DefaultToAuto()
    {
        var (s, b) = Pair();

        Assert.Equal(AbilityDisplayPolicy.Auto, SettingsResolver.ResolveCastBarVisibility(s, b));
        Assert.Equal(AbilityDisplayPolicy.Auto, SettingsResolver.ResolveBossAbilityVisibility(s, b));
    }
}
