using BossMod.Core.Catalog;

namespace BossMod.Core.Alerts;

/// <summary>
/// Emitted by AlertEngine when an interesting transition occurs.
/// Resolved values (sound, text, threat) are baked in; consumers never re-resolve.
/// </summary>
public readonly record struct AlertEvent(
    AlertTrigger Trigger,
    uint MonsterNetId,
    string BossId,
    string BossDisplayName,
    string SkillId,
    string SkillDisplayName,
    ThreatTier EffectiveThreat,
    string EffectiveSound,
    string EffectiveAlertText,
    bool AudioMuted,
    double ServerTimeAtEvent);
