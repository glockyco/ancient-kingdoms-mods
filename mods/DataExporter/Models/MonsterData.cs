using System.Collections.Generic;

namespace DataExporter.Models;

public class ItemDrop
{
    public string item_id { get; set; }
    public float rate { get; set; }
}

public class MonsterData
{
    public string id { get; set; }
    public string name { get; set; }
    public string zone_id { get; set; }
    public Position position { get; set; }
    public int level { get; set; }
    public int health { get; set; }
    public string type { get; set; }
    public string @class { get; set; }
    public bool is_boss { get; set; }
    public bool is_elite { get; set; }
    public bool is_hunt { get; set; }
    public int respawn_time { get; set; }
    public int gold_min { get; set; }
    public int gold_max { get; set; }
    public float exp_multiplier { get; set; }
    public List<ItemDrop> drops { get; set; } = new();
}
