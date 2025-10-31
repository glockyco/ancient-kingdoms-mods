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

        var type = Il2CppType.Of<Il2Cpp.ScriptableQuest>();
        var quests = Resources.FindObjectsOfTypeAll(type);

        var questList = new List<QuestData>();

        foreach (var obj in quests)
        {
            var quest = obj.TryCast<Il2Cpp.ScriptableQuest>();
            if (quest == null || string.IsNullOrEmpty(quest.name))
                continue;

            var questData = new QuestData
            {
                id = quest.name.ToLowerInvariant().Replace(" ", "_"),
                name = quest.nameQuest ?? quest.name,
                level_required = quest.requiredLevel,
                level_recommended = quest.recommendedLevel,
                start_npc_id = quest.startQuestNPC != null ? quest.startQuestNPC.name.ToLowerInvariant().Replace(" ", "_") : "",
                end_npc_id = quest.finishQuestNPC != null ? quest.finishQuestNPC.name.ToLowerInvariant().Replace(" ", "_") : "",
                predecessor_id = quest.predecessor != null && quest.predecessor.Length > 0 && quest.predecessor[0] != null
                    ? quest.predecessor[0].name.ToLowerInvariant().Replace(" ", "_")
                    : "",
                type = DetermineQuestType(quest),
                is_main_quest = quest.mainQuest,
                is_epic_quest = quest.epicQuest,
                tooltip = "",  // Skip tooltip for now - requires Player and Quest instances
                tooltip_complete = ""  // Skip tooltip for now - requires Player and Quest instances
            };

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
                    item_id = quest.rewardItem.name.ToLowerInvariant().Replace(" ", "_"),
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
                item_id = item.name.ToLowerInvariant().Replace(" ", "_"),
                class_specific = className
            });
        }
    }

    private string DetermineQuestType(Il2Cpp.ScriptableQuest quest)
    {
        var typeName = quest.GetIl2CppType().Name;

        if (typeName.Contains("Kill"))
            return "kill";
        if (typeName.Contains("Gather"))
            return "gather";
        if (typeName.Contains("Location"))
            return "location";

        return "general";
    }

    private string GetZoneIdFromByte(byte idZone)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey(idZone))
        {
            var zone = Il2Cpp.ZoneInfo.zones[idZone];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return zone.name.ToLowerInvariant().Replace(" ", "_");
            }
        }
        return "unknown";
    }
}
