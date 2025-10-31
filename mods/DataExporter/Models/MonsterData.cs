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
    public bool is_template { get; set; }
    public int level { get; set; }
    public int health { get; set; }
    public string typeName { get; set; }
    public string className { get; set; }
    public bool is_boss { get; set; }
    public bool is_elite { get; set; }
    public bool is_hunt { get; set; }
    public bool does_respawn { get; set; }
    public int respawn_time { get; set; }
    public float respawn_probability { get; set; }
    public int spawn_time_start { get; set; }
    public int spawn_time_end { get; set; }
    public float placeholder_spawn_probability { get; set; }
    public int gold_min { get; set; }
    public int gold_max { get; set; }
    public float exp_multiplier { get; set; }
    public List<ItemDrop> drops { get; set; } = new();
}
