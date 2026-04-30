using System.Collections.Generic;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using BossMod.Ui;
using UnityEngine;

namespace BossMod.Tracking;

public sealed class UiFrameBuilder
{
    private readonly PlayerContextBuilder _playerContextBuilder;

    public UiFrameBuilder(PlayerContextBuilder playerContextBuilder)
    {
        _playerContextBuilder = playerContextBuilder;
    }

    public PlayerContext LastContext => _playerContextBuilder.LastContext;

    public UiFrame Build(IReadOnlyList<BossState> bosses, Globals globals)
    {
        var context = _playerContextBuilder.Build();
        return new UiFrame(
            bosses: bosses,
            targetedBossId: context.TargetedBossId,
            serverTime: context.ServerTime,
            unscaledNow: Time.unscaledTimeAsDouble,
            mode: WindowChrome.ForMode(context.InWorldScene, globals.ConfigMode));
    }
}
