using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class TreasureLocationExporter : BaseExporter
{
    public TreasureLocationExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting treasure locations...");

        var type = Il2CppType.Of<Il2Cpp.TreasureLocation>();
        var treasureLocations = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {treasureLocations.Length} treasure location objects total");

        var locationList = new List<TreasureLocationData>();
        var templateCount = 0;

        foreach (var obj in treasureLocations)
        {
            var location = obj.TryCast<Il2Cpp.TreasureLocation>();
            if (location == null)
                continue;

            var isTemplate = location.gameObject == null || !location.gameObject.scene.IsValid();
            if (isTemplate)
            {
                templateCount++;
                continue;
            }

            var mapItem = location.requiredTreasureMap;
            if (mapItem == null)
            {
                Logger.Warning($"TreasureLocation at {location.transform.position} has no required map");
                continue;
            }

            var mapId = SanitizeId(mapItem.name);
            var zoneInfo = GetZoneInfoFromPosition(location.transform.position);
            var rewardId = mapItem.reward != null ? SanitizeId(mapItem.reward.name) : null;

            var locationData = new TreasureLocationData
            {
                id = $"treasure_{mapId}_{location.GetInstanceID()}",
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    location.transform.position.x,
                    location.transform.position.y,
                    location.transform.position.z
                ),
                required_map_id = mapId,
                reward_id = rewardId
            };

            locationList.Add(locationData);
            Logger.Msg($"  Found treasure location for {mapId} in {zoneInfo.ZoneId} at ({location.transform.position.x:F1}, {location.transform.position.y:F1})");
        }

        WriteJson(locationList, "treasure_locations.json");
        Logger.Msg($"✓ Exported {locationList.Count} treasure locations (skipped {templateCount} templates)");
    }
}
