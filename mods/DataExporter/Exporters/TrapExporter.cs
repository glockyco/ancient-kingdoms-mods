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
                teleport_orientation = teleportOrientation,
                teleport_position = teleportPosition,
                area_paths = GetColliderAreaPaths(trap.gameObject)
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
                teleport_orientation = teleportOrientation,
                teleport_position = teleportPosition,
                area_paths = GetColliderAreaPaths(ground.gameObject)
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
                area_paths = GetFireBoxAreaPaths(wallTrap)
            };

            traps.Add(data);
            count++;
        }

        Logger.Msg($"  - {count} wall traps");
    }

    /// <summary>
    /// World-space rings of a trap's trigger collider. Trap and DangerousGround both require a
    /// PolygonCollider2D, whose paths are the authoritative trigger shape; any other Collider2D
    /// contributes its world bounds instead, because only the AABB is exposed for those shapes.
    /// Returns null when the object carries no collider at all.
    /// </summary>
    private static List<List<Point2>> GetColliderAreaPaths(GameObject gameObject)
    {
        if (gameObject == null)
            return null;

        var polygon = gameObject.GetComponent<PolygonCollider2D>();
        if (polygon == null)
        {
            var collider = gameObject.GetComponent<Collider2D>();
            if (collider == null)
                return null;

            var bounds = collider.bounds;
            return new List<List<Point2>>
            {
                RectanglePath(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y)
            };
        }

        var transform = polygon.transform;
        var offset = polygon.offset;
        var paths = new List<List<Point2>>();

        for (var pathIndex = 0; pathIndex < polygon.pathCount; pathIndex++)
        {
            var points = polygon.GetPath(pathIndex);
            if (points == null || points.Length < 3)
                continue;

            var ring = new List<Point2>(points.Length);
            for (var i = 0; i < points.Length; i++)
            {
                var local = new Vector3(points[i].x + offset.x, points[i].y + offset.y, 0f);
                var world = transform.TransformPoint(local);
                ring.Add(new Point2(world.x, world.y));
            }

            paths.Add(ring);
        }

        return paths.Count > 0 ? paths : null;
    }

    /// <summary>
    /// World-space ring of the box a wall trap sweeps when it fires. WallTrap.Fire overlaps an
    /// axis-aligned box of trapSize centred half its height below the trap, so the box spans the
    /// trap's full height downwards.
    /// Source: server-scripts/WallTrap.cs:37
    /// </summary>
    private static List<List<Point2>> GetFireBoxAreaPaths(Il2Cpp.WallTrap wallTrap)
    {
        var size = wallTrap.trapSize;
        if (size.x <= 0f || size.y <= 0f)
            return null;

        var position = wallTrap.transform.position;
        var halfWidth = size.x / 2f;

        return new List<List<Point2>>
        {
            RectanglePath(
                position.x - halfWidth,
                position.y - size.y,
                position.x + halfWidth,
                position.y
            )
        };
    }

    private static List<Point2> RectanglePath(float minX, float minY, float maxX, float maxY) =>
        new()
        {
            new Point2(minX, minY),
            new Point2(maxX, minY),
            new Point2(maxX, maxY),
            new Point2(minX, maxY)
        };
}
