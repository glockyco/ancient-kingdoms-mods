namespace DataExporter.Models;

public sealed class EquipmentSlotData
{
    public string owner_type { get; set; } = "";
    public string owner_id { get; set; } = "";
    public int slot_index { get; set; }
    public string accepted_category { get; set; } = "";
}
