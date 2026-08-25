using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using Newtonsoft.Json;
using UnityEngine;

namespace DataExporter.Exporters;

public class GatherItemExporter : BaseExporter
{
    private sealed class GatherItemRecord
    {
        public Il2Cpp.GatherItem Source { get; init; }
        public GatherItemData Data { get; init; }
    }

    public GatherItemExporter(MelonLogger.Instance logger, string exportPath, VisualAssetRegistry visualAssets)
        : base(logger, exportPath, visualAssets)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting gather items...");

        var type = Il2CppType.Of<Il2Cpp.GatherItem>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} gather item objects total");

        var records = new List<GatherItemRecord>();
        var templateCount = 0;

        foreach (var obj in objects)
        {
            var gatherItem = obj.TryCast<Il2Cpp.GatherItem>();
            if (gatherItem == null || string.IsNullOrEmpty(gatherItem.name))
                continue;

            var isTemplate = gatherItem.gameObject == null || !gatherItem.gameObject.scene.IsValid();
            var zoneInfo = isTemplate ? default : GetZoneInfoFromPosition(gatherItem.transform.position);
            var zoneId = isTemplate ? null : zoneInfo.ZoneId;
            var subZoneId = isTemplate ? null : zoneInfo.SubZoneId;

            if (isTemplate)
                templateCount++;

            var id = isTemplate
                ? SanitizeId(gatherItem.name)
                : $"{SanitizeId(gatherItem.name)}_{zoneId}_{gatherItem.GetInstanceID()}";
            // GatherItem.Start copies the object name over nameGatherItem, so that
            // field holds the authored value until the object starts. The id already
            // reads the object name, which is why ids stayed stable while names did
            // not.
            var name = gatherItem.name;

            var gatherItemData = new GatherItemData
            {
                // Identity. resource_id is assigned in the canonical grouping pass below.
                id = id,
                name = name,
                resource_id = null,
                zone_id = zoneId,
                sub_zone_id = subZoneId,
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
                is_fishing_spot = gatherItem.isFish,
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
                        gatherItemData.chest_interaction_messages.Add(msg);
                }
            }

            if (gatherItem.giftToPlayer != null && gatherItem.giftToPlayer.item != null)
            {
                gatherItemData.item_reward_id = SanitizeId(gatherItem.giftToPlayer.item.name);
                gatherItemData.item_reward_amount = gatherItem.giftToPlayer.amount;
            }

            if (gatherItem.itemConsumption != null)
                gatherItemData.tool_required_id = SanitizeId(gatherItem.itemConsumption.name);

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

            records.Add(new GatherItemRecord
            {
                Source = gatherItem,
                Data = gatherItemData,
            });
        }

        AssignCanonicalResourceIds(records);
        ExportResourceArtwork(records);
        ExportChestArtwork(records);

        WriteJson(records.Select(record => record.Data).ToList(), "gather_items.json");
        Logger.Msg($"✓ Exported {records.Count} gather items ({templateCount} templates)");
    }

    private void AssignCanonicalResourceIds(List<GatherItemRecord> records)
    {
        var resourceGroups = records
            .Where(record => !record.Data.is_chest)
            .GroupBy(
                record => record.Data.is_fishing_spot
                    ? $"fishing:{BuildFishingSignature(record.Data)}"
                    : $"normal:{record.Data.name}",
                StringComparer.Ordinal)
            .ToList();
        var fishingVariantCounts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var group in resourceGroups)
        {
            if (!group.First().Data.is_fishing_spot)
                continue;

            var name = group.First().Data.name;
            fishingVariantCounts.TryGetValue(name, out var count);
            fishingVariantCounts[name] = count + 1;
        }

        var resourceIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var group in resourceGroups)
        {
            var canonical = group
                .OrderByDescending(record => record.Data.is_template)
                .First();
            var resourceId = canonical.Data.is_fishing_spot
                && fishingVariantCounts[canonical.Data.name] > 1
                ? $"{NormalizeResourceBaseId(canonical.Data.name)}_{GetFishingSignatureHash(canonical)}"
                : canonical.Data.is_fishing_spot
                    ? NormalizeResourceBaseId(canonical.Data.name)
                    : group.Any(record => record.Data.is_template)
                        ? canonical.Data.id
                        : NormalizeResourceBaseId(canonical.Data.name);

            if (string.IsNullOrEmpty(resourceId))
                throw new InvalidOperationException($"Gather item group '{group.Key}' has no canonical resource ID.");
            if (!resourceIds.Add(resourceId))
                throw new InvalidOperationException($"Duplicate canonical gather resource ID '{resourceId}'.");

            foreach (var record in group)
                record.Data.resource_id = resourceId;
        }
    }

    private void ExportResourceArtwork(List<GatherItemRecord> records)
    {
        var resourceGroups = records
            .Where(record => !record.Data.is_chest)
            .GroupBy(record => record.Data.resource_id ?? string.Empty, StringComparer.Ordinal);

        foreach (var group in resourceGroups)
        {
            // Prefer the canonical template's icon, falling back to a scene instance
            // only when the template does not carry a journal icon.
            var iconRecord = group
                .OrderByDescending(record => record.Data.is_template)
                .FirstOrDefault(record => record.Source.journalIcon != null);
            if (iconRecord == null)
            {
                Logger.Warning($"Gather resource '{group.Key}' has no journalIcon to export.");
                continue;
            }

            var sprite = iconRecord.Source.journalIcon;
            VisualAssets?.ExportSprite(
                "gathering_resource",
                group.Key,
                "icon",
                "GatherItem.journalIcon",
                sprite.GetType().FullName,
                sprite.name,
                sprite);
        }
    }

    private void ExportChestArtwork(List<GatherItemRecord> records)
    {
        foreach (var record in records.Where(record => record.Data.is_chest))
        {
            var sprite = record.Source.readySprite;
            if (sprite == null)
                continue;

            VisualAssets?.ExportSprite(
                "chest",
                record.Data.id,
                "primary",
                "GatherItem.readySprite",
                sprite.GetType().FullName,
                sprite.name,
                sprite);
        }
    }

    private static string NormalizeResourceBaseId(string name)
    {
        return name?.ToLowerInvariant().Replace(" ", "_");
    }

    private static string BuildFishingSignature(GatherItemData resource)
    {
        var drops = resource.random_drops
            .OrderBy(drop => drop.item_id, StringComparer.Ordinal)
            .ThenBy(drop => drop.rate)
            .Select(drop => new object[] { drop.item_id, drop.rate })
            .ToArray();

        // This shape intentionally matches the historical Python signature:
        // [name, level, [[item_id, rate], ...]].
        return JsonConvert.SerializeObject(
            new object[] { resource.name, resource.level, drops },
            Formatting.None);
    }

    private static string GetFishingSignatureHash(GatherItemRecord record)
    {
        return GetFishingSignatureHash(record.Data);
    }

    private static string GetFishingSignatureHash(GatherItemData resource)
    {
        var signature = BuildFishingSignature(resource);
        using var sha1 = SHA1.Create();
        var digest = sha1.ComputeHash(Encoding.UTF8.GetBytes(signature));
        var builder = new StringBuilder(8);
        for (var index = 0; index < 4; index++)
            builder.Append(digest[index].ToString("x2"));
        return builder.ToString();
    }
}
