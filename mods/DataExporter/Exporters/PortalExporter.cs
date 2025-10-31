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

        var portalList = new List<PortalData>();

        foreach (var obj in portals)
        {
            var portal = obj.TryCast<Il2Cpp.Portal>();
            if (portal == null)
                continue;

            var fromZoneId = GetZoneIdFromByte(portal.idZone);
            var toZoneId = "unknown";  // Destination zone ID not directly available from portal

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
}
