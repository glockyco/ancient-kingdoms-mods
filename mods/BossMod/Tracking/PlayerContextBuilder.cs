using System.Collections.Generic;
using BossMod.Core.Catalog;
using BossMod.Ui;
using Il2Cpp;
using Il2CppInterop.Runtime;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace BossMod.Tracking;

public sealed class PlayerContextBuilder
{
    private string _lastSceneName = "";

    public PlayerContext LastContext { get; private set; } = PlayerContext.Empty;

    public PlayerContext Build()
    {
        string sceneName = SceneManager.GetActiveScene().name;
        bool inWorldScene = sceneName == "World";
        bool sceneChangedOrLeftWorld = _lastSceneName != "" && _lastSceneName != sceneName;
        _lastSceneName = sceneName;

        var localPlayer = Player.localPlayer;
        if (!inWorldScene || localPlayer == null)
        {
            LastContext = new PlayerContext(
                targetedBossId: "",
                serverTime: ComputeServerTime(),
                inWorldScene: inWorldScene,
                sceneChangedOrLeftWorld: sceneChangedOrLeftWorld,
                playerBuffs: new List<PlayerBuffContext>());
            return LastContext;
        }

        LastContext = new PlayerContext(
            targetedBossId: TargetedBossId(localPlayer),
            serverTime: ComputeServerTime(),
            inWorldScene: inWorldScene,
            sceneChangedOrLeftWorld: sceneChangedOrLeftWorld,
            playerBuffs: BuildPlayerBuffs(localPlayer));
        return LastContext;
    }

    private static string TargetedBossId(Player localPlayer)
    {
        if (localPlayer.Networktarget == null) return "";
        var monster = localPlayer.Networktarget.TryCast<Monster>();
        if (monster == null || (!monster.isBoss && !monster.isElite)) return "";
        return SanitizeName(monster.name);
    }

    private static IReadOnlyList<PlayerBuffContext> BuildPlayerBuffs(Player localPlayer)
    {
        var result = new List<PlayerBuffContext>();
        var skills = localPlayer.skills;
        var buffsList = skills != null ? skills.buffs : null;
        if (buffsList == null) return result;

        for (int i = 0; i < buffsList.Count; i++)
        {
            var buff = buffsList[i];
            var data = buff.data;
            if (data == null || string.IsNullOrEmpty(data.name)) continue;

            bool isAura = data.TryCast<AreaBuffSkill>() is { } areaBuff && areaBuff.isAura;
            bool isDebuff = data.TryCast<AreaDebuffSkill>() != null
                         || data.TryCast<TargetDebuffSkill>() != null;

            result.Add(new PlayerBuffContext(
                skillId: data.name,
                displayName: string.IsNullOrEmpty(data.nameSkill) ? data.name : data.nameSkill,
                endTime: buff.buffTimeEnd,
                totalTime: buff.buffTime,
                isDebuff: isDebuff,
                isAura: isAura,
                sourceStatus: PlayerBuffSourceStatus.SourceUnknown));
        }

        return result;
    }

    private static double ComputeServerTime()
    {
        var nm = Object.FindObjectOfType(Il2CppType.Of<NetworkManagerMMO>());
        if (nm == null) return 0;
        var manager = nm.Cast<NetworkManagerMMO>();
        return Il2CppMirror.NetworkTime.time + manager.offsetNetworkTime;
    }

    private static string SanitizeName(string raw) => raw.Replace("(Clone)", "").Trim();
}

public sealed class PlayerContext
{
    public static readonly PlayerContext Empty = new(
        targetedBossId: "",
        serverTime: 0,
        inWorldScene: false,
        sceneChangedOrLeftWorld: false,
        playerBuffs: new List<PlayerBuffContext>());

    public PlayerContext(
        string targetedBossId,
        double serverTime,
        bool inWorldScene,
        bool sceneChangedOrLeftWorld,
        IReadOnlyList<PlayerBuffContext> playerBuffs)
    {
        TargetedBossId = targetedBossId;
        ServerTime = serverTime;
        InWorldScene = inWorldScene;
        SceneChangedOrLeftWorld = sceneChangedOrLeftWorld;
        PlayerBuffs = playerBuffs;
    }

    public string TargetedBossId { get; }
    public double ServerTime { get; }
    public bool InWorldScene { get; }
    public bool SceneChangedOrLeftWorld { get; }
    public IReadOnlyList<PlayerBuffContext> PlayerBuffs { get; }
}

public sealed class PlayerBuffContext
{
    public PlayerBuffContext(
        string skillId,
        string displayName,
        double endTime,
        double totalTime,
        bool isDebuff,
        bool isAura,
        PlayerBuffSourceStatus sourceStatus)
    {
        SkillId = skillId;
        DisplayName = displayName;
        EndTime = endTime;
        TotalTime = totalTime;
        IsDebuff = isDebuff;
        IsAura = isAura;
        SourceStatus = sourceStatus;
    }

    public string SkillId { get; }
    public string DisplayName { get; }
    public double EndTime { get; }
    public double TotalTime { get; }
    public bool IsDebuff { get; }
    public bool IsAura { get; }
    public PlayerBuffSourceStatus SourceStatus { get; }
}
