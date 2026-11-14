#nullable disable
using System;
using System.Linq;
using HotReplCommands.Dtos;
using HotReplCommands.Isolation;
using Il2Cpp;
using Il2CppInterop.Runtime;
using UnityEngine;

namespace HotReplCommands.World
{
    internal static class ChambersRuntime
    {
        public static Player RequirePlayer(bool server = true)
        {
            ScratchDatabase.RequireConfirmed(GameManager.pathFileDB);
            ScratchDatabase.ValidateOwnedPath(Application.dataPath, GameManager.pathFileDB);
            var player = Player.localPlayer;
            if (player == null || (server && !Il2CppMirror.NetworkServer.active))
                throw new InvalidOperationException("Enter a local scratch world before using this command. Remote-server mutation is refused.");
            return player;
        }

        public static ChambersState Read(Player player)
        {
            var result = new ChambersState { Character = player.nameEntity, Alive = player.health.current > 0,
                RunId = player.madMageTowerRunId, ChamberIndex = -1 };
            // Source: server-scripts/MadMageTower.cs:Run,Find,Ready — the owner's paid, non-preparing live run identifies the ready room.
            var tower = MadMageTower.instance;
            if (tower == null || !tower.runs.TryGetValue(player, out var run)) return result;
            result.RunSeed = run.seed;
            result.ChamberIndex = run.roomIndex;
            result.TrialKind = run.Kind.ToString();
            result.Complete = run.complete;
            result.TimeRemaining = Math.Max(0, run.endsAt - Il2CppMirror.NetworkTime.time);
            var room = run.room;
            if (room == null) return result;
            result.RoomId = room.GetInstanceID();
            // Scene.handle is an EntityId-based handle on Unity 6000.6, and its int conversion is not implemented
            // in the interop assemblies. Each run's scene name is unique for the life of the run.
            result.SceneHandle = StringComparer.Ordinal.GetHashCode(room.gameObject.scene.name);
            var relative = (Vector2)player.transform.position - room.Entrance;
            result.RoomCamera = new[] { relative.x, relative.y };
            // Source: server-scripts/MadMageTowerClient.cs:SceneFor,IsTransitioning — the owned client scene must be loaded and not transitioning.
            result.Ready = run.owner == player && run.id == player.madMageTowerRunId && run.paid &&
                !run.preparing && !run.dead && !run.disconnected && result.Alive && result.TimeRemaining > 0 &&
                player.idZone == MadMageTower.ZoneId && room.Floorplan != null &&
                room.gameObject.scene.IsValid() && room.gameObject.scene.isLoaded &&
                room.gameObject.scene == player.gameObject.scene &&
                MadMageTowerClient.SceneFor(player.netId, out var scene) && scene == room.gameObject.scene &&
                !MadMageTowerClient.IsTransitioning && room.runSeed == run.seed && room.chamberIndex == run.roomIndex;
            return result;
        }

        public static MadMageTowerRoom ReadyRoom(Player player, ChambersState expected = null)
        {
            var state = Read(player);
            if (!state.Ready || (expected != null && !expected.SameReadyRoom(state)))
                throw new InvalidOperationException("The owned chamber is not ready, expired, died, unloaded or changed during capture. No receipt is valid.");
            return MadMageTower.instance.runs[player].room;
        }

        public static Npc Keeper()
        {
            var matches = Resources.FindObjectsOfTypeAll(Il2CppType.Of<Npc>())
                .Select(obj => obj.TryCast<Npc>())
                .Where(npc => npc != null && npc.gameObject != null && npc.gameObject.scene.IsValid() && npc.madMageTowerEntry)
                .ToArray();
            if (matches.Length != 1) throw new InvalidOperationException("Expected exactly one live Chambers keeper placement.");
            return matches[0];
        }
    }
}
