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
    public string placeholder_monster_id { get; set; }
    public int gold_min { get; set; }
    public int gold_max { get; set; }
    public float exp_multiplier { get; set; }
    public List<ItemDrop> drops { get; set; } = new();

    // Movement and patrol
    public float move_probability { get; set; }
    public float move_distance { get; set; }
    public bool is_patrolling { get; set; }
    public List<Position> patrol_waypoints { get; set; } = new();

    // Behavior flags
    public bool yell_friends { get; set; }
    public bool flee_on_low_hp { get; set; }
    public bool no_aggro_monster { get; set; }

    // Aggro messages
    public List<string> aggro_messages { get; set; } = new();
    public float aggro_message_probability { get; set; }

    // Faction changes
    public List<string> improve_faction { get; set; } = new();
    public List<string> decrease_faction { get; set; } = new();
}
