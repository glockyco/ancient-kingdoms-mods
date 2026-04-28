namespace DataExporter.Models;

public class VisualAssetData
{
    public string domain { get; set; }
    public string entity_id { get; set; }
    public string kind { get; set; }
    public string export_path { get; set; }
    public string source_field { get; set; }
    public string source_type { get; set; }
    public string source_name { get; set; }
    public string sprite_name { get; set; }
    public string texture_name { get; set; }
    public int width { get; set; }
    public int height { get; set; }
}
