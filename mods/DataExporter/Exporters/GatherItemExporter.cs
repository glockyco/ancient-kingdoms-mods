using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class GatherItemExporter : BaseExporter
{
    public GatherItemExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting gather items...");

        var type = Il2CppType.Of<Il2Cpp.GatherItem>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} gather item objects total");

        var gatherItems = new List<GatherItemData>();
        var skippedNonScene = 0;

        foreach (var obj in objects)
        {
            var gatherItem = obj.TryCast<Il2Cpp.GatherItem>();
            if (gatherItem == null)
                continue;

            // Skip objects not in a scene (prefabs, assets)
            if (gatherItem.gameObject == null || !gatherItem.gameObject.scene.IsValid())
            {
                skippedNonScene++;
                continue;
            }

            var id = gatherItem.name.ToLowerInvariant().Replace(" ", "_");
            var name = string.IsNullOrEmpty(gatherItem.nameGatherItem) ? gatherItem.name : gatherItem.nameGatherItem;

            var gatherItemData = new GatherItemData
            {
                id = id,
                name = name,
                level = gatherItem.levelItem,
                position = new Position(
                    gatherItem.transform.position.x,
                    gatherItem.transform.position.y,
                    gatherItem.transform.position.z
                ),
                zone_id = "unknown",
                respawn_time = gatherItem.timeToWaitReady,
                item_reward_id = "unknown",
                item_reward_amount = 0,
                gold_min = gatherItem.lootGoldMin,
                gold_max = gatherItem.lootGoldMax,
                is_plant = gatherItem.isPlant,
                is_mineral = gatherItem.isMineral,
                is_chest = gatherItem.isChest,
                is_radiant_spark = gatherItem.isRadiantSpark,
                tool_required_id = "unknown"
            };

            if (gatherItem.giftToPlayer != null && gatherItem.giftToPlayer.item != null)
            {
                gatherItemData.item_reward_id = gatherItem.giftToPlayer.item.name.ToLowerInvariant().Replace(" ", "_");
                gatherItemData.item_reward_amount = gatherItem.giftToPlayer.amount;
            }

            if (gatherItem.itemConsumption != null)
            {
                gatherItemData.tool_required_id = gatherItem.itemConsumption.name.ToLowerInvariant().Replace(" ", "_");
            }

            if (gatherItem.randomDrops != null && gatherItem.randomDrops.Length > 0)
            {
                foreach (var drop in gatherItem.randomDrops)
                {
                    if (drop.item != null)
                    {
                        gatherItemData.random_drops.Add(new ItemDrop
                        {
                            item_id = drop.item.name.ToLowerInvariant().Replace(" ", "_"),
                            rate = drop.probability
                        });
                    }
                }
            }

            gatherItems.Add(gatherItemData);
        }

        Logger.Msg($"Skipped {skippedNonScene} non-scene objects (prefabs/assets)");

        WriteJson(gatherItems, "gather_items.json");
        Logger.Msg($"✓ Exported {gatherItems.Count} gather items");
    }
}
