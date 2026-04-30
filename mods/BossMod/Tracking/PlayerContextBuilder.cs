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
                sceneChangedOrLeftWorld: sceneChangedOrLeftWorld);
            return LastContext;
        }

        LastContext = new PlayerContext(
            targetedBossId: TargetedBossId(localPlayer),
            serverTime: ComputeServerTime(),
            inWorldScene: inWorldScene,
            sceneChangedOrLeftWorld: sceneChangedOrLeftWorld);
        return LastContext;
    }

    private static string TargetedBossId(Player localPlayer)
    {
        if (localPlayer.Networktarget == null) return "";
        var monster = localPlayer.Networktarget.TryCast<Monster>();
        if (monster == null || (!monster.isBoss && !monster.isElite)) return "";
        return SanitizeName(monster.name);
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
        sceneChangedOrLeftWorld: false);

    public PlayerContext(
        string targetedBossId,
        double serverTime,
        bool inWorldScene,
        bool sceneChangedOrLeftWorld)
    {
        TargetedBossId = targetedBossId;
        ServerTime = serverTime;
        InWorldScene = inWorldScene;
        SceneChangedOrLeftWorld = sceneChangedOrLeftWorld;
    }

    public string TargetedBossId { get; }
    public double ServerTime { get; }
    public bool InWorldScene { get; }
    public bool SceneChangedOrLeftWorld { get; }
}
