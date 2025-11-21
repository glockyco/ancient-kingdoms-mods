using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class SummonTriggerExporter : BaseExporter
{
    public SummonTriggerExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting summon triggers...");

        var type = Il2CppType.Of<Il2Cpp.SummonMonster>();
        var summonComponents = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {summonComponents.Length} SummonMonster components total");

        var triggerList = new List<SummonTriggerData>();

        foreach (var obj in summonComponents)
        {
            var summonMonster = obj.TryCast<Il2Cpp.SummonMonster>();
            if (summonMonster == null)
                continue;

            var isInScene = summonMonster.gameObject != null && summonMonster.gameObject.scene.IsValid();
            if (!isInScene)
                continue;

            if (summonMonster.summonEntity == null || summonMonster.placeHolders == null)
                continue;

            var triggerData = new SummonTriggerData
            {
                spawn_position = new Position(
                    summonMonster.transform.position.x,
                    summonMonster.transform.position.y,
                    summonMonster.transform.position.z
                )
            };

            // Determine summoned entity type and ID
            var asMonster = summonMonster.summonEntity.TryCast<Il2Cpp.Monster>();
            if (asMonster != null)
            {
                triggerData.summoned_entity_type = "Monster";
                triggerData.summoned_entity_name = asMonster.name;
                triggerData.summoned_entity_id = SanitizeId(asMonster.name);
                triggerData.summon_message = asMonster.summonMessage ?? "";
            }
            else
            {
                var asNpc = summonMonster.summonEntity.TryCast<Il2Cpp.Npc>();
                if (asNpc != null)
                {
                    triggerData.summoned_entity_type = "Npc";
                    triggerData.summoned_entity_name = asNpc.name;
                    triggerData.summoned_entity_id = SanitizeId(asNpc.name);
                    triggerData.summon_message = "";
                }
                else
                {
                    Logger.Warning($"Unknown summonEntity type for {summonMonster.gameObject.name}");
                    continue;
                }
            }

            // Generate trigger ID
            triggerData.id = $"summon_{triggerData.summoned_entity_id}";

            // Get zone from first placeholder (they should all be in the same zone)
            if (summonMonster.placeHolders.Count > 0 && summonMonster.placeHolders[0] != null)
            {
                var firstPlaceholder = summonMonster.placeHolders[0];
                triggerData.zone_id = GetZoneId((byte)firstPlaceholder.idZone);
            }
            else
            {
                triggerData.zone_id = "unknown";
            }

            // Export placeholder monster IDs
            foreach (var placeholder in summonMonster.placeHolders)
            {
                if (placeholder == null)
                    continue;

                var phZoneId = GetZoneId((byte)placeholder.idZone);
                var placeholderId = $"{SanitizeId(placeholder.name)}_{phZoneId}_{placeholder.GetInstanceID()}";

                triggerData.placeholder_monster_ids.Add(placeholderId);
            }

            triggerList.Add(triggerData);
        }

        WriteJson(triggerList, "summon_triggers.json");
        Logger.Msg($"✓ Exported {triggerList.Count} summon triggers");
    }

    private string GetZoneId(byte zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey(zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return SanitizeId(zone.name);
            }
        }

        return "unknown";
    }
}