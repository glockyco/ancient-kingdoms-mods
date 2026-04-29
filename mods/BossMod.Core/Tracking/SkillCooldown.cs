namespace BossMod.Core.Tracking;

public readonly record struct SkillCooldown(
    int SkillIdx,
    string SkillId,
    string DisplayName,
    double CooldownEnd,
    float TotalCooldown);
