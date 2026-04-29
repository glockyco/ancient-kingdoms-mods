namespace BossMod.Core.Tracking;

public readonly record struct CastInfo(
    int SkillIdx,
    string SkillId,
    string DisplayName,
    double CastTimeEnd,
    float TotalCastTime);
