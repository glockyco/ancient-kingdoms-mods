using BossSkillTracker.Model;
using Il2Cpp;
using Il2CppMirror;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace BossSkillTracker.Game;

public static class GameAccess
{
    public static bool InWorld => SceneManager.GetActiveScene().name == "World";

    public static Player LocalPlayer => Player.localPlayer;

    /// <summary>
    /// Whether this process runs the world's server. A local world does; a client that joined a
    /// remote server through UIServerList does not, and its monsters carry no server-side fields.
    /// </summary>
    public static bool HostsServer => NetworkServer.active;

    /// <summary>
    /// The game's network manager, whose <c>offsetNetworkTime</c> turns <c>NetworkTime.time</c>
    /// into server time. Null when the singleton is missing or of another type.
    /// </summary>
    public static NetworkManagerMMO NetworkManagerMmo =>
        NetworkManager.singleton != null ? NetworkManager.singleton.TryCast<NetworkManagerMMO>() : null;

    /// <summary>The sum the game's <c>getServerTimeCorrected()</c> returns.</summary>
    public static double ServerTime(NetworkManagerMMO networkManager) =>
        NetworkTime.time + networkManager.offsetNetworkTime;

    public static Entity Pet(Player localPlayer)
    {
        var pet = localPlayer.NetworkactivePet;
        return pet != null ? pet : null;
    }

    public static bool InCombat(Player localPlayer, double now)
    {
        if (localPlayer.lastCombatTime + Tuning.CombatGraceSeconds > now) return true;

        var pet = Pet(localPlayer);
        return pet != null && pet.lastCombatTime + Tuning.CombatGraceSeconds > now;
    }

    public static Tier? TierOf(Monster monster)
    {
        if (monster.isBoss) return Tier.Boss;
        if (monster.isFabled) return Tier.Fabled;
        if (monster.isElite) return Tier.Elite;
        return null;
    }

    public static Color TierColor(Tier tier)
    {
        switch (tier)
        {
            case Tier.Boss: return Il2Cpp.Utils.bossMonsterColor;
            case Tier.Fabled: return Il2Cpp.Utils.fabledMonsterColor;
            case Tier.Elite: return Il2Cpp.Utils.eliteMonsterColor;
            default: return Color.white;
        }
    }

    public static Sprite Portrait(Monster monster)
    {
        if (monster.portraitBoss != null) return monster.portraitBoss;
        if (monster.imageBossBestiary != null) return monster.imageBossBestiary;

        var renderer = monster.gameObject != null ? monster.gameObject.GetComponent<SpriteRenderer>() : null;
        return renderer != null ? renderer.sprite : null;
    }
}
