using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class ScribingTableExporter : BaseExporter
{
    public ScribingTableExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting scribing tables...");

        var type = Il2CppType.Of<Il2Cpp.Table>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} table objects total");

        var tables = new List<ScribingTableData>();

        foreach (var obj in objects)
        {
            var table = obj.TryCast<Il2Cpp.Table>();
            if (table == null)
                continue;

            var isTemplate = table.gameObject == null || !table.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            if (!table.isScribingTable)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(table.transform.position);

            var name = table.nameOverlay != null && !string.IsNullOrEmpty(table.nameOverlay.text)
                ? table.nameOverlay.text
                : table.name;

            var data = new ScribingTableData
            {
                id = $"{SanitizeId(name)}_{zoneInfo.ZoneId}_{table.GetInstanceID()}",
                name = name,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    table.transform.position.x,
                    table.transform.position.y,
                    table.transform.position.z
                )
            };

            tables.Add(data);
        }

        WriteJson(tables, "scribing_tables.json");
        Logger.Msg($"✓ Exported {tables.Count} scribing tables");
    }
}
