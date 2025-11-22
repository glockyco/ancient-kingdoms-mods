using System.Collections.Generic;

namespace DataExporter.Models;

public class AlchemyRecipeData
{
    public string id { get; set; }
    public string result_item_id { get; set; }
    public int level_required { get; set; }
    public List<AlchemyMaterial> materials { get; set; } = new();
}

public class AlchemyMaterial
{
    public string item_id { get; set; }
    public int amount { get; set; }
}
