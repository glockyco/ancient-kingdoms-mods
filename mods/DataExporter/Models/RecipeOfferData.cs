#nullable enable

using System.Collections.Generic;

namespace DataExporter.Models;

public sealed class RecipeOfferData
{
    public RecipeOfferData(string definition_key)
    {
        this.definition_key = definition_key;
    }

    public string definition_key { get; set; }
    public int offer_index { get; set; }
}

public sealed class HousingCatalogData
{
    public HousingCatalogData(string item_id)
    {
        this.item_id = item_id;
    }

    public string item_id { get; set; }
    public List<HomeWorkstationData> workstations { get; set; } = new();
}

public sealed class HomeWorkstationData
{
    public HomeWorkstationData(string component_path, string kind)
    {
        this.component_path = component_path;
        this.kind = kind;
    }

    public string component_path { get; set; }
    public string kind { get; set; }
    public List<RecipeOfferData> recipe_offers { get; set; } = new();
}
