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

        var type = Il2CppType.Of<Il2Cpp.Npc>();
        var npcs = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {npcs.Length} NPC objects total");

        var npcList = new List<NpcData>();
        var templateCount = 0;

        foreach (var obj in npcs)
        {
            var npc = obj.TryCast<Il2Cpp.Npc>();
            if (npc == null || string.IsNullOrEmpty(npc.name))
                continue;

            var isTemplate = npc.gameObject == null || !npc.gameObject.scene.IsValid();
            var zoneId = GetNpcZoneId(npc);

            if (isTemplate)
                templateCount++;

            var npcData = new NpcData
            {
                id = isTemplate
                    ? $"{npc.name.ToLowerInvariant().Replace(" ", "_")}_template"
                    : $"{npc.name.ToLowerInvariant().Replace(" ", "_")}_{zoneId}_{npc.GetInstanceID()}",
                name = npc.name,
                zone_id = zoneId,
                position = isTemplate
                    ? null
                    : new Position(
                        npc.transform.position.x,
                        npc.transform.position.y,
                        npc.transform.position.z
                    ),
                is_template = isTemplate,
                faction = npc.faction ?? "Neutral",
                race = npc.race ?? "Unknown",
                roles = new NpcRoles
                {
                    is_merchant = npc.trading != null && npc.trading.saleItems != null && npc.trading.saleItems.Length > 0,
                    is_quest_giver = npc.quests != null && npc.quests.quests != null && npc.quests.quests.Length > 0,
                    can_repair_equipment = npc.canRepairEquipment,
                    is_bank = npc.isBank,
                    is_skill_master = npc.isSkillMaster,
                    is_veteran_master = npc.isVeteranMaster,
                    is_reset_attributes = npc.isResetAttributes,
                    is_soul_binder = npc.isSoulBinder,
                    is_inkeeper = npc.isInkeeper,
                    is_taskgiver_adventurer = npc.isTaskgiverAdventurer,
                    is_merchant_adventurer = npc.isMerchantAdventurer,
                    is_recruiter_mercenaries = npc.isRecruiterMercenaries,
                    is_guard = npc.isGuard,
                    is_faction_vendor = npc.isFactionVendor,
                    is_essence_trader = npc.isEssenceTrader,
                    is_priestess = npc.isPriestess,
                    is_augmenter = npc.isAugmenter
                },
                respawn_dungeon_id = npc.respawnDungeonId,
                gold_required_respawn_dungeon = npc.goldRequiredRespawnDungeon,
                respawn_probability = npc.probabilityRespawn,
                can_hide_after_spawn = npc.canHideAfterSpawn,
                respawn_time = npc.respawnTime,

                // Interaction and behavior
                origin_follow_position = new Position(npc.originFollowPosition.x, npc.originFollowPosition.y, 0),
                follow_distance = npc.followDistance,
                flee_on_low_hp = npc.fleeOnLowHP,
                aggro_message_probability = npc.aggroMessageProbability
            };

            // Export welcome messages
            if (npc.welcomeMessages != null && npc.welcomeMessages.Count > 0)
            {
                foreach (var msg in npc.welcomeMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        npcData.welcome_messages.Add(msg);
                    }
                }
            }

            // Export shout messages
            if (npc.shoutMessages != null && npc.shoutMessages.Count > 0)
            {
                foreach (var msg in npc.shoutMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        npcData.shout_messages.Add(msg);
                    }
                }
            }

            // Export aggro messages
            if (npc.aggroMessages != null && npc.aggroMessages.Count > 0)
            {
                foreach (var msg in npc.aggroMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        npcData.aggro_messages.Add(msg);
                    }
                }
            }

            // Export quests offered
            if (npc.quests != null && npc.quests.quests != null)
            {
                foreach (var questOffer in npc.quests.quests)
                {
                    if (questOffer != null && questOffer.quest != null && !string.IsNullOrEmpty(questOffer.quest.name))
                    {
                        npcData.quests_offered.Add(questOffer.quest.name.ToLowerInvariant().Replace(" ", "_"));
                    }
                }
            }

            // Export items sold
            if (npc.trading != null && npc.trading.saleItems != null)
            {
                foreach (var item in npc.trading.saleItems)
                {
                    if (item != null)
                    {
                        npcData.items_sold.Add(new ItemSold
                        {
                            item_id = item.name.ToLowerInvariant().Replace(" ", "_"),
                            price = (int)item.buyPrice
                        });
                    }
                }
            }

            npcList.Add(npcData);
        }

        WriteJson(npcList, "npcs.json");
        Logger.Msg($"✓ Exported {npcList.Count} NPCs");
    }

    private string GetNpcZoneId(Il2Cpp.Npc npc)
    {
        return GetZoneIdFromByte((byte)npc.idZone);
    }

    private string GetZoneIdFromByte(byte zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey(zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return zone.name.ToLowerInvariant().Replace(" ", "_");
            }
        }

        return "unknown";
    }
}
