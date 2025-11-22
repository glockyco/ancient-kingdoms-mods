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

        Logger.Msg($"Found {portals.Length} portal objects total");

        var portalList = new List<PortalData>();
        var templateCount = 0;

        foreach (var obj in portals)
        {
            var portal = obj.TryCast<Il2Cpp.Portal>();
            if (portal == null)
                continue;

            var isTemplate = portal.gameObject == null || !portal.gameObject.scene.IsValid();
            if (isTemplate)
            {
                templateCount++;
                continue;
            }

            var fromZoneId = GetZoneIdFromPosition(portal.transform.position);
            var toZoneId = GetZoneIdFromByte(portal.idZone);

            var portalData = new PortalData
            {
                id = $"portal_{fromZoneId}_to_{toZoneId}_{portal.GetInstanceID()}",
                is_template = false,
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
                    : null,
                required_item_id = portal.key != null ? SanitizeId(portal.key.name) : null,
                level_required = portal.itemLevelRequired,
                is_closed = portal.isClosed,
                orientation = new Position(portal.orientation.x, portal.orientation.y, 0),
                need_monster_dead_id = portal.needMonsterDead != null ? SanitizeId(portal.needMonsterDead.name) : null
            };

            portalList.Add(portalData);
        }

        WriteJson(portalList, "portals.json");
        Logger.Msg($"✓ Exported {portalList.Count} portals");
    }
}
