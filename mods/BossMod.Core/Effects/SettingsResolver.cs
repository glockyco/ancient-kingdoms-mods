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

/// <summary>
/// Pure inheritance-chain resolver for per-skill settings.
/// Order: BossSkillRecord → SkillRecord → tier defaults / hard defaults.
/// </summary>
public static class SettingsResolver
{
    public static ThreatTier ResolveThreat(SkillRecord s, BossSkillRecord b) =>
        b.UserThreat ?? s.UserThreat ?? b.AutoThreat;

    public static string ResolveSound(SkillRecord s, BossSkillRecord b, TierDefaults defaults) =>
        b.Sound ?? s.Sound ?? defaults.SoundFor(ResolveThreat(s, b));

    public static string ResolveAlertText(SkillRecord s, BossSkillRecord b, string displayName) =>
        b.AlertText ?? s.AlertText ?? $"{displayName}!";

    public static AlertTrigger ResolveFireOn(SkillRecord s, BossSkillRecord b) =>
        b.FireOn ?? s.FireOn ?? AlertTrigger.CastStart;

    public static bool ResolveAudioMuted(SkillRecord s, BossSkillRecord b) =>
        b.AudioMuted ?? s.AudioMuted ?? false;
}
