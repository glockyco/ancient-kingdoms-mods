using System.Collections.Generic;

namespace DataExporter.Models;

public class LuckTokenData
{
    public string zone_id { get; set; }
    public string zone_name { get; set; }
    public string boss_luck_token_id { get; set; }
    public string fragment_token_id { get; set; }
    public int fragment_amount_needed { get; set; }
    public float boss_luck_bonus { get; set; } = 0.05f;  // Legacy denormalized field kept for fatecharm relationship wiring
    public float fragment_drop_chance { get; set; } = 0.03f;  // Current Monster.cs logic: Random.value > 0.97 => 3%
}
