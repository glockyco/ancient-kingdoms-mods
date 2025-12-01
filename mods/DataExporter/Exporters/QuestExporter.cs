using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class QuestExporter : BaseExporter
{
    public QuestExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting quests...");

        // Find QuestLocation scene triggers (GameObjects tagged "QuestLocation")
        // These triggers complete location quests when the player enters them
        // The trigger's name matches the quest ID it completes
        var questLocationTriggers = BuildQuestLocationTriggerMap();
        Logger.Msg($"Found {questLocationTriggers.Count} QuestLocation triggers in scene");

        var type = Il2CppType.Of<Il2Cpp.ScriptableQuest>();
        var quests = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {quests.Length} quest objects total");

        var questList = new List<QuestData>();

        foreach (var obj in quests)
        {
            var quest = obj.TryCast<Il2Cpp.ScriptableQuest>();
            if (quest == null || string.IsNullOrEmpty(quest.name))
                continue;

            var questData = new QuestData
            {
                id = SanitizeId(quest.name),
                name = quest.nameQuest ?? quest.name,
                quest_type = DetermineQuestType(quest),
                level_required = quest.requiredLevel,
                level_recommended = quest.recommendedLevel,
                start_npc_id = quest.startQuestNPC != null ? SanitizeId(quest.startQuestNPC.name) : null,
                end_npc_id = quest.finishQuestNPC != null ? SanitizeId(quest.finishQuestNPC.name) : null,
                zone_id_final_npc = quest.idZoneFinalNPC,
                zone_id_quest_action = quest.idZoneQuestAction,
                given_item_on_start_id = quest.givenItemOnStartQuest != null ? SanitizeId(quest.givenItemOnStartQuest.name) : null,
                is_main_quest = quest.mainQuest,
                is_epic_quest = quest.epicQuest,
                is_adventurer_quest = quest.adventurerQuest,
                tooltip = quest.toolTip ?? "",
                tooltip_complete = quest.toolTipComplete ?? ""
            };

            // Add predecessor quest IDs
            if (quest.predecessor != null)
            {
                foreach (var pred in quest.predecessor)
                {
                    if (pred != null && !string.IsNullOrEmpty(pred.name))
                    {
                        questData.predecessor_ids.Add(SanitizeId(pred.name));
                    }
                }
            }

            // Add race requirements
            if (quest.raceRequirements != null)
            {
                foreach (var race in quest.raceRequirements)
                {
                    if (!string.IsNullOrEmpty(race))
                    {
                        questData.race_requirements.Add(race);
                    }
                }
            }

            // Add class requirements
            if (quest.classRequirements != null)
            {
                foreach (var className in quest.classRequirements)
                {
                    if (!string.IsNullOrEmpty(className))
                    {
                        questData.class_requirements.Add(className);
                    }
                }
            }

            // Add finish quest locations
            if (quest.finishQuestLocation != null)
            {
                foreach (var loc in quest.finishQuestLocation)
                {
                    if (loc != null)
                    {
                        questData.finish_quest_locations.Add(new QuestLocation
                        {
                            zone_id = loc.idZone,
                            position = new Position(loc.location.x, loc.location.y, loc.location.z)
                        });
                    }
                }
            }

            // Add faction requirements
            if (quest.factionsRequirements != null)
            {
                foreach (var factionReq in quest.factionsRequirements)
                {
                    if (factionReq != null && !string.IsNullOrEmpty(factionReq.faction))
                    {
                        questData.faction_requirements.Add(new FactionRequirement
                        {
                            faction = factionReq.faction,
                            faction_value = factionReq.factionValue
                        });
                    }
                }
            }

            // Set rewards
            questData.rewards = new QuestRewards
            {
                gold = (int)quest.rewardGold,
                exp = (int)quest.rewardExperience
            };

            // Add reward items
            if (quest.rewardItem != null)
            {
                questData.rewards.items.Add(new QuestRewardItem
                {
                    item_id = SanitizeId(quest.rewardItem.name),
                    class_specific = null
                });
            }

            // Class-specific rewards
            AddClassReward(questData, quest.rewardItemWarrior, "Warrior");
            AddClassReward(questData, quest.rewardItemCleric, "Cleric");
            AddClassReward(questData, quest.rewardItemRanger, "Ranger");
            AddClassReward(questData, quest.rewardItemRogue, "Rogue");
            AddClassReward(questData, quest.rewardItemWizard, "Wizard");
            AddClassReward(questData, quest.rewardItemDruid, "Druid");

            // Quest locations (objectives)
            if (quest.questLocation != null && quest.questLocation.Length > 0)
            {
                foreach (var loc in quest.questLocation)
                {
                    if (loc != null)
                    {
                        questData.objectives.Add(new QuestObjective
                        {
                            type = "location",
                            target_monster_id = null,
                            target_item_id = null,
                            amount = 1,
                            zone_id = GetZoneIdFromByte((byte)loc.idZone),
                            position = new Position(loc.location.x, loc.location.y, loc.location.z)
                        });
                    }
                }
            }

            // Populate quest type-specific fields
            PopulateKillQuestFields(quest, questData);
            PopulateGatherQuestFields(quest, questData);
            PopulateGatherInventoryQuestFields(quest, questData);
            PopulateLocationQuestFields(quest, questData, questLocationTriggers);
            PopulateEquipItemQuestFields(quest, questData);
            PopulateAlchemyQuestFields(quest, questData);

            questList.Add(questData);
        }

        WriteJson(questList, "quests.json");
        Logger.Msg($"✓ Exported {questList.Count} quests");
    }

    private void AddClassReward(QuestData questData, Il2Cpp.ScriptableItem item, string className)
    {
        if (item != null)
        {
            questData.rewards.items.Add(new QuestRewardItem
            {
                item_id = SanitizeId(item.name),
                class_specific = className
            });
        }
    }

    private string DetermineQuestType(Il2Cpp.ScriptableQuest quest)
    {
        if (quest.TryCast<Il2Cpp.AlchemyQuest>() != null)
            return "alchemy";
        if (quest.TryCast<Il2Cpp.EquipItemQuest>() != null)
            return "equip_item";
        if (quest.TryCast<Il2Cpp.LocationQuest>() != null)
            return "location";
        if (quest.TryCast<Il2Cpp.GatherInventoryQuest>() != null)
            return "gather_inventory";
        if (quest.TryCast<Il2Cpp.GatherQuest>() != null)
            return "gather";
        if (quest.TryCast<Il2Cpp.KillQuest>() != null)
            return "kill";

        return "general";
    }

    private void PopulateKillQuestFields(Il2Cpp.ScriptableQuest quest, QuestData questData)
    {
        var killQuest = quest.TryCast<Il2Cpp.KillQuest>();
        if (killQuest == null) return;

        if (killQuest.killTarget != null)
        {
            questData.kill_target_1_id = SanitizeId(killQuest.killTarget.name);
            questData.kill_amount_1 = killQuest.killAmount;
        }

        if (killQuest.killTarget2 != null)
        {
            questData.kill_target_2_id = SanitizeId(killQuest.killTarget2.name);
            questData.kill_amount_2 = killQuest.killAmount2;
        }
    }

    private void PopulateGatherQuestFields(Il2Cpp.ScriptableQuest quest, QuestData questData)
    {
        var gatherQuest = quest.TryCast<Il2Cpp.GatherQuest>();
        if (gatherQuest == null) return;

        if (gatherQuest.gatherItem != null)
        {
            questData.gather_item_1_id = SanitizeId(gatherQuest.gatherItem.name);
            questData.gather_amount_1 = gatherQuest.gatherAmount;
        }

        if (gatherQuest.gatherItem2 != null)
        {
            questData.gather_item_2_id = SanitizeId(gatherQuest.gatherItem2.name);
            questData.gather_amount_2 = gatherQuest.gatherAmount2;
        }

        if (gatherQuest.gatherItem3 != null)
        {
            questData.gather_item_3_id = SanitizeId(gatherQuest.gatherItem3.name);
            questData.gather_amount_3 = gatherQuest.gatherAmount3;
        }
    }

    private void PopulateGatherInventoryQuestFields(Il2Cpp.ScriptableQuest quest, QuestData questData)
    {
        var gatherInvQuest = quest.TryCast<Il2Cpp.GatherInventoryQuest>();
        if (gatherInvQuest == null) return;

        questData.remove_items_on_complete = gatherInvQuest.removeItemsOnComplete;

        if (gatherInvQuest.gatherItems != null)
        {
            questData.gather_items = new List<GatherItemAmount>();
            foreach (var item in gatherInvQuest.gatherItems)
            {
                if (item.item != null)
                {
                    questData.gather_items.Add(new GatherItemAmount
                    {
                        item_id = SanitizeId(item.item.name),
                        amount = item.amount
                    });
                }
            }
        }

        if (gatherInvQuest.requiredItems != null)
        {
            questData.required_items = new List<GatherItemAmount>();
            foreach (var item in gatherInvQuest.requiredItems)
            {
                if (item.item != null)
                {
                    questData.required_items.Add(new GatherItemAmount
                    {
                        item_id = SanitizeId(item.item.name),
                        amount = item.amount
                    });
                }
            }
        }
    }

    private void PopulateLocationQuestFields(Il2Cpp.ScriptableQuest quest, QuestData questData, Dictionary<string, ZoneInfo> questLocationTriggers)
    {
        var locationQuest = quest.TryCast<Il2Cpp.LocationQuest>();
        if (locationQuest == null) return;

        questData.tracking_quest_location = locationQuest.trackingQuestLocationString ?? "";
        questData.discovered_location = locationQuest.discoveredLocationString ?? "";
        questData.is_find_npc_quest = locationQuest.isFindNpcQuest;

        // Look up the zone from the QuestLocation trigger matching this quest's ID
        if (questLocationTriggers.TryGetValue(questData.id, out var zoneInfo))
        {
            questData.discovered_location_zone_id = zoneInfo.ZoneId;
            questData.discovered_location_sub_zone_id = zoneInfo.SubZoneId;
        }
    }

    /// <summary>
    /// Builds a map of quest IDs to their discovery zone info by finding all QuestLocation triggers in the scene.
    /// QuestLocation triggers are GameObjects tagged "QuestLocation" whose name matches the quest ID they complete.
    /// </summary>
    private Dictionary<string, ZoneInfo> BuildQuestLocationTriggerMap()
    {
        var map = new Dictionary<string, ZoneInfo>();

        var questLocationObjects = GameObject.FindGameObjectsWithTag("QuestLocation");
        foreach (var go in questLocationObjects)
        {
            if (go == null || !go.scene.IsValid())
                continue;

            var questId = SanitizeId(go.name);
            if (string.IsNullOrEmpty(questId))
                continue;

            var zoneInfo = GetZoneInfoFromPosition(go.transform.position);
            map[questId] = zoneInfo;

            Logger.Msg($"  QuestLocation trigger '{go.name}' -> zone: {zoneInfo.ZoneId}, sub-zone: {zoneInfo.SubZoneId}");
        }

        return map;
    }

    private void PopulateEquipItemQuestFields(Il2Cpp.ScriptableQuest quest, QuestData questData)
    {
        var equipItemQuest = quest.TryCast<Il2Cpp.EquipItemQuest>();
        if (equipItemQuest == null) return;

        if (equipItemQuest.equipItems != null)
        {
            questData.equip_items = new List<string>();
            foreach (var item in equipItemQuest.equipItems)
            {
                if (item != null)
                {
                    questData.equip_items.Add(SanitizeId(item.name));
                }
            }
        }
    }

    private void PopulateAlchemyQuestFields(Il2Cpp.ScriptableQuest quest, QuestData questData)
    {
        var alchemyQuest = quest.TryCast<Il2Cpp.AlchemyQuest>();
        if (alchemyQuest == null) return;

        if (alchemyQuest.potionItem != null)
        {
            questData.potion_item_id = SanitizeId(alchemyQuest.potionItem.name);
        }
        questData.potions_amount = alchemyQuest.potionsAmount;
        questData.increase_alchemy_skill = alchemyQuest.increaseAlchemySkill;
    }
}
