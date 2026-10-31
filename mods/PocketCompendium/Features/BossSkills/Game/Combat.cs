using Il2Cpp;
using PocketCompendium.Features.BossSkills.Model;

namespace PocketCompendium.Features.BossSkills.Game;

public static class Combat
{
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
}
