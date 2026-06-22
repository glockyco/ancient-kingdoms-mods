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

    public static double ServerTime
    {
        get
        {
            var nm = NetworkManager.singleton != null ? NetworkManager.singleton.TryCast<NetworkManagerMMO>() : null;
            return nm != null ? NetworkTime.time + nm.offsetNetworkTime : NetworkTime.time;
        }
    }

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
