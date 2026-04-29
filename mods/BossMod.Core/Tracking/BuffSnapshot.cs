namespace BossMod.Core.Tracking;

public readonly record struct BuffSnapshot(
    string SkillId,
    string DisplayName,
    double BuffTimeEnd,
    float TotalBuffTime,
    bool IsAura,
    bool IsDebuff);
