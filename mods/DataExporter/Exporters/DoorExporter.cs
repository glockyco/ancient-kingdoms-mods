using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class DoorExporter : BaseExporter
{
    public DoorExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting doors...");

        var type = Il2CppType.Of<Il2Cpp.Door>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} door objects total");

        var doors = new List<DoorData>();

        foreach (var obj in objects)
        {
            var door = obj.TryCast<Il2Cpp.Door>();
            if (door == null)
                continue;

            var isTemplate = door.gameObject == null || !door.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(door.transform.position);

            var data = new DoorData
            {
                id = $"door_{zoneInfo.ZoneId}_{door.GetInstanceID()}",
                name = door.name,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    door.transform.position.x,
                    door.transform.position.y,
                    door.transform.position.z
                )
            };

            doors.Add(data);
        }

        WriteJson(doors, "doors.json");
        Logger.Msg($"✓ Exported {doors.Count} doors");
    }
}
