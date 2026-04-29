using System.Collections.Generic;
using Il2Cpp;
using UnityEngine;

namespace BossMod.Tracking;

/// <summary>
/// Activation gate: a monster surfaces in overlays + receives alerts when
/// engaged with us / party / pets / mercenaries OR within proximity radius
/// OR explicitly targeted by the local player.
/// </summary>
public static class Activation
{
    public static bool IsActive(Monster monster, Player localPlayer, float proximityRadius)
    {
        if (monster == null || localPlayer == null) return false;
        if (monster.health == null || monster.health.current <= 0) return false;

        // Explicit targeting
        if (localPlayer.Networktarget != null && localPlayer.Networktarget.netId == monster.netId) return true;

        // Aggro list contains us / party / mercs / pets
        if (monster.aggroList != null)
        {
            if (monster.aggroList.ContainsKey(localPlayer.netId)) return true;

            // Local player's own pet + mercenaries
            foreach (var ally in EnumerateLocalAllies(localPlayer))
            {
                if (ally != null && monster.aggroList.ContainsKey(ally.netId)) return true;
            }

            // Party members and their pets/mercs
            var playerParty = localPlayer.GetComponent<PlayerParty>();
            if (playerParty != null && playerParty.party.members != null)
            {
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
            }
        }

        // Proximity fallback (2D distance: X/Y of position; Z is depth in this isometric)
        var dx = monster.transform.position.x - localPlayer.transform.position.x;
        var dy = monster.transform.position.y - localPlayer.transform.position.y;
        return (dx * dx + dy * dy) <= proximityRadius * proximityRadius;
    }

    private static IEnumerable<Pet> EnumerateLocalAllies(Player p)
    {
        // Active pet/familiar (separate SyncVar from mercenaries — Player.cs:869-879).
        if (p.NetworkactivePet != null) yield return p.NetworkactivePet;
        // Mercenary slots 1..4. Slot 1 has no number suffix in the SyncVar name.
        if (p.NetworkactiveMercenary  != null) yield return p.NetworkactiveMercenary;
        if (p.NetworkactiveMercenary2 != null) yield return p.NetworkactiveMercenary2;
        if (p.NetworkactiveMercenary3 != null) yield return p.NetworkactiveMercenary3;
        if (p.NetworkactiveMercenary4 != null) yield return p.NetworkactiveMercenary4;
    }
}
