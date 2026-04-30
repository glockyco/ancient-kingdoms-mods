using System.Collections.Generic;
using Il2Cpp;

namespace BossMod.Tracking;

/// <summary>
/// Activation gate: a monster surfaces in overlays when targeted, engaged with us
/// or allies, or within proximity radius.
/// </summary>
public static class Activation
{
    public readonly record struct ActivationFacts(bool IsTargeted, bool IsEngaged, bool IsProximate)
    {
        public bool IsActive => IsTargeted || IsEngaged || IsProximate;
    }

    public static ActivationFacts Evaluate(Monster monster, Player localPlayer, float proximityRadius)
    {
        if (monster == null || localPlayer == null) return default;
        if (monster.health == null || monster.health.current <= 0) return default;

        bool isTargeted = localPlayer.Networktarget != null && localPlayer.Networktarget.netId == monster.netId;
        bool isEngaged = IsEngagedWithLocalGroup(monster, localPlayer);
        bool isProximate = IsProximate(monster, localPlayer, proximityRadius);
        return new ActivationFacts(isTargeted, isEngaged, isProximate);
    }

    public static bool IsActive(Monster monster, Player localPlayer, float proximityRadius) =>
        Evaluate(monster, localPlayer, proximityRadius).IsActive;

    private static bool IsEngagedWithLocalGroup(Monster monster, Player localPlayer)
    {
        if (monster.aggroList == null) return false;
        if (monster.aggroList.ContainsKey(localPlayer.netId)) return true;

        foreach (var ally in EnumerateLocalAllies(localPlayer))
        {
            if (ally != null && monster.aggroList.ContainsKey(ally.netId)) return true;
        }

        var playerParty = localPlayer.GetComponent<PlayerParty>();
        if (playerParty == null || playerParty.party.members == null) return false;

        foreach (var memberName in playerParty.party.members)
        {
            if (string.IsNullOrEmpty(memberName)) continue;
            if (memberName == localPlayer.nameEntity) continue;
            if (!Player.onlinePlayers.TryGetValue(memberName, out var member) || member == null) continue;

            if (monster.aggroList.ContainsKey(member.netId)) return true;

            foreach (var ally in EnumerateLocalAllies(member))
            {
                if (ally != null && monster.aggroList.ContainsKey(ally.netId)) return true;
            }
        }

        return false;
    }

    private static bool IsProximate(Monster monster, Player localPlayer, float proximityRadius)
    {
        var dx = monster.transform.position.x - localPlayer.transform.position.x;
        var dy = monster.transform.position.y - localPlayer.transform.position.y;
        return (dx * dx + dy * dy) <= proximityRadius * proximityRadius;
    }

    private static IEnumerable<Pet> EnumerateLocalAllies(Player p)
    {
        if (p.NetworkactivePet != null) yield return p.NetworkactivePet;
        if (p.NetworkactiveMercenary  != null) yield return p.NetworkactiveMercenary;
        if (p.NetworkactiveMercenary2 != null) yield return p.NetworkactiveMercenary2;
        if (p.NetworkactiveMercenary3 != null) yield return p.NetworkactiveMercenary3;
        if (p.NetworkactiveMercenary4 != null) yield return p.NetworkactiveMercenary4;
    }
}
