using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class AlchemyTableExporter : BaseExporter
{
    public AlchemyTableExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting alchemy tables...");

        var type = Il2CppType.Of<Il2Cpp.Table>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} alchemy table objects total");

        var tables = new List<AlchemyTableData>();

        foreach (var obj in objects)
        {
            var table = obj.TryCast<Il2Cpp.Table>();
            if (table == null)
                continue;

            var isTemplate = table.gameObject == null || !table.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(table.transform.position);

            var name = table.nameOverlay != null && !string.IsNullOrEmpty(table.nameOverlay.text)
                ? table.nameOverlay.text
                : table.name;

            var data = new AlchemyTableData
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

        WriteJson(tables, "alchemy_tables.json");
        Logger.Msg($"✓ Exported {tables.Count} alchemy tables");
    }
}
