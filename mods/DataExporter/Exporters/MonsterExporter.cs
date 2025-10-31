using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class MonsterExporter : BaseExporter
{
    public MonsterExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting monsters...");

        var type = Il2CppType.Of<Il2Cpp.Monster>();
        var monsters = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {monsters.Length} monster objects total");

        var seenMonsters = new HashSet<string>();
        var monsterList = new List<MonsterData>();
        var templateCount = 0;

        foreach (var obj in monsters)
        {
            var monster = obj.TryCast<Il2Cpp.Monster>();
            if (monster == null || string.IsNullOrEmpty(monster.name))
                continue;

            var isTemplate = monster.gameObject == null || !monster.gameObject.scene.IsValid();
            var zoneId = GetMonsterZoneId(monster);
            var uniqueKey = $"{zoneId}|{monster.name}|{isTemplate}";

            // Deduplicate by zone + name + template status
            if (seenMonsters.Contains(uniqueKey))
                continue;

            seenMonsters.Add(uniqueKey);

            if (isTemplate)
                templateCount++;

            var monsterData = new MonsterData
            {
                id = isTemplate
                    ? $"{monster.name.ToLowerInvariant().Replace(" ", "_")}_template"
                    : $"{monster.name.ToLowerInvariant().Replace(" ", "_")}_{zoneId}",
                name = monster.name,
                zone_id = zoneId,
                position = isTemplate
                    ? null
                    : new Position(
                        monster.transform.position.x,
                        monster.transform.position.y,
                        monster.transform.position.z
                    ),
                is_template = isTemplate,
                level = monster.level.current,
                health = monster.health.max,
                typeName = monster.typeMonster ?? "Unknown",
                className = monster.classMonster ?? "Unknown",
                is_boss = monster.isBoss,
                is_elite = monster.isElite,
                is_hunt = monster.isHunt,
                respawn_time = (int)monster.respawnTime,
                gold_min = monster.lootGoldMin,
                gold_max = monster.lootGoldMax,
                exp_multiplier = monster.expMultiplier
            };

            // Export drops
            if (monster.dropChances != null && monster.dropChances.Count > 0)
            {
                foreach (var drop in monster.dropChances)
                {
                    if (drop.item != null)
                    {
                        monsterData.drops.Add(new ItemDrop
                        {
                            item_id = drop.item.name.ToLowerInvariant().Replace(" ", "_"),
                            rate = drop.probability
                        });
                    }
                }
            }

            monsterList.Add(monsterData);
        }

        Logger.Msg($"Included {templateCount} template monsters (no spawn location)");

        WriteJson(monsterList, "monsters.json");
        Logger.Msg($"✓ Exported {monsterList.Count} unique monsters");
    }

    private string GetMonsterZoneId(Il2Cpp.Monster monster)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey((byte)monster.idZone))
        {
            var zone = Il2Cpp.ZoneInfo.zones[(byte)monster.idZone];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return zone.name.ToLowerInvariant().Replace(" ", "_");
            }
        }

        return "unknown";
    }
}
