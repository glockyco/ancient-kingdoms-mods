using System.Collections.Generic;

namespace DataExporter.Models;

public class LuckTokenData
{
    public string zone_id { get; set; }
    public string zone_name { get; set; }
    public string boss_luck_token_id { get; set; }
    public string fragment_token_id { get; set; }
    public int fragment_amount_needed { get; set; }
    public float boss_luck_bonus { get; set; } = 0.05f;  // Always +5%
    public float fragment_drop_chance { get; set; } = 0.05f;  // Always 5% (v0.9.4.1)
}
