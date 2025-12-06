using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class TrapExporter : BaseExporter
{
    public TrapExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting traps...");

        var traps = new List<TrapData>();

        ExportDisarmableTraps(traps);
        ExportDangerousGround(traps);
        ExportWallTraps(traps);

        WriteJson(traps, "traps.json");
        Logger.Msg($"✓ Exported {traps.Count} traps total");
    }

    private void ExportDisarmableTraps(List<TrapData> traps)
    {
        var type = Il2CppType.Of<Il2Cpp.Trap>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} disarmable trap objects");

        var count = 0;
        foreach (var obj in objects)
        {
            var trap = obj.TryCast<Il2Cpp.Trap>();
            if (trap == null)
                continue;

            var isTemplate = trap.gameObject == null || !trap.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(trap.transform.position);

            var hasTeleport = trap.destination != null;
            string teleportZoneId = null;
            Position teleportPosition = null;
            Position teleportOrientation = null;

            if (hasTeleport)
            {
                teleportZoneId = GetZoneIdFromByte(trap.idZone);
                teleportPosition = new Position(
                    trap.destination.position.x,
                    trap.destination.position.y,
                    trap.destination.position.z
                );
                teleportOrientation = new Position(
                    trap.orientation.x,
                    trap.orientation.y,
                    0
                );
            }

            var data = new TrapData
            {
                id = $"trap_{zoneInfo.ZoneId}_{trap.GetInstanceID()}",
                name = trap.name,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    trap.transform.position.x,
                    trap.transform.position.y,
                    trap.transform.position.z
                ),
                type = "disarmable",
                effect_skill_id = trap.effectTrap != null ? SanitizeId(trap.effectTrap.name) : null,
                message = !string.IsNullOrEmpty(trap.messageTrap) ? trap.messageTrap : null,
                has_teleport = hasTeleport,
                teleport_zone_id = teleportZoneId,
                teleport_position = teleportPosition,
                teleport_orientation = teleportOrientation
            };

            traps.Add(data);
            count++;
        }

        Logger.Msg($"  - {count} disarmable traps");
    }

    private void ExportDangerousGround(List<TrapData> traps)
    {
        var type = Il2CppType.Of<Il2Cpp.DangerousGround>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} dangerous ground objects");

        var count = 0;
        foreach (var obj in objects)
        {
            var ground = obj.TryCast<Il2Cpp.DangerousGround>();
            if (ground == null)
                continue;

            var isTemplate = ground.gameObject == null || !ground.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(ground.transform.position);

            var hasTeleport = ground.destination != null;
            string teleportZoneId = null;
            Position teleportPosition = null;
            Position teleportOrientation = null;

            if (hasTeleport)
            {
                teleportZoneId = GetZoneIdFromByte(ground.idZone);
                teleportPosition = new Position(
                    ground.destination.position.x,
                    ground.destination.position.y,
                    ground.destination.position.z
                );
                teleportOrientation = new Position(
                    ground.orientation.x,
                    ground.orientation.y,
                    0
                );
            }

            var data = new TrapData
            {
                id = $"dangerous_ground_{zoneInfo.ZoneId}_{ground.GetInstanceID()}",
                name = ground.name,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    ground.transform.position.x,
                    ground.transform.position.y,
                    ground.transform.position.z
                ),
                type = "dangerous_ground",
                effect_skill_id = ground.effectTrap != null ? SanitizeId(ground.effectTrap.name) : null,
                has_teleport = hasTeleport,
                teleport_zone_id = teleportZoneId,
                teleport_position = teleportPosition,
                teleport_orientation = teleportOrientation
            };

            traps.Add(data);
            count++;
        }

        Logger.Msg($"  - {count} dangerous ground areas");
    }

    private void ExportWallTraps(List<TrapData> traps)
    {
        var type = Il2CppType.Of<Il2Cpp.WallTrap>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} wall trap objects");

        var count = 0;
        foreach (var obj in objects)
        {
            var wallTrap = obj.TryCast<Il2Cpp.WallTrap>();
            if (wallTrap == null)
                continue;

            var isTemplate = wallTrap.gameObject == null || !wallTrap.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(wallTrap.transform.position);

            var data = new TrapData
            {
                id = $"wall_trap_{zoneInfo.ZoneId}_{wallTrap.GetInstanceID()}",
                name = wallTrap.name,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    wallTrap.transform.position.x,
                    wallTrap.transform.position.y,
                    wallTrap.transform.position.z
                ),
                type = "wall_trap",
                effect_skill_id = wallTrap.effectTrap != null ? SanitizeId(wallTrap.effectTrap.name) : null,
                has_teleport = false,
                fire_interval = wallTrap.timeBetweenFire,
                trap_width = wallTrap.trapSize.x,
                trap_height = wallTrap.trapSize.y
            };

            traps.Add(data);
            count++;
        }

        Logger.Msg($"  - {count} wall traps");
    }
}
