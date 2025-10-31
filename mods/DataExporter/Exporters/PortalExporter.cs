using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class PortalExporter : BaseExporter
{
    public PortalExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting portals...");

        var type = Il2CppType.Of<Il2Cpp.Portal>();
        var portals = Resources.FindObjectsOfTypeAll(type);

        // Load all zone triggers for destination matching
        var zoneTriggerType = Il2CppType.Of<Il2Cpp.ZoneTrigger>();
        var zoneTriggers = Resources.FindObjectsOfTypeAll(zoneTriggerType);

        var portalList = new List<PortalData>();

        foreach (var obj in portals)
        {
            var portal = obj.TryCast<Il2Cpp.Portal>();
            if (portal == null)
                continue;

            var fromZoneId = GetZoneIdFromByte(portal.idZone);
            var toZoneId = GetDestinationZoneId(portal, zoneTriggers);

            var portalData = new PortalData
            {
                id = $"portal_{fromZoneId}_to_{toZoneId}_{portal.GetInstanceID()}",
                from_zone_id = fromZoneId,
                to_zone_id = toZoneId,
                position = new Position(
                    portal.transform.position.x,
                    portal.transform.position.y,
                    portal.transform.position.z
                ),
                destination = portal.destination != null
                    ? new Position(
                        portal.destination.position.x,
                        portal.destination.position.y,
                        portal.destination.position.z
                    )
                    : new Position(0, 0, 0),
                required_item_id = portal.key != null ? portal.key.name.ToLowerInvariant().Replace(" ", "_") : "",
                level_required = portal.itemLevelRequired,
                is_closed = portal.isClosed
            };

            portalList.Add(portalData);
        }

        WriteJson(portalList, "portals.json");
        Logger.Msg($"✓ Exported {portalList.Count} portals");
    }

    private string GetZoneIdFromByte(byte zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey(zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return zone.name.ToLowerInvariant().Replace(" ", "_");
            }
        }

        return "unknown";
    }

    private string GetDestinationZoneId(Il2Cpp.Portal portal, Il2CppSystem.Object[] zoneTriggers)
    {
        // If no destination, return unknown
        if (portal.destination == null)
            return "unknown";

        var destPos = portal.destination.position;

        // Find nearest zone trigger to destination
        Il2Cpp.ZoneTrigger nearestTrigger = null;
        float nearestDistance = float.MaxValue;

        foreach (var triggerObj in zoneTriggers)
        {
            var trigger = triggerObj.TryCast<Il2Cpp.ZoneTrigger>();
            if (trigger == null)
                continue;

            var triggerPos = trigger.transform.position;
            var distance = UnityEngine.Vector3.Distance(destPos, triggerPos);

            if (distance < nearestDistance)
            {
                nearestDistance = distance;
                nearestTrigger = trigger;
            }
        }

        // Use the nearest trigger's zone name
        if (nearestTrigger != null)
        {
            if (!string.IsNullOrEmpty(nearestTrigger.nameZone))
            {
                return nearestTrigger.nameZone.ToLowerInvariant().Replace(" ", "_");
            }
            // Fallback to zone ID lookup
            return GetZoneIdFromByte(nearestTrigger.idZone);
        }

        return "unknown";
    }
}
