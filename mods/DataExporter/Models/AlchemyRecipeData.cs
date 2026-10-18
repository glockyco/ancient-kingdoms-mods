using System.Collections.Generic;

namespace DataExporter.Models;

public class AlchemyRecipeData
{
    public string id { get; set; }
    public string definition_key { get; set; }
    public int result_amount { get; set; } = 1;
    public string result_item_id { get; set; }
    public int level_required { get; set; }
    public int tier { get; set; }
    [Newtonsoft.Json.JsonProperty(NullValueHandling = Newtonsoft.Json.NullValueHandling.Include)]
    public int? experience { get; set; }
    public bool is_cooking_oven { get; set; }
    public bool is_scribing_table { get; set; }
    public List<AlchemyMaterial> materials { get; set; } = new();
}

public class AlchemyMaterial
{
    public string item_id { get; set; }
    public int amount { get; set; }
}
