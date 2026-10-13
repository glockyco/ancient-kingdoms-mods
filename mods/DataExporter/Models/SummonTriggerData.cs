using System.Collections.Generic;
using Newtonsoft.Json;

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

    /// <summary>isSummonable of the placed Monster or Npc the trigger references. A trigger only
    /// counts a summonable entity as dead, so a false value means the trigger never summons it.</summary>
    public bool summoned_is_summonable { get; set; }

    /// <summary>respawnTime of the placed Monster or Npc, in seconds.</summary>
    public float summoned_respawn_time { get; set; }

    /// <summary>probabilityRespawn of the placed Monster or Npc.</summary>
    public float summoned_respawn_probability { get; set; }

    /// <summary>deathTime of the placed Monster, in seconds. Null for an Npc, whose corpse time is a
    /// code constant rather than a field.</summary>
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public float? summoned_death_time { get; set; }
}
