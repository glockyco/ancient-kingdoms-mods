using System.Collections.Generic;

namespace DataExporter.Models;

public class GameConfigData
{
    public List<string> bestiary_monsters { get; set; } = new();
    public List<string> mounts { get; set; } = new();
    public SeasonalItemsData seasonal_items { get; set; } = new();
    public SpecialItemsData special_items { get; set; } = new();
}

public class SeasonalItemsData
{
    public List<string> halloween { get; set; } = new();
    public List<string> christmas { get; set; } = new();
}

public class SpecialItemsData
{
    public string gold_item { get; set; }
    public string primal_essence { get; set; }
    public string blessed_rune { get; set; }
    public string redemption_token { get; set; }
    public string max_level_reward { get; set; }
    public string food_burned { get; set; }
}
