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
        bool? skillMuted = null, bool? bossMuted = null)
    {
        return (
            new SkillRecord
            {
                DisplayName = "TestSkill",
                UserThreat = skillUser, Sound = skillSound,
                AlertText = skillText, FireOn = skillFireOn, Muted = skillMuted,
            },
            new BossSkillRecord
            {
                AutoThreat = auto, UserThreat = bossUser, Sound = bossSound,
                AlertText = bossText, FireOn = bossFireOn, Muted = bossMuted,
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
    public void FireOn_DefaultsToCastStart()
    {
        var (s, b) = Pair();
        Assert.Equal(AlertTrigger.CastStart, SettingsResolver.ResolveFireOn(s, b));
    }

    [Fact]
    public void Muted_DefaultsToFalse()
    {
        var (s, b) = Pair();
        Assert.False(SettingsResolver.ResolveMuted(s, b));
    }

    [Fact]
    public void Muted_BossWinsWhenSet()
    {
        var (s, b) = Pair(skillMuted: false, bossMuted: true);
        Assert.True(SettingsResolver.ResolveMuted(s, b));
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
    public void FireOn_SkillOverrideUsedWhenBossNull()
    {
        var (s, b) = Pair(skillFireOn: AlertTrigger.CooldownReady);
        Assert.Equal(AlertTrigger.CooldownReady, SettingsResolver.ResolveFireOn(s, b));
    }

    [Fact]
    public void FireOn_BossWins()
    {
        var (s, b) = Pair(skillFireOn: AlertTrigger.CastStart, bossFireOn: AlertTrigger.CastFinish);
        Assert.Equal(AlertTrigger.CastFinish, SettingsResolver.ResolveFireOn(s, b));
    }

    [Fact]
    public void Muted_SkillUsedWhenBossNull()
    {
        var (s, b) = Pair(skillMuted: true);
        Assert.True(SettingsResolver.ResolveMuted(s, b));
    }
}
