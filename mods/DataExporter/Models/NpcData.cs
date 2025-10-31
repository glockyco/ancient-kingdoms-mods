using System.Collections.Generic;

namespace DataExporter.Models;

public class NpcRoles
{
    public bool is_merchant { get; set; }
    public bool is_quest_giver { get; set; }
    public bool can_repair_equipment { get; set; }
    public bool is_bank { get; set; }
}

public class ItemSold
{
    public string item_id { get; set; }
    public int price { get; set; }
}

public class NpcData
{
    public string id { get; set; }
    public string name { get; set; }
    public string zone_id { get; set; }
    public Position position { get; set; }
    public string faction { get; set; }
    public string race { get; set; }
    public NpcRoles roles { get; set; } = new();
    public List<string> quests_offered { get; set; } = new();
    public List<ItemSold> items_sold { get; set; } = new();
}
