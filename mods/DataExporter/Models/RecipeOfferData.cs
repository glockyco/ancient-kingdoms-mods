using System.Collections.Generic;

namespace DataExporter.Models;

public sealed class RecipeOfferData
{
    public string definition_key { get; set; }
    public int offer_index { get; set; }
}

public sealed class HousingCatalogData
{
    public string item_id { get; set; }
    public List<HomeWorkstationData> workstations { get; set; } = new();
}

public sealed class HomeWorkstationData
{
    public string component_path { get; set; }
    public string kind { get; set; }
    public List<RecipeOfferData> recipe_offers { get; set; } = new();
}
