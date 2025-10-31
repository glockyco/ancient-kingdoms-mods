using System.Collections.Generic;

namespace DataExporter.Models;

public class CraftingRecipeData
{
    public string id { get; set; }
    public string result_item_id { get; set; }
    public int result_amount { get; set; }
    public List<CraftingMaterial> materials { get; set; } = new();
    public string station_type { get; set; }
}

public class CraftingMaterial
{
    public string item_id { get; set; }
    public int amount { get; set; }
}
