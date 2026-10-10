using System;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class WorldMapExporter : BaseExporter
{
    public WorldMapExporter(MelonLogger.Instance logger, string exportPath, VisualAssetRegistry visualAssets)
        : base(logger, exportPath, visualAssets)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting world map...");

        Il2Cpp.UIMap map = null;
        foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.UIMap>()))
        {
            var candidate = obj.TryCast<Il2Cpp.UIMap>();
            if (candidate == null || candidate.gameObject == null || !candidate.gameObject.scene.IsValid())
                continue;

            if (map != null)
                throw new InvalidOperationException("Multiple live UIMap scene instances are available.");
            map = candidate;
        }

        if (map == null)
            throw new InvalidOperationException("A live UIMap scene instance is unavailable.");
        if (map.worldMap == null || map.worldMap.sprite == null)
            throw new InvalidOperationException("UIMap.worldMap.sprite is unavailable.");
        if (VisualAssets == null)
            throw new InvalidOperationException("The world map visual asset registry is unavailable.");

        var sprite = map.worldMap.sprite;
        VisualAssets.ExportSprite(
            "world",
            "eratiath",
            "map",
            "UIMap.worldMap.sprite",
            sprite.GetType().FullName,
            sprite.name,
            sprite);

        Logger.Msg("✓ Exported world/eratiath/map");
    }
}
