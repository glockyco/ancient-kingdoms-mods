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
}

public class CraftingMaterial
{
    public string item_id { get; set; }
    public int amount { get; set; }
}
