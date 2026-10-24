using System.Collections.Generic;

namespace DataExporter.Models;

public class LuckTokenData
{
    public string zone_id { get; set; }
    public string zone_name { get; set; }
    public string boss_luck_token_id { get; set; }
    public string fragment_token_id { get; set; }
    public int fragment_amount_needed { get; set; }
}
