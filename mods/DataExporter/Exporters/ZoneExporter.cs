using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class ZoneExporter : BaseExporter
{
    public ZoneExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting zones...");

        // Collect zone information from monsters and NPCs
        var zoneEntities = new Dictionary<string, List<Vector3>>();
        var zoneLevels = new Dictionary<string, List<int>>();

        // Gather monster data
        var monsterType = IL2CPPType.Of<Il2Cpp.Monster>();
        var monsters = Resources.FindObjectsOfTypeAll(monsterType);

        foreach (var obj in monsters)
        {
            var monster = obj.TryCast<Il2Cpp.Monster>();
            if (monster == null) continue;

            var zoneId = GetZoneId(monster.transform, monster.zoneMonster);

            if (!zoneEntities.ContainsKey(zoneId))
            {
                zoneEntities[zoneId] = new List<Vector3>();
                zoneLevels[zoneId] = new List<int>();
            }

            zoneEntities[zoneId].Add(monster.transform.position);
            zoneLevels[zoneId].Add(monster.level);
        }

        // Gather NPC data
        var npcType = IL2CPPType.Of<Il2Cpp.Npc>();
        var npcs = Resources.FindObjectsOfTypeAll(npcType);

        foreach (var obj in npcs)
        {
            var npc = obj.TryCast<Il2Cpp.Npc>();
            if (npc == null) continue;

            var zoneId = GetZoneId(npc.transform, "");

            if (!zoneEntities.ContainsKey(zoneId))
            {
                zoneEntities[zoneId] = new List<Vector3>();
                zoneLevels[zoneId] = new List<int>();
            }

            zoneEntities[zoneId].Add(npc.transform.position);
        }

        // Create zone data
        var zoneList = new List<ZoneData>();

        foreach (var kvp in zoneEntities)
        {
            var zoneId = kvp.Key;
            var positions = kvp.Value;

            if (positions.Count == 0)
                continue;

            var zoneData = new ZoneData
            {
                id = zoneId,
                name = FormatZoneName(zoneId),
                bounds = new ZoneBounds
                {
                    min_x = positions.Min(p => p.x),
                    max_x = positions.Max(p => p.x),
                    min_z = positions.Min(p => p.z),
                    max_z = positions.Max(p => p.z)
                }
            };

            // Calculate level range from monsters
            if (zoneLevels.ContainsKey(zoneId) && zoneLevels[zoneId].Count > 0)
            {
                zoneData.level_min = zoneLevels[zoneId].Min();
                zoneData.level_max = zoneLevels[zoneId].Max();
            }

            zoneList.Add(zoneData);
        }

        WriteJson(zoneList, "zones.json");
        Logger.Msg($"✓ Exported {zoneList.Count} zones");
    }

    private string FormatZoneName(string zoneId)
    {
        // Convert "volcanic_depths" to "Volcanic Depths"
        return string.Join(" ", zoneId.Split('_').Select(word =>
            char.ToUpper(word[0]) + word.Substring(1)));
    }
}
