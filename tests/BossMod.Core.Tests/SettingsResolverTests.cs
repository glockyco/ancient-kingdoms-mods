using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Xunit;

namespace BossMod.Core.Tests;

public class SettingsResolverTests
{
    private static readonly TierDefaults Defaults = new()
    {
        LowSound = "low", MediumSound = "medium",
        HighSound = "high", CriticalSound = "critical",
    };

    private static (SkillRecord s, BossSkillRecord b) Pair(
        ThreatTier auto = ThreatTier.Medium,
        ThreatTier? skillUser = null,
        ThreatTier? bossUser = null,
        string? skillSound = null, string? bossSound = null,
        string? skillText = null, string? bossText = null,
        AlertTrigger? skillFireOn = null, AlertTrigger? bossFireOn = null,
        bool? skillAudioMuted = null, bool? bossAudioMuted = null)
    {
        return (
            new SkillRecord
            {
                DisplayName = "TestSkill",
                UserThreat = skillUser, Sound = skillSound,
                AlertText = skillText, FireOn = skillFireOn, AudioMuted = skillAudioMuted,
            },
            new BossSkillRecord
            {
                AutoThreat = auto, UserThreat = bossUser, Sound = bossSound,
                AlertText = bossText, FireOn = bossFireOn, AudioMuted = bossAudioMuted,
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
    public void Sound_FallsThroughToTierDefault()
    {
        var (s, b) = Pair(auto: ThreatTier.Critical);
        Assert.Equal("critical", SettingsResolver.ResolveSound(s, b, Defaults));
    }

    [Fact]
    public void Sound_BossOverrideWins()
    {
        var (s, b) = Pair(auto: ThreatTier.Critical, skillSound: "skill_sound", bossSound: "boss_sound");
        Assert.Equal("boss_sound", SettingsResolver.ResolveSound(s, b, Defaults));
    }

    [Fact]
    public void AlertText_FallsThroughToDisplayNameWithBang()
    {
        var (s, b) = Pair();
        Assert.Equal("TestSkill!", SettingsResolver.ResolveAlertText(s, b, displayName: "TestSkill"));
    }

    [Fact]
    public void AlertText_EmptyStringPreserved_NotFallenThrough()
    {
        // User explicitly blanked the alert text — respect that.
        var (s, b) = Pair(skillText: "");
        Assert.Equal("", SettingsResolver.ResolveAlertText(s, b, displayName: "TestSkill"));
    }

    [Fact]
    public void ResolveFireOn_DefaultsCastStart()
    {
        var (s, b) = Pair();
        Assert.Equal(AlertTrigger.CastStart, SettingsResolver.ResolveFireOn(s, b));
    }

    [Fact]
    public void ResolveAudioMuted_DefaultsFalse()
    {
        var (s, b) = Pair();
        Assert.False(SettingsResolver.ResolveAudioMuted(s, b));
    }

    [Fact]
    public void ResolveAudioMuted_BossOverrideWinsOverSkillOverride()
    {
        var (s, b) = Pair(skillAudioMuted: false, bossAudioMuted: true);
        Assert.True(SettingsResolver.ResolveAudioMuted(s, b));
    }

    [Fact]
    public void ResolveAudioMuted_SkillOverrideWinsOverDefault()
    {
        var (s, b) = Pair(skillAudioMuted: true);
        Assert.True(SettingsResolver.ResolveAudioMuted(s, b));
    }

    [Fact]
    public void Sound_SkillOverrideUsedWhenBossNull()
    {
        var (s, b) = Pair(auto: ThreatTier.Critical, skillSound: "skill_sound");
        Assert.Equal("skill_sound", SettingsResolver.ResolveSound(s, b, Defaults));
    }

    [Fact]
    public void Sound_AllNull_FallsThroughToTierDefaultPerEachTier()
    {
        Assert.Equal("low",      SettingsResolver.ResolveSound(Pair(auto: ThreatTier.Low).s,      Pair(auto: ThreatTier.Low).b,      Defaults));
        Assert.Equal("medium",   SettingsResolver.ResolveSound(Pair(auto: ThreatTier.Medium).s,   Pair(auto: ThreatTier.Medium).b,   Defaults));
        Assert.Equal("high",     SettingsResolver.ResolveSound(Pair(auto: ThreatTier.High).s,     Pair(auto: ThreatTier.High).b,     Defaults));
    }

    [Fact]
    public void AlertText_BossOverrideWins()
    {
        var (s, b) = Pair(skillText: "skill text", bossText: "boss text");
        Assert.Equal("boss text", SettingsResolver.ResolveAlertText(s, b, "TestSkill"));
    }

    [Fact]
    public void AlertText_SkillUsedWhenBossNull()
    {
        var (s, b) = Pair(skillText: "skill text");
        Assert.Equal("skill text", SettingsResolver.ResolveAlertText(s, b, "TestSkill"));
    }

    [Fact]
    public void ResolveFireOn_SkillOverrideWinsOverDefault()
    {
        var (s, b) = Pair(skillFireOn: AlertTrigger.CooldownReady);
        Assert.Equal(AlertTrigger.CooldownReady, SettingsResolver.ResolveFireOn(s, b));
    }

    [Fact]
    public void ResolveFireOn_BossOverrideWinsOverSkillOverride()
    {
        var (s, b) = Pair(skillFireOn: AlertTrigger.CastStart, bossFireOn: AlertTrigger.CastFinish);
        Assert.Equal(AlertTrigger.CastFinish, SettingsResolver.ResolveFireOn(s, b));
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
    public void ResolveSoundWithSource_ReportsOverrideAndTierDefaultSources()
    {
        var (s, b) = Pair(auto: ThreatTier.Critical, skillSound: "skill", bossSound: "boss");
        var bossValue = SettingsResolver.ResolveSoundWithSource(s, b, Defaults);
        Assert.Equal("boss", bossValue.Value);
        Assert.Equal(SettingSource.BossOverride, bossValue.Source);

        b.Sound = null;
        var skillValue = SettingsResolver.ResolveSoundWithSource(s, b, Defaults);
        Assert.Equal("skill", skillValue.Value);
        Assert.Equal(SettingSource.SkillOverride, skillValue.Source);

        s.Sound = null;
        var tierValue = SettingsResolver.ResolveSoundWithSource(s, b, Defaults);
        Assert.Equal("critical", tierValue.Value);
        Assert.Equal(SettingSource.TierDefault, tierValue.Source);
    }

    [Fact]
    public void ResolveAlertTextWithSource_EmptyStringIsExplicitOverride()
    {
        var (skill, boss) = Pair(skillText: "skill", bossText: "");
        var bossValue = SettingsResolver.ResolveAlertTextWithSource(skill, boss, "Inferno Blast");
        Assert.Equal("", bossValue.Value);
        Assert.Equal(SettingSource.BossOverride, bossValue.Source);

        boss.AlertText = null;
        skill.AlertText = "";
        var skillValue = SettingsResolver.ResolveAlertTextWithSource(skill, boss, "Inferno Blast");
        Assert.Equal("", skillValue.Value);
        Assert.Equal(SettingSource.SkillOverride, skillValue.Source);

        skill.AlertText = null;
        var defaultValue = SettingsResolver.ResolveAlertTextWithSource(skill, boss, "Inferno Blast");
        Assert.Equal("Inferno Blast!", defaultValue.Value);
        Assert.Equal(SettingSource.HardDefault, defaultValue.Source);
    }

    [Fact]
    public void ResolveFireOnAndAudioMutedWithSource_ReportHardDefaults()
    {
        var (s, b) = Pair(skillFireOn: AlertTrigger.CastFinish, bossAudioMuted: true);
        var fire = SettingsResolver.ResolveFireOnWithSource(s, b);
        Assert.Equal(AlertTrigger.CastFinish, fire.Value);
        Assert.Equal(SettingSource.SkillOverride, fire.Source);

        var muted = SettingsResolver.ResolveAudioMutedWithSource(s, b);
        Assert.True(muted.Value);
        Assert.Equal(SettingSource.BossOverride, muted.Source);

        s.FireOn = null;
        b.AudioMuted = null;
        var defaultFire = SettingsResolver.ResolveFireOnWithSource(s, b);
        var defaultMuted = SettingsResolver.ResolveAudioMutedWithSource(s, b);
        Assert.Equal(AlertTrigger.CastStart, defaultFire.Value);
        Assert.Equal(SettingSource.HardDefault, defaultFire.Source);
        Assert.False(defaultMuted.Value);
        Assert.Equal(SettingSource.HardDefault, defaultMuted.Source);
    }
}
