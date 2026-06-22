namespace BossSkillTracker.Model;

public static class RelevanceFilter
{
    public static bool IsTrackedTier(bool isBoss, bool isElite, bool isFabled) => isBoss || isElite || isFabled;

    public static bool ShouldTrack(bool isBoss, bool isElite, bool isFabled, bool alive, bool engagedByMe, int trackableSkillCount)
        => alive && engagedByMe && trackableSkillCount > 0 && IsTrackedTier(isBoss, isElite, isFabled);

    public static bool ShouldPreviewTarget(bool isBoss, bool isElite, bool isFabled, bool alive, int trackableSkillCount)
        => alive && trackableSkillCount > 0 && IsTrackedTier(isBoss, isElite, isFabled);
}
