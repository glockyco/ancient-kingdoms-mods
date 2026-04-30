using BossMod.Core.Catalog;

namespace BossMod.Core.Effects;

public enum SettingSource
{
    BossOverride,
    SkillOverride,
    AutoThreat,
    HardDefault,
}

public readonly record struct ResolvedSetting<T>(T Value, SettingSource Source);

/// <summary>
/// Pure inheritance-chain resolver for per-skill settings.
/// Order: BossSkillRecord → SkillRecord → auto/default.
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

    public static AbilityDisplayPolicy ResolveCastBarVisibility(SkillRecord s, BossSkillRecord b) =>
        ResolveCastBarVisibilityWithSource(s, b).Value;

    public static ResolvedSetting<AbilityDisplayPolicy> ResolveCastBarVisibilityWithSource(SkillRecord s, BossSkillRecord b) =>
        ResolveDisplayPolicy(s.CastBarVisibility, b.CastBarVisibility);

    public static AbilityDisplayPolicy ResolveBossAbilityVisibility(SkillRecord s, BossSkillRecord b) =>
        ResolveBossAbilityVisibilityWithSource(s, b).Value;

    public static ResolvedSetting<AbilityDisplayPolicy> ResolveBossAbilityVisibilityWithSource(SkillRecord s, BossSkillRecord b) =>
        ResolveDisplayPolicy(s.BossAbilityVisibility, b.BossAbilityVisibility);

    private static ResolvedSetting<AbilityDisplayPolicy> ResolveDisplayPolicy(
        AbilityDisplayPolicy? skillOverride,
        AbilityDisplayPolicy? bossOverride)
    {
        if (bossOverride.HasValue) return new ResolvedSetting<AbilityDisplayPolicy>(bossOverride.Value, SettingSource.BossOverride);
        if (skillOverride.HasValue) return new ResolvedSetting<AbilityDisplayPolicy>(skillOverride.Value, SettingSource.SkillOverride);
        return new ResolvedSetting<AbilityDisplayPolicy>(AbilityDisplayPolicy.Auto, SettingSource.HardDefault);
    }
}
