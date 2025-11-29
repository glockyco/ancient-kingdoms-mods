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

        var portalList = new List<PortalData>();

        // Export Portal objects (walk-through portals)
        ExportPortals(portalList);

        // Export InteractablePortal objects (click-to-use portals)
        ExportInteractablePortals(portalList);

        WriteJson(portalList, "portals.json");
        Logger.Msg($"✓ Exported {portalList.Count} portals total");
    }

    private void ExportPortals(List<PortalData> portalList)
    {
        var type = Il2CppType.Of<Il2Cpp.Portal>();
        var portals = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {portals.Length} Portal objects");

        var count = 0;
        foreach (var obj in portals)
        {
            var portal = obj.TryCast<Il2Cpp.Portal>();
            if (portal == null)
                continue;

            var isTemplate = portal.gameObject == null || !portal.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            if (portal.destination == null)
            {
                Logger.Warning($"Portal at {portal.transform.position} has no destination, skipping");
                continue;
            }

            var fromZoneInfo = GetZoneInfoFromPosition(portal.transform.position);
            var toZoneInfo = GetZoneInfoFromPosition(portal.destination.position);

            var portalData = new PortalData
            {
                id = $"portal_{fromZoneInfo.ZoneId}_to_{toZoneInfo.ZoneId}_{portal.GetInstanceID()}",
                is_interactable = false,
                from_zone_id = fromZoneInfo.ZoneId,
                from_sub_zone_id = fromZoneInfo.SubZoneId,
                to_zone_id = toZoneInfo.ZoneId,
                to_sub_zone_id = toZoneInfo.SubZoneId,
                position = new Position(
                    portal.transform.position.x,
                    portal.transform.position.y,
                    portal.transform.position.z
                ),
                destination = new Position(
                    portal.destination.position.x,
                    portal.destination.position.y,
                    portal.destination.position.z
                ),
                required_item_id = portal.key != null ? SanitizeId(portal.key.name) : null,
                level_required = portal.itemLevelRequired,
                is_closed = portal.isClosed,
                orientation = new Position(portal.orientation.x, portal.orientation.y, 0),
                need_monster_dead_id = portal.needMonsterDead != null ? SanitizeId(portal.needMonsterDead.name) : null
            };

            portalList.Add(portalData);
            count++;
        }

        Logger.Msg($"  - Exported {count} Portal objects");
    }

    private void ExportInteractablePortals(List<PortalData> portalList)
    {
        var type = Il2CppType.Of<Il2Cpp.InteractablePortal>();
        var portals = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {portals.Length} InteractablePortal objects");

        var count = 0;
        foreach (var obj in portals)
        {
            var portal = obj.TryCast<Il2Cpp.InteractablePortal>();
            if (portal == null)
                continue;

            var isTemplate = portal.gameObject == null || !portal.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            if (portal.destination == null)
            {
                Logger.Warning($"InteractablePortal at {portal.transform.position} has no destination, skipping");
                continue;
            }

            var fromZoneInfo = GetZoneInfoFromPosition(portal.transform.position);
            var toZoneInfo = GetZoneInfoFromPosition(portal.destination.position);

            var portalData = new PortalData
            {
                id = $"iportal_{fromZoneInfo.ZoneId}_to_{toZoneInfo.ZoneId}_{portal.GetInstanceID()}",
                is_interactable = true,
                from_zone_id = fromZoneInfo.ZoneId,
                from_sub_zone_id = fromZoneInfo.SubZoneId,
                to_zone_id = toZoneInfo.ZoneId,
                to_sub_zone_id = toZoneInfo.SubZoneId,
                position = new Position(
                    portal.transform.position.x,
                    portal.transform.position.y,
                    portal.transform.position.z
                ),
                destination = new Position(
                    portal.destination.position.x,
                    portal.destination.position.y,
                    portal.destination.position.z
                ),
                required_item_id = portal.key != null ? SanitizeId(portal.key.name) : null,
                level_required = portal.itemLevelRequired,
                is_closed = false,
                orientation = new Position(portal.orientation.x, portal.orientation.y, 0),
                need_monster_dead_id = portal.needMonsterDead != null ? SanitizeId(portal.needMonsterDead.name) : null
            };

            portalList.Add(portalData);
            count++;
        }

        Logger.Msg($"  - Exported {count} InteractablePortal objects");
    }
}
