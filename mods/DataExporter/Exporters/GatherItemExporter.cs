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

        // Load all zone triggers for zone determination
        var zoneTriggerType = Il2CppType.Of<Il2Cpp.ZoneTrigger>();
        var zoneTriggers = Resources.FindObjectsOfTypeAll(zoneTriggerType);

        Logger.Msg($"Found {objects.Length} gather item objects total");
        Logger.Msg($"Found {zoneTriggers.Length} zone triggers for zone detection");

        var gatherItems = new List<GatherItemData>();
        var templateCount = 0;

        foreach (var obj in objects)
        {
            var gatherItem = obj.TryCast<Il2Cpp.GatherItem>();
            if (gatherItem == null || string.IsNullOrEmpty(gatherItem.name))
                continue;

            var isTemplate = gatherItem.gameObject == null || !gatherItem.gameObject.scene.IsValid();
            var zoneId = isTemplate ? null : GetZoneIdFromPosition(gatherItem.transform.position, zoneTriggers);

            if (isTemplate)
                templateCount++;

            var id = isTemplate
                ? SanitizeId(gatherItem.name)
                : $"{SanitizeId(gatherItem.name)}_{zoneId}_{gatherItem.GetInstanceID()}";
            var name = string.IsNullOrEmpty(gatherItem.nameGatherItem) ? gatherItem.name : gatherItem.nameGatherItem;

            var gatherItemData = new GatherItemData
            {
                // Identity
                id = id,
                name = name,
                zone_id = zoneId,
                position = isTemplate
                    ? null
                    : new Position(
                        gatherItem.transform.position.x,
                        gatherItem.transform.position.y,
                        gatherItem.transform.position.z
                    ),
                is_template = isTemplate,

                // Type flags
                is_plant = gatherItem.isPlant,
                is_mineral = gatherItem.isMineral,
                is_chest = gatherItem.isChest,
                is_radiant_spark = gatherItem.isRadiantSpark,

                // Requirements and level
                level = gatherItem.levelItem,
                tool_required_id = null,

                // Spawning and respawn
                respawn_time = gatherItem.timeToWaitReady,
                spawn_ready = gatherItem.spawnReady,
                prob_despawn = gatherItem.probDespawn,

                // Rewards
                item_reward_id = null,
                item_reward_amount = 0,
                gold_min = gatherItem.lootGoldMin,
                gold_max = gatherItem.lootGoldMax,

                // Chest-specific
                chest_reward_probability = gatherItem.probChestReward,

                // Faction impact
                decrease_faction = gatherItem.decreaseFaction ?? "",

                // Description and UI
                description = gatherItem.descriptionItem
            };

            // Calculate respawn variance based on item type
            if (gatherItem.isMineral)
            {
                gatherItemData.respawn_min = (float)gatherItem.timeToWaitReady / 2f;
                gatherItemData.respawn_max = (float)gatherItem.timeToWaitReady;
            }
            else if (gatherItem.isRadiantSpark)
            {
                gatherItemData.respawn_min = 100f;
                gatherItemData.respawn_max = 3600f;
            }
            else if (gatherItem.isPlant)
            {
                gatherItemData.respawn_min = (float)gatherItem.timeToWaitReady / 2f;
                gatherItemData.respawn_max = (float)gatherItem.timeToWaitReady;
            }
            else // Chest or other
            {
                gatherItemData.respawn_min = (float)gatherItem.timeToWaitReady;
                gatherItemData.respawn_max = (float)gatherItem.timeToWaitReady;
            }

            // Export chest interaction messages
            if (gatherItem.interactingChestMessages != null && gatherItem.interactingChestMessages.Count > 0)
            {
                foreach (var msg in gatherItem.interactingChestMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        gatherItemData.chest_interaction_messages.Add(msg);
                    }
                }
            }

            if (gatherItem.giftToPlayer != null && gatherItem.giftToPlayer.item != null)
            {
                gatherItemData.item_reward_id = SanitizeId(gatherItem.giftToPlayer.item.name);
                gatherItemData.item_reward_amount = gatherItem.giftToPlayer.amount;
            }

            if (gatherItem.itemConsumption != null)
            {
                gatherItemData.tool_required_id = SanitizeId(gatherItem.itemConsumption.name);
            }

            if (gatherItem.randomDrops != null && gatherItem.randomDrops.Length > 0)
            {
                foreach (var drop in gatherItem.randomDrops)
                {
                    if (drop.item != null)
                    {
                        gatherItemData.random_drops.Add(new ItemDrop
                        {
                            item_id = SanitizeId(drop.item.name),
                            rate = drop.probability
                        });
                    }
                }
            }

            gatherItems.Add(gatherItemData);
        }

        WriteJson(gatherItems, "gather_items.json");
        Logger.Msg($"✓ Exported {gatherItems.Count} gather items");
    }

    private string GetZoneIdFromPosition(UnityEngine.Vector3 position, Il2CppSystem.Object[] zoneTriggers)
    {
        // Find nearest zone trigger to this position
        Il2Cpp.ZoneTrigger nearestTrigger = null;
        float nearestDistance = float.MaxValue;

        foreach (var triggerObj in zoneTriggers)
        {
            var trigger = triggerObj.TryCast<Il2Cpp.ZoneTrigger>();
            if (trigger == null)
                continue;

            var triggerPos = trigger.transform.position;
            var distance = UnityEngine.Vector3.Distance(position, triggerPos);

            if (distance < nearestDistance)
            {
                nearestDistance = distance;
                nearestTrigger = trigger;
            }
        }

        if (nearestTrigger != null)
        {
            return GetZoneIdFromByte(nearestTrigger.idZone);
        }

        return "unknown";
    }

    private string GetZoneIdFromByte(byte zoneId)
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
