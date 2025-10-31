using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class ZoneTriggerExporter : BaseExporter
{
    public ZoneTriggerExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting zone triggers...");

        var type = Il2CppType.Of<Il2Cpp.ZoneTrigger>();
        var zoneTriggers = Resources.FindObjectsOfTypeAll(type);

        var zoneTriggerList = new List<ZoneTriggerData>();

        foreach (var obj in zoneTriggers)
        {
            var zoneTrigger = obj.TryCast<Il2Cpp.ZoneTrigger>();
            if (zoneTrigger == null)
                continue;

            var zoneName = GetZoneNameFromId(zoneTrigger.idZone);

            var zoneTriggerData = new ZoneTriggerData
            {
                id = $"zone_trigger_{zoneTrigger.idZone}_{zoneTrigger.GetInstanceID()}",
                name = zoneName,
                zone_id = zoneTrigger.idZone,
                is_outdoor = zoneTrigger.outdoorZone,
                position = new Position(
                    zoneTrigger.transform.position.x,
                    zoneTrigger.transform.position.y,
                    zoneTrigger.transform.position.z
                ),
                bloom_color = ColorToHex(zoneTrigger.bloomColor),
                light_intensity = zoneTrigger.globalLightIntensity,
                audio_zone = zoneTrigger.audioZone != null ? zoneTrigger.audioZone.name : "",
                loop_sounds_zone = zoneTrigger.loopSoundsZone != null ? zoneTrigger.loopSoundsZone.name : ""
            };

            zoneTriggerList.Add(zoneTriggerData);
        }

        WriteJson(zoneTriggerList, "zone_triggers.json");
        Logger.Msg($"✓ Exported {zoneTriggerList.Count} zone triggers");
    }

    private string GetZoneNameFromId(byte zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey(zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return zone.name;
            }
        }

        return "Unknown";
    }

    private string ColorToHex(Color color)
    {
        int r = Mathf.RoundToInt(color.r * 255);
        int g = Mathf.RoundToInt(color.g * 255);
        int b = Mathf.RoundToInt(color.b * 255);
        int a = Mathf.RoundToInt(color.a * 255);
        return $"#{r:X2}{g:X2}{b:X2}{a:X2}";
    }
}
