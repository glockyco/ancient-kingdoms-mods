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
            playerBuffs: BuildPlayerBuffViews(context.PlayerBuffs),
            mode: WindowChrome.ForMode(context.InWorldScene, globals.ConfigMode));
    }

    private static IReadOnlyList<PlayerBuffView> BuildPlayerBuffViews(IReadOnlyList<PlayerBuffContext> buffs)
    {
        var result = new List<PlayerBuffView>(buffs.Count);
        for (int i = 0; i < buffs.Count; i++)
        {
            var buff = buffs[i];
            result.Add(new PlayerBuffView(
                skillId: buff.SkillId,
                displayName: buff.DisplayName,
                endTime: buff.EndTime,
                totalTime: buff.TotalTime,
                isDebuff: buff.IsDebuff,
                isAura: buff.IsAura,
                isFromActiveBoss: buff.IsFromActiveBoss));
        }

        return result;
    }
}
