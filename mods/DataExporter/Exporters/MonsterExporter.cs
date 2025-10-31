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

        var type = IL2CPPType.Of<Il2Cpp.Monster>();
        var monsters = Resources.FindObjectsOfTypeAll(type);

        var seenMonsters = new HashSet<string>();
        var monsterList = new List<MonsterData>();

        foreach (var obj in monsters)
        {
            var monster = obj.TryCast<Il2Cpp.Monster>();
            if (monster == null || string.IsNullOrEmpty(monster.name))
                continue;

            var zoneId = GetZoneId(monster.transform, monster.zoneMonster);
            var uniqueKey = $"{zoneId}|{monster.name}";

            // Deduplicate by zone + name
            if (seenMonsters.Contains(uniqueKey))
                continue;

            seenMonsters.Add(uniqueKey);

            var monsterData = new MonsterData
            {
                id = $"{monster.name.ToLowerInvariant().Replace(" ", "_")}_{zoneId}",
                name = monster.name,
                zone_id = zoneId,
                position = new Position(
                    monster.transform.position.x,
                    monster.transform.position.y,
                    monster.transform.position.z
                ),
                level = monster.level,
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

        WriteJson(monsterList, "monsters.json");
        Logger.Msg($"✓ Exported {monsterList.Count} unique monsters");
    }
}
