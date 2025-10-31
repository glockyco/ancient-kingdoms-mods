using System.Collections.Generic;

namespace DataExporter.Models;

public class GatherItemData
{
    public string id { get; set; }
    public string name { get; set; }
    public int level { get; set; }
    public Position position { get; set; }
    public string zone_id { get; set; }
    public double respawn_time { get; set; }
    public string item_reward_id { get; set; }
    public int item_reward_amount { get; set; }
    public int gold_min { get; set; }
    public int gold_max { get; set; }
    public bool is_plant { get; set; }
    public bool is_mineral { get; set; }
    public bool is_chest { get; set; }
    public bool is_radiant_spark { get; set; }
    public string tool_required_id { get; set; }
    public List<ItemDrop> random_drops { get; set; } = new();
}
