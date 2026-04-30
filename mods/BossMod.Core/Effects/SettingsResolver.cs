using BossMod.Core.Catalog;

namespace BossMod.Core.Effects;

public sealed class TierDefaults
{
    public string LowSound { get; set; } = "low";
    public string MediumSound { get; set; } = "medium";
    public string HighSound { get; set; } = "high";
    public string CriticalSound { get; set; } = "critical";

    public string SoundFor(ThreatTier tier) => tier switch
    {
        ThreatTier.Low => LowSound,
        ThreatTier.Medium => MediumSound,
        ThreatTier.High => HighSound,
        ThreatTier.Critical => CriticalSound,
        _ => LowSound,
    };
}

public enum SettingSource
{
    BossOverride,
    SkillOverride,
    AutoThreat,
    TierDefault,
    HardDefault,
}

public readonly record struct ResolvedSetting<T>(T Value, SettingSource Source);

/// <summary>
/// Pure inheritance-chain resolver for per-skill settings.
/// Order: BossSkillRecord → SkillRecord → tier defaults / hard defaults.
/// </summary>
public static class SettingsResolver
{
    public static ThreatTier ResolveThreat(SkillRecord s, BossSkillRecord b) =>
        ResolveThreatWithSource(s, b).Value;

    public static ResolvedSetting<ThreatTier> ResolveThreatWithSource(SkillRecord s, BossSkillRecord b)
    {
        if (b.UserThreat.HasValue) return new ResolvedSetting<ThreatTier>(b.UserThreat.Value, SettingSource.BossOverride);
        if (s.UserThreat.HasValue) return new ResolvedSetting<ThreatTier>(s.UserThreat.Value, SettingSource.SkillOverride);
        return new ResolvedSetting<ThreatTier>(b.AutoThreat, SettingSource.AutoThreat);
    }

    public static string ResolveSound(SkillRecord s, BossSkillRecord b, TierDefaults defaults) =>
        ResolveSoundWithSource(s, b, defaults).Value;

    public static ResolvedSetting<string> ResolveSoundWithSource(SkillRecord s, BossSkillRecord b, TierDefaults defaults)
    {
        if (b.Sound != null) return new ResolvedSetting<string>(b.Sound, SettingSource.BossOverride);
        if (s.Sound != null) return new ResolvedSetting<string>(s.Sound, SettingSource.SkillOverride);
        return new ResolvedSetting<string>(defaults.SoundFor(ResolveThreat(s, b)), SettingSource.TierDefault);
    }

    public static string ResolveAlertText(SkillRecord s, BossSkillRecord b, string displayName) =>
        ResolveAlertTextWithSource(s, b, displayName).Value;

    public static ResolvedSetting<string> ResolveAlertTextWithSource(SkillRecord s, BossSkillRecord b, string displayName)
    {
        if (b.AlertText != null) return new ResolvedSetting<string>(b.AlertText, SettingSource.BossOverride);
        if (s.AlertText != null) return new ResolvedSetting<string>(s.AlertText, SettingSource.SkillOverride);
        return new ResolvedSetting<string>($"{displayName}!", SettingSource.HardDefault);
    }

    public static AlertTrigger ResolveFireOn(SkillRecord s, BossSkillRecord b) =>
        ResolveFireOnWithSource(s, b).Value;

    public static ResolvedSetting<AlertTrigger> ResolveFireOnWithSource(SkillRecord s, BossSkillRecord b)
    {
        if (b.FireOn.HasValue) return new ResolvedSetting<AlertTrigger>(b.FireOn.Value, SettingSource.BossOverride);
        if (s.FireOn.HasValue) return new ResolvedSetting<AlertTrigger>(s.FireOn.Value, SettingSource.SkillOverride);
        return new ResolvedSetting<AlertTrigger>(AlertTrigger.CastStart, SettingSource.HardDefault);
    }

    public static bool ResolveAudioMuted(SkillRecord s, BossSkillRecord b) =>
        ResolveAudioMutedWithSource(s, b).Value;

    public static ResolvedSetting<bool> ResolveAudioMutedWithSource(SkillRecord s, BossSkillRecord b)
    {
        if (b.AudioMuted.HasValue) return new ResolvedSetting<bool>(b.AudioMuted.Value, SettingSource.BossOverride);
        if (s.AudioMuted.HasValue) return new ResolvedSetting<bool>(s.AudioMuted.Value, SettingSource.SkillOverride);
        return new ResolvedSetting<bool>(false, SettingSource.HardDefault);
    }
}
