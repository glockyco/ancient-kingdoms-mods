using System.Collections.Generic;

namespace DataExporter.Models;

public class CraftingRecipeData
{
    public string id { get; set; }
    public string definition_key { get; set; }
    public string result_item_id { get; set; }
    public int result_amount { get; set; }
    public int tier { get; set; }
    [Newtonsoft.Json.JsonProperty(NullValueHandling = Newtonsoft.Json.NullValueHandling.Include)]
    public int? experience { get; set; }
    public bool is_cooking_oven { get; set; }
    public bool is_scribing_table { get; set; }
    public List<CraftingMaterial> materials { get; set; } = new();
    public string station_type { get; set; }

    /// <summary>
    /// The quest a player must have completed to craft this recipe (CraftingItems.CanCraft), or null.
    /// The game also requires the quest's class requirement and, for an epic weapon quest, that its
    /// alternative ending was not chosen.
    /// </summary>
    [Newtonsoft.Json.JsonProperty(NullValueHandling = Newtonsoft.Json.NullValueHandling.Include)]
    public string required_quest_id { get; set; }
}

public class CraftingMaterial
{
    public string item_id { get; set; }
    public int amount { get; set; }
}
