namespace DataExporter.Models;

public class ZoneBounds
{
    public float min_x { get; set; }
    public float max_x { get; set; }
    public float min_z { get; set; }
    public float max_z { get; set; }
}

public class ZoneData
{
    public string id { get; set; }
    public string name { get; set; }
    public int level_min { get; set; }
    public int level_max { get; set; }
    public ZoneBounds bounds { get; set; } = new();
}
