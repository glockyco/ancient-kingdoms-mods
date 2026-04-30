using System.Collections.Generic;
using BossMod.Core.Tracking;

namespace BossMod.Ui;

public sealed class UiFrame
{
    public UiFrame(
        IReadOnlyList<BossState> bosses,
        string targetedBossId,
        double serverTime,
        double unscaledNow,
        IReadOnlyList<PlayerBuffView> playerBuffs,
        UiMode mode)
    {
        Bosses = bosses;
        TargetedBossId = targetedBossId;
        ServerTime = serverTime;
        UnscaledNow = unscaledNow;
        PlayerBuffs = playerBuffs;
        Mode = mode;
    }

    public IReadOnlyList<BossState> Bosses { get; }
    public string TargetedBossId { get; }
    public double ServerTime { get; }
    public double UnscaledNow { get; }
    public IReadOnlyList<PlayerBuffView> PlayerBuffs { get; }
    public UiMode Mode { get; }
}

public sealed class PlayerBuffView
{
    public PlayerBuffView(
        string skillId,
        string displayName,
        double endTime,
        double totalTime,
        bool isDebuff,
        bool isAura,
        bool isFromActiveBoss)
    {
        SkillId = skillId;
        DisplayName = displayName;
        EndTime = endTime;
        TotalTime = totalTime;
        IsDebuff = isDebuff;
        IsAura = isAura;
        IsFromActiveBoss = isFromActiveBoss;
    }

    public string SkillId { get; }
    public string DisplayName { get; }
    public double EndTime { get; }
    public double TotalTime { get; }
    public bool IsDebuff { get; }
    public bool IsAura { get; }
    public bool IsFromActiveBoss { get; }
}
