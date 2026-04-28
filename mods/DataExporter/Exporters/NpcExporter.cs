using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class NpcExporter : BaseExporter
{
    public NpcExporter(MelonLoader.MelonLogger.Instance logger, string exportPath, VisualAssetRegistry visualAssets) : base(logger, exportPath, visualAssets)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting NPCs...");

        var type = Il2CppType.Of<Il2Cpp.Npc>();
        var npcs = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {npcs.Length} NPC objects total");

        // Group NPCs by name to identify canonical entities
        var npcsByName = new Dictionary<string, List<Il2Cpp.Npc>>();
        var templateCount = 0;
        var spawnCount = 0;

        foreach (var obj in npcs)
        {
            var npc = obj.TryCast<Il2Cpp.Npc>();
            if (npc == null || string.IsNullOrEmpty(npc.name))
                continue;

            var sanitizedName = SanitizeId(npc.name);
            if (!npcsByName.ContainsKey(sanitizedName))
            {
                npcsByName[sanitizedName] = new List<Il2Cpp.Npc>();
            }
            npcsByName[sanitizedName].Add(npc);

            var isTemplate = npc.gameObject == null || !npc.gameObject.scene.IsValid();
            if (isTemplate)
                templateCount++;
            else
                spawnCount++;
        }

        Logger.Msg($"Found {npcsByName.Count} unique NPCs ({templateCount} templates, {spawnCount} spawns)");

        var npcList = new List<NpcData>();
        var spawnList = new List<NpcSpawnData>();

        // Process each NPC group
        foreach (var (name, group) in npcsByName)
        {
            // Find canonical NPC (prefer template)
            Il2Cpp.Npc canonical = group.FirstOrDefault(n => n.gameObject == null || !n.gameObject.scene.IsValid())
                                 ?? group.First();

            var npcData = new NpcData
            {
                // Identity
                id = name,  // canonical ID (sanitized name)
                name = canonical.name,
                faction = string.IsNullOrEmpty(canonical.faction) ? null : canonical.faction,
                race = canonical.race ?? "Unknown",

                // Roles and services
                roles = new NpcRoles
                {
                    is_merchant = canonical.trading != null && canonical.trading.saleItems != null && canonical.trading.saleItems.Length > 0,
                    is_quest_giver = canonical.quests != null && canonical.quests.quests != null && canonical.quests.quests.Length > 0,
                    can_repair_equipment = canonical.canRepairEquipment,
                    is_bank = canonical.isBank,
                    is_skill_master = canonical.isSkillMaster,
                    is_veteran_master = canonical.isVeteranMaster,
                    is_reset_attributes = canonical.isResetAttributes,
                    is_soul_binder = canonical.isSoulBinder,
                    is_inkeeper = canonical.isInkeeper,
                    is_taskgiver_adventurer = canonical.isTaskgiverAdventurer,
                    is_merchant_adventurer = canonical.isMerchantAdventurer,
                    is_recruiter_mercenaries = canonical.isRecruiterMercenaries,
                    is_guard = canonical.isGuard,
                    is_faction_vendor = canonical.isFactionVendor,
                    is_essence_trader = canonical.isEssenceTrader,
                    is_priestess = canonical.isPriestess,
                    is_augmenter = canonical.isAugmenter
                },

                // Base stats
                level = canonical.level?.current ?? 1,
                health = canonical.health?.max ?? 0,
                mana = canonical.mana?.max ?? 0,

                // Combat stats (calculated at base level)
                damage = canonical.combat?.damage ?? 0,
                magic_damage = canonical.combat?.magicDamage ?? 0,
                defense = canonical.combat?.defense ?? 0,
                magic_resist = canonical.combat?.magicResist ?? 0,
                poison_resist = canonical.combat?.poisonResist ?? 0,
                fire_resist = canonical.combat?.fireResist ?? 0,
                cold_resist = canonical.combat?.coldResist ?? 0,
                disease_resist = canonical.combat?.diseaseResist ?? 0,
                block_chance = canonical.combat?.blockChance ?? 0,
                critical_chance = canonical.combat?.criticalChance ?? 0,
                accuracy = canonical.combat?.accuracy ?? 0,

                // Stat scaling (LinearInt: actual = base + bonus_per_level * (level - 1))
                health_base = canonical.health?.baseHealth.baseValue ?? 0,
                health_per_level = canonical.health?.baseHealth.bonusPerLevel ?? 0,
                mana_base = canonical.mana?.baseMana.baseValue ?? 0,
                mana_per_level = canonical.mana?.baseMana.bonusPerLevel ?? 0,
                damage_base = canonical.combat?.baseDamage.baseValue ?? 0,
                damage_per_level = canonical.combat?.baseDamage.bonusPerLevel ?? 0,
                magic_damage_base = canonical.combat?.baseMagicDamage.baseValue ?? 0,
                magic_damage_per_level = canonical.combat?.baseMagicDamage.bonusPerLevel ?? 0,
                defense_base = canonical.combat?.baseDefense.baseValue ?? 0,
                defense_per_level = canonical.combat?.baseDefense.bonusPerLevel ?? 0,
                magic_resist_base = canonical.combat?.baseMagicResist.baseValue ?? 0,
                magic_resist_per_level = canonical.combat?.baseMagicResist.bonusPerLevel ?? 0,
                poison_resist_base = canonical.combat?.basePoisonResist.baseValue ?? 0,
                poison_resist_per_level = canonical.combat?.basePoisonResist.bonusPerLevel ?? 0,
                fire_resist_base = canonical.combat?.baseFireResist.baseValue ?? 0,
                fire_resist_per_level = canonical.combat?.baseFireResist.bonusPerLevel ?? 0,
                cold_resist_base = canonical.combat?.baseColdResist.baseValue ?? 0,
                cold_resist_per_level = canonical.combat?.baseColdResist.bonusPerLevel ?? 0,
                disease_resist_base = canonical.combat?.baseDiseaseResist.baseValue ?? 0,
                disease_resist_per_level = canonical.combat?.baseDiseaseResist.bonusPerLevel ?? 0,

                // Combat flags
                invincible = canonical.combat?.invincible ?? false,

                // Spawning and respawn
                respawn_dungeon_id = canonical.respawnDungeonId,
                gold_required_respawn_dungeon = canonical.goldRequiredRespawnDungeon,
                respawn_probability = canonical.probabilityRespawn,
                can_hide_after_spawn = canonical.canHideAfterSpawn,
                respawn_time = canonical.respawnTime,

                // Loot and rewards (when killed)
                gold_min = canonical.lootGoldMin,
                gold_max = canonical.lootGoldMax,
                probability_drop_gold = canonical.probabilityDropGold,

                // Combat flags
                see_invisibility = canonical.seeInvisibility,
                is_summonable = canonical.isSummonable,
                flee_on_low_hp = canonical.fleeOnLowHP,
                is_christmas_npc = canonical.isChristmasNPC,

                // Messages and interactions
                aggro_message_probability = canonical.aggroMessageProbability,
                summon_message = canonical.summonMessage
            };

            // Export welcome messages
            if (canonical.welcomeMessages != null && canonical.welcomeMessages.Count > 0)
            {
                foreach (var msg in canonical.welcomeMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        npcData.welcome_messages.Add(msg);
                    }
                }
            }

            // Export shout messages
            if (canonical.shoutMessages != null && canonical.shoutMessages.Count > 0)
            {
                foreach (var msg in canonical.shoutMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        npcData.shout_messages.Add(msg);
                    }
                }
            }

            // Export aggro messages
            if (canonical.aggroMessages != null && canonical.aggroMessages.Count > 0)
            {
                foreach (var msg in canonical.aggroMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        npcData.aggro_messages.Add(msg);
                    }
                }
            }

            // Export quests offered
            if (canonical.quests != null && canonical.quests.quests != null)
            {
                foreach (var questOffer in canonical.quests.quests)
                {
                    if (questOffer != null && questOffer.quest != null && !string.IsNullOrEmpty(questOffer.quest.name))
                    {
                        npcData.quests_offered.Add(SanitizeId(questOffer.quest.name));
                    }
                }
            }

            // Export items sold
            if (canonical.trading != null && canonical.trading.saleItems != null)
            {
                foreach (var item in canonical.trading.saleItems)
                {
                    if (item != null)
                    {
                        npcData.items_sold.Add(new ItemSold
                        {
                            item_id = SanitizeId(item.name),
                            price = (int)item.buyPrice,
                            currency_item_id = item.buyToken != null && !string.IsNullOrEmpty(item.buyToken.name)
                                ? SanitizeId(item.buyToken.name)
                                : null
                        });
                    }
                }
            }

            // Export item drops (when NPC is killed)
            if (canonical.dropChances != null && canonical.dropChances.Count > 0)
            {
                foreach (var drop in canonical.dropChances)
                {
                    if (drop.item != null)
                    {
                        npcData.drops.Add(new ItemDrop
                        {
                            item_id = SanitizeId(drop.item.name),
                            rate = drop.probability
                        });
                    }
                }
            }

            // Export faction changes (when NPC is killed)
            if (canonical.improveFaction != null)
            {
                foreach (var faction in canonical.improveFaction)
                {
                    if (!string.IsNullOrEmpty(faction))
                    {
                        npcData.improve_faction.Add(faction);
                    }
                }
            }
            if (canonical.decreaseFaction != null)
            {
                foreach (var faction in canonical.decreaseFaction)
                {
                    if (!string.IsNullOrEmpty(faction))
                    {
                        npcData.decrease_faction.Add(faction);
                    }
                }
            }

            // Export skill IDs (for guards and hostile NPCs)
            if (canonical.skills != null && canonical.skills.skillTemplates != null)
            {
                foreach (var skillTemplate in canonical.skills.skillTemplates)
                {
                    if (skillTemplate != null && !string.IsNullOrEmpty(skillTemplate.name))
                    {
                        npcData.skill_ids.Add(SanitizeId(skillTemplate.name));
                    }
                }
            }

            var visualSource = group.FirstOrDefault(n => n.gameObject != null && n.gameObject.scene.IsValid())
                            ?? canonical;

            var compositeRenderers = SelectPrimaryNpcRenderers(visualSource);
            var compositeAsset = VisualAssets?.ExportComposite(
                "npc",
                name,
                "primary",
                "Npc.gameObject.Front.SpriteRenderers",
                compositeRenderers);

            if (compositeAsset == null)
            {
                var primaryRenderer = canonical.gameObject != null
                    ? canonical.gameObject.GetComponent<SpriteRenderer>()
                    : visualSource.gameObject?.GetComponent<SpriteRenderer>();

                VisualAssets?.ExportRendererSprite(
                    "npc",
                    name,
                    "primary",
                    "Npc.gameObject.SpriteRenderer",
                    primaryRenderer);
            }

            npcList.Add(npcData);

            // Export spawn points for all instances (excluding templates)
            foreach (var npc in group)
            {
                var isTemplate = npc.gameObject == null || !npc.gameObject.scene.IsValid();
                if (isTemplate)
                    continue;  // Skip templates - they don't have spawn locations

                var zoneInfo = GetZoneInfoFromPosition(npc.transform.position);
                var spawnData = new NpcSpawnData
                {
                    id = $"{name}_{zoneInfo.ZoneId}_{npc.GetInstanceID()}",
                    npc_id = name,  // reference to canonical NPC
                    zone_id = zoneInfo.ZoneId,
                    sub_zone_id = zoneInfo.SubZoneId,
                    position = new Position(
                        npc.transform.position.x,
                        npc.transform.position.y,
                        npc.transform.position.z
                    ),
                    origin_follow_position = new Position(
                        npc.originFollowPosition.x,
                        npc.originFollowPosition.y,
                        0
                    ),
                    follow_distance = npc.followDistance,
                    move_distance = npc.moveDistance,
                    move_probability = npc.moveProbability
                };

                // Export patrol waypoints for this spawn
                if (npc.waypointsPatrol != null && npc.waypointsPatrol.Length > 0)
                {
                    foreach (var waypoint in npc.waypointsPatrol)
                    {
                        spawnData.patrol_waypoints.Add(new Position(waypoint.x, waypoint.y, 0));
                    }
                }

                // Export teleport data for this spawn
                if (npc.teleport != null && npc.teleport.destinationPosition != UnityEngine.Vector2.zero)
                {
                    var destPos = npc.teleport.destinationPosition;
                    var teleportZoneInfo = GetZoneInfoFromPosition(new Vector3(destPos.x, destPos.y, 0));
                    if (teleportZoneInfo.ZoneId != "unknown")
                    {
                        spawnData.teleport_zone_id = teleportZoneInfo.ZoneId;
                        spawnData.teleport_destination = new Position(destPos.x, destPos.y, 0);
                        spawnData.teleport_price = npc.teleport.priceTravel;
                        spawnData.teleport_message = string.IsNullOrEmpty(npc.teleport.messageText)
                            ? null
                            : npc.teleport.messageText;
                    }
                }

                spawnList.Add(spawnData);
            }
        }

        WriteJson(npcList, "npcs.json");
        WriteJson(spawnList, "npc_spawns.json");
        Logger.Msg($"✓ Exported {npcList.Count} canonical NPCs and {spawnList.Count} spawn points");
    }

    private static List<SpriteRenderer> SelectPrimaryNpcRenderers(Il2Cpp.Npc npc)
    {
        var selected = new List<SpriteRenderer>();
        if (npc?.gameObject == null)
            return selected;

        var npcRoot = npc.gameObject.transform;
        var front = FindDirectChild(npcRoot, "Front");
        var searchRoot = front ?? npcRoot;
        var isFrontSubtree = front != null;

        var renderers = searchRoot.GetComponentsInChildren<SpriteRenderer>(true);
        foreach (var renderer in renderers)
        {
            if (renderer == null || renderer.sprite == null)
                continue;

            var relativePath = GetRelativePath(renderer.transform, npcRoot);
            if (IsExcludedRendererPath(relativePath))
                continue;

            if (!isFrontSubtree && !renderer.gameObject.activeInHierarchy)
                continue;

            selected.Add(renderer);
        }

        return selected
            .OrderBy(renderer => SortingLayer.GetLayerValueFromID(renderer.sortingLayerID))
            .ThenBy(renderer => renderer.sortingOrder)
            .ThenBy(renderer => GetDepth(renderer.transform, searchRoot))
            .ThenBy(renderer => GetRelativePath(renderer.transform, npcRoot), StringComparer.Ordinal)
            .ToList();
    }

    private static Transform FindDirectChild(Transform parent, string childName)
    {
        for (var i = 0; i < parent.childCount; i++)
        {
            var child = parent.GetChild(i);
            if (child.name == childName)
                return child;
        }

        return null;
    }

    private static int GetDepth(Transform transform, Transform stopParent)
    {
        var depth = 0;
        while (transform != null && transform != stopParent)
        {
            depth++;
            transform = transform.parent;
        }

        return depth;
    }

    private static string GetRelativePath(Transform transform, Transform stopParent)
    {
        var names = new List<string>();
        while (transform != null && transform != stopParent)
        {
            names.Add(transform.name);
            transform = transform.parent;
        }

        names.Reverse();
        return string.Join("/", names);
    }

    private static bool IsExcludedRendererPath(string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath))
            return false;

        var segments = relativePath.Split('/');
        foreach (var segment in segments)
        {
            var normalized = segment.ToLowerInvariant().Replace(" ", "").Replace("_", "").Replace("-", "");
            if (normalized.Contains("speechbubble") ||
                normalized.Contains("hp") ||
                normalized.Contains("health") ||
                normalized.Contains("hitbar") ||
                normalized.Contains("bar") ||
                normalized.Contains("label") ||
                normalized.Contains("minimap") ||
                normalized.Contains("shadow") ||
                normalized.Contains("name") ||
                normalized.Contains("grid") ||
                normalized.Contains("background"))
            {
                return true;
            }
        }

        return false;
    }
}
