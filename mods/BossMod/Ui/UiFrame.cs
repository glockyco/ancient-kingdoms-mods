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
        UiMode mode)
    {
        Bosses = bosses;
        TargetedBossId = targetedBossId;
        ServerTime = serverTime;
        UnscaledNow = unscaledNow;
        Mode = mode;
    }

    public IReadOnlyList<BossState> Bosses { get; }
    public string TargetedBossId { get; }
    public double ServerTime { get; }
    public double UnscaledNow { get; }
    public UiMode Mode { get; }
}
