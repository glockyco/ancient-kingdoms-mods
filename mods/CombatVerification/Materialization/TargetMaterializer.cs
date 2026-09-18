#nullable disable
using System.Collections;
using System.Collections.Generic;
using CombatVerification.Dtos;
using Il2Cpp;
using Il2CppInterop.Runtime;
using UnityEngine;

namespace CombatVerification.Materialization
{
    /// <summary>
    /// Brings the player to the fixture's declared target through the game's own portal path and
    /// reads back what it stands beside.
    /// </summary>
    /// <remarks>
    /// The world keeps every zone's monsters as inactive objects until a player enters the zone, so
    /// a spawn can be located before travelling. Travel uses the same command a portal sends
    /// (<c>server-scripts/Player.cs:10837-10913</c>), which activates the zone, clears the target,
    /// and warps the player. Facing is a placement: the player is put on the side of the target
    /// that its declared facing asks for, and the facing a hit actually achieved is recorded per hit
    /// because an aggroed monster turns.
    /// </remarks>
    public static class TargetMaterializer
    {
        /// <summary>Distance from the target at which the player is placed; inside aggro range.</summary>
        private const float StandoffDistance = 3f;

        /// <summary>Frames to wait for the portal, the zone, and the player to settle.</summary>
        private const int SettleFrames = 900;

        public sealed class Approach
        {
            public Monster Target;
            public TargetReadback Readback;
            public string Failure;
        }

        /// <summary>
        /// The spawn of the named monster at the declared level that stands farthest from any other
        /// monster, so a window measures one subject.
        /// </summary>
        public static Monster FindMostIsolated(string spawn, int level, out string failure)
        {
            failure = null;
            var monsters = new List<Monster>();
            foreach (var found in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Monster>()))
            {
                var monster = found.TryCast<Monster>();
                if (monster == null || monster.gameObject == null || !monster.gameObject.scene.IsValid())
                    continue;
                monsters.Add(monster);
            }

            Monster best = null;
            var bestIsolation = -1f;
            foreach (var candidate in monsters)
            {
                if (candidate.nameEntity != spawn || candidate.level.current != level)
                    continue;
                var nearest = float.MaxValue;
                foreach (var other in monsters)
                {
                    if (ReferenceEquals(other, candidate) || other.idZone != candidate.idZone)
                        continue;
                    var distance = Vector2.Distance(candidate.transform.position, other.transform.position);
                    if (distance < nearest) nearest = distance;
                }
                if (nearest > bestIsolation)
                {
                    bestIsolation = nearest;
                    best = candidate;
                }
            }

            if (best == null)
                failure = $"The world holds no '{spawn}' at level {level}.";
            return best;
        }

        /// <summary>
        /// Portals the player beside the target on the declared side, waits for the zone to settle,
        /// then targets it. Sets <see cref="Approach.Failure"/> instead of throwing.
        /// </summary>
        public static IEnumerator ApproachCoroutine(Player player, Monster target, string facing, Approach approach)
        {
            approach.Target = target;
            var look = target.lookDirection.sqrMagnitude > 1e-6f ? target.lookDirection.normalized : Vector2.down;
            // "front" stands where the target looks; "behind" stands at its back. Walking in from
            // there gives the player the opposite or the same look direction respectively.
            var side = facing == "behind" ? -look : look;
            Vector2 destination = (Vector2)target.transform.position + side * StandoffDistance;
            var zone = target.idZone;

            player.CmdPortalDestination(zone, destination, -side);

            var settled = false;
            for (var frame = 0; frame < SettleFrames; frame++)
            {
                yield return null;
                if (player == null)
                {
                    approach.Failure = "The local player went away during the portal.";
                    yield break;
                }
                if (player.idZone != zone || !target.gameObject.activeInHierarchy)
                    continue;
                if (player.state != "IDLE" || target.health.current <= 0)
                    continue;
                if (Vector2.Distance(player.transform.position, target.transform.position) > StandoffDistance + 2f)
                    continue;
                settled = true;
                break;
            }
            if (!settled)
            {
                approach.Failure = $"The player did not settle beside the target in zone {zone}: "
                    + $"zone {player.idZone}, state {player.state}, "
                    + $"distance {Vector2.Distance(player.transform.position, target.transform.position):0.00}.";
                yield break;
            }

            player.CmdSetTarget(target.netIdentity);
            yield return null;
            if (player.Networktarget == null || player.Networktarget.netId != target.netId)
            {
                approach.Failure = "The player did not take the target.";
                yield break;
            }

            approach.Readback = new TargetReadback
            {
                Spawn = target.nameEntity,
                Level = target.level.current,
                NetId = target.netId,
                Zone = zone,
                HealthMax = target.health.max,
                Distance = Vector2.Distance(player.transform.position, target.transform.position),
                RequestedFacing = facing,
                TargetLookDirection = new[] { look.x, look.y },
                PlayerLookDirection = new[] { player.lookDirection.x, player.lookDirection.y },
                Stats = Probes.CombatStats.Read(target.combatMeter),
            };
        }
    }
}
