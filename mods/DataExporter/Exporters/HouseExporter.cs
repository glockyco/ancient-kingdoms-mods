using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class HouseExporter : BaseExporter
{
    public HouseExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting houses...");

        var type = Il2CppType.Of<Il2Cpp.Housing>();
        var objects = Resources.FindObjectsOfTypeAll(type);
        Logger.Msg($"Found {objects.Length} house objects total");

        var houses = new List<HouseData>();

        foreach (var obj in objects)
        {
            var house = obj.TryCast<Il2Cpp.Housing>();
            if (house == null)
                continue;

            var isTemplate = house.gameObject == null || !house.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(house.transform.position);
            var name = string.IsNullOrEmpty(house.description_house)
                ? house.idHouse
                : house.description_house;

            houses.Add(new HouseData
            {
                id = SanitizeId(house.idHouse),
                name = name,
                description = house.description_house,
                base_price = house.price_house,
                faction_id = house.faction_house,
                faction_required = house.faction_needed,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    house.transform.position.x,
                    house.transform.position.y,
                    house.transform.position.z
                )
            });
        }

        WriteJson(houses, "houses.json");
        Logger.Msg($"✓ Exported {houses.Count} houses");
    }
}
