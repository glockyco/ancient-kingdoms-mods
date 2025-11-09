using System.Collections.Generic;

namespace DataExporter.Models;

public class SummonTriggerData
{
    public string id { get; set; }
    public string summoned_entity_type { get; set; }  // "Monster" or "Npc"
    public string summoned_entity_id { get; set; }
    public string summoned_entity_name { get; set; }
    public string summon_message { get; set; }
    public Position spawn_position { get; set; }
    public string zone_id { get; set; }
    public List<string> placeholder_monster_ids { get; set; } = new();
}