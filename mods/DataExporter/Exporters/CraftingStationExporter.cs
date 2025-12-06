using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class CraftingStationExporter : BaseExporter
{
    public CraftingStationExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting crafting stations...");

        var type = Il2CppType.Of<Il2Cpp.CraftingStation>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} crafting station objects total");

        var stations = new List<CraftingStationData>();

        foreach (var obj in objects)
        {
            var station = obj.TryCast<Il2Cpp.CraftingStation>();
            if (station == null)
                continue;

            var isTemplate = station.gameObject == null || !station.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(station.transform.position);

            var name = station.nameOverlay != null && !string.IsNullOrEmpty(station.nameOverlay.text)
                ? station.nameOverlay.text
                : station.name;

            var data = new CraftingStationData
            {
                id = $"{SanitizeId(name)}_{zoneInfo.ZoneId}_{station.GetInstanceID()}",
                name = name,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    station.transform.position.x,
                    station.transform.position.y,
                    station.transform.position.z
                ),
                is_cooking_oven = station.isCookingOven
            };

            stations.Add(data);
        }

        WriteJson(stations, "crafting_stations.json");
        Logger.Msg($"✓ Exported {stations.Count} crafting stations");
    }
}
