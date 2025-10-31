using System.Collections.Generic;

namespace DataExporter.Models;

public class QuestObjective
{
    public string type { get; set; }
    public string target_monster_id { get; set; }
    public string target_item_id { get; set; }
    public int amount { get; set; }
    public string zone_id { get; set; }
    public Position position { get; set; }
}

public class QuestRewardItem
{
    public string item_id { get; set; }
    public string class_specific { get; set; }
}

public class QuestRewards
{
    public int gold { get; set; }
    public int exp { get; set; }
    public List<QuestRewardItem> items { get; set; } = new();
}

public class QuestData
{
    public string id { get; set; }
    public string name { get; set; }
    public int level_required { get; set; }
    public int level_recommended { get; set; }
    public string start_npc_id { get; set; }
    public string end_npc_id { get; set; }
    public string predecessor_id { get; set; }
    public string type { get; set; }
    public bool is_main_quest { get; set; }
    public bool is_epic_quest { get; set; }
    public List<QuestObjective> objectives { get; set; } = new();
    public QuestRewards rewards { get; set; } = new();
    public string tooltip { get; set; }
    public string tooltip_complete { get; set; }
}
