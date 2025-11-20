using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class ZoneInfoExporter : BaseExporter
{
    public ZoneInfoExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting zone info...");

        var zoneInfoList = new List<ZoneInfoData>();

        if (Il2Cpp.ZoneInfo.zones == null)
        {
            Logger.Warning("ZoneInfo.zones is null - no zones to export");
            return;
        }

        foreach (var kvp in Il2Cpp.ZoneInfo.zones)
        {
            var zoneId = kvp.Key;
            var zone = kvp.Value;

            if (zone == null)
                continue;

            var zoneInfoData = new ZoneInfoData
            {
                zone_id = zone.id,
                id = SanitizeId(zone.name),
                name = zone.name,
                is_dungeon = zone.isDungeon,
                weather_type = zone.weatherType.ToString(),
                weather_probability = zone.probabilityWeather,
                required_level = zone.requiredLevel,
                description = zone.description ?? "",
                min_zoom_map = zone.minZoomMap,
                max_zoom_map = zone.maxZoomMap
            };

            zoneInfoList.Add(zoneInfoData);
        }

        WriteJson(zoneInfoList, "zone_info.json");
        Logger.Msg($"✓ Exported {zoneInfoList.Count} zones from ZoneInfo");
    }
}
