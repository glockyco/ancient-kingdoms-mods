using System.Collections.Generic;

namespace DataExporter.Models;

public class ScribingRecipeData
{
    public string id { get; set; }
    public string result_item_id { get; set; }
    public int level_required { get; set; }
    public List<ScribingMaterial> materials { get; set; } = new();
}

public class ScribingMaterial
{
    public string item_id { get; set; }
    public int amount { get; set; }
}
