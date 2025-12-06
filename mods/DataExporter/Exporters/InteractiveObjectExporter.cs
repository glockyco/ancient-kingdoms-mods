using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class InteractiveObjectExporter : BaseExporter
{
    public InteractiveObjectExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting interactive objects...");

        var type = Il2CppType.Of<Il2Cpp.InteractiveObject>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} interactive objects total");

        var interactiveObjects = new List<InteractiveObjectData>();

        foreach (var obj in objects)
        {
            var interactiveObj = obj.TryCast<Il2Cpp.InteractiveObject>();
            if (interactiveObj == null)
                continue;

            var isTemplate = interactiveObj.gameObject == null || !interactiveObj.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(interactiveObj.transform.position);

            var hasDestination = interactiveObj.destination != null;
            string destinationZoneId = null;
            Position destinationPosition = null;
            Position destinationOrientation = null;

            if (hasDestination)
            {
                destinationZoneId = GetZoneIdFromByte(interactiveObj.idZone);
                destinationPosition = new Position(
                    interactiveObj.destination.position.x,
                    interactiveObj.destination.position.y,
                    interactiveObj.destination.position.z
                );
                destinationOrientation = new Position(
                    interactiveObj.orientation.x,
                    interactiveObj.orientation.y,
                    0
                );
            }

            var data = new InteractiveObjectData
            {
                id = $"interactive_{zoneInfo.ZoneId}_{interactiveObj.GetInstanceID()}",
                name = interactiveObj.name,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    interactiveObj.transform.position.x,
                    interactiveObj.transform.position.y,
                    interactiveObj.transform.position.z
                ),
                message = !string.IsNullOrEmpty(interactiveObj.message) ? interactiveObj.message : null,
                has_destination = hasDestination,
                destination_zone_id = destinationZoneId,
                destination_position = destinationPosition,
                destination_orientation = destinationOrientation,
                required_item_id = interactiveObj.key != null ? SanitizeId(interactiveObj.key.name) : null
            };

            interactiveObjects.Add(data);
        }

        WriteJson(interactiveObjects, "interactive_objects.json");
        Logger.Msg($"✓ Exported {interactiveObjects.Count} interactive objects");
    }
}
