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

        Logger.Msg($"Found {zoneTriggers.Length} zone trigger objects total");

        var zoneTriggerList = new List<ZoneTriggerData>();

        foreach (var obj in zoneTriggers)
        {
            var zoneTrigger = obj.TryCast<Il2Cpp.ZoneTrigger>();
            if (zoneTrigger == null)
                continue;

            // Use nameZone directly - this is the discoverable area name shown to players
            // idZone references the parent zone in ZoneInfo.zones
            var discoverableName = zoneTrigger.nameZone;
            var sanitizedName = SanitizeId(discoverableName);

            var zoneTriggerData = new ZoneTriggerData
            {
                id = $"zone_trigger_{sanitizedName}",
                name = discoverableName,
                zone_id = zoneTrigger.idZone,
                is_outdoor = zoneTrigger.outdoorZone,
                position = new Position(
                    zoneTrigger.transform.position.x,
                    zoneTrigger.transform.position.y,
                    zoneTrigger.transform.position.z
                ),
                bloom_color = ColorToHex(zoneTrigger.bloomColor),
                light_intensity = zoneTrigger.globalLightIntensity,
                audio_zone = zoneTrigger.audioZone != null ? zoneTrigger.audioZone.name : null,
                loop_sounds_zone = zoneTrigger.loopSoundsZone != null ? zoneTrigger.loopSoundsZone.name : null
            };

            // Export collider bounds for position-based zone detection
            var collider = zoneTrigger.GetComponent<Collider2D>();
            if (collider != null)
            {
                var bounds = collider.bounds;
                zoneTriggerData.bounds_min_x = bounds.min.x;
                zoneTriggerData.bounds_min_y = bounds.min.y;
                zoneTriggerData.bounds_max_x = bounds.max.x;
                zoneTriggerData.bounds_max_y = bounds.max.y;
            }

            zoneTriggerList.Add(zoneTriggerData);
        }

        WriteJson(zoneTriggerList, "zone_triggers.json");
        Logger.Msg($"✓ Exported {zoneTriggerList.Count} zone triggers");
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
