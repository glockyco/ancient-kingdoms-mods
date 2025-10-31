using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class NpcExporter : BaseExporter
{
    public NpcExporter(MelonLoader.MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting NPCs...");

        var type = IL2CPPType.Of<Il2Cpp.Npc>();
        var npcs = Resources.FindObjectsOfTypeAll(type);

        var seenNpcs = new HashSet<string>();
        var npcList = new List<NpcData>();

        foreach (var obj in npcs)
        {
            var npc = obj.TryCast<Il2Cpp.Npc>();
            if (npc == null || string.IsNullOrEmpty(npc.name))
                continue;

            var zoneId = GetZoneId(npc.transform, "");
            var uniqueKey = $"{zoneId}|{npc.name}";

            // Deduplicate by zone + name
            if (seenNpcs.Contains(uniqueKey))
                continue;

            seenNpcs.Add(uniqueKey);

            var npcData = new NpcData
            {
                id = $"{npc.name.ToLowerInvariant().Replace(" ", "_")}_{zoneId}",
                name = npc.name,
                zone_id = zoneId,
                position = new Position(
                    npc.transform.position.x,
                    npc.transform.position.y,
                    npc.transform.position.z
                ),
                faction = npc.faction ?? "Neutral",
                race = npc.race ?? "Unknown",
                roles = new NpcRoles
                {
                    is_merchant = npc.trading != null && npc.trading.saleItems != null && npc.trading.saleItems.Length > 0,
                    is_quest_giver = npc.quests != null && npc.quests.quests != null && npc.quests.quests.Length > 0,
                    can_repair_equipment = npc.canRepairEquipment,
                    is_bank = npc.isBank
                }
            };

            // Export quests offered
            if (npc.quests != null && npc.quests.quests != null)
            {
                foreach (var quest in npc.quests.quests)
                {
                    if (quest != null && !string.IsNullOrEmpty(quest.name))
                    {
                        npcData.quests_offered.Add(quest.name.ToLowerInvariant().Replace(" ", "_"));
                    }
                }
            }

            // Export items sold
            if (npc.trading != null && npc.trading.saleItems != null)
            {
                foreach (var sale in npc.trading.saleItems)
                {
                    if (sale.item != null)
                    {
                        npcData.items_sold.Add(new ItemSold
                        {
                            item_id = sale.item.name.ToLowerInvariant().Replace(" ", "_"),
                            price = (int)sale.item.buyPrice
                        });
                    }
                }
            }

            npcList.Add(npcData);
        }

        WriteJson(npcList, "npcs.json");
        Logger.Msg($"✓ Exported {npcList.Count} unique NPCs");
    }
}
