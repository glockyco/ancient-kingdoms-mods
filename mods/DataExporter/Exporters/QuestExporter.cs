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

        var type = IL2CPPType.Of<Il2Cpp.ScriptableQuest>();
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
                tooltip = quest.ToolTip(null, null) ?? "",
                tooltip_complete = quest.ToolTipComplete(null, null) ?? ""
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
}
