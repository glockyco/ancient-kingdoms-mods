using System;
using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class FishExporter : BaseExporter
{
    public FishExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting fish...");

        var fishById = new Dictionary<string, FishData>();

        var journal = Il2Cpp.UIJournal.singleton;
        if (journal == null || journal.fish == null || journal.fish.Count == 0)
            throw new InvalidOperationException("UIJournal fish list is unavailable; cannot export Fishing profession data.");

        foreach (var fish in journal.fish)
        {
            if (fish == null) continue;
            var id = SanitizeId(fish.name);
            fishById[id] = new FishData { item_id = id, is_trash = false };
        }

        var manager = Il2Cpp.GameManager.singleton;
        if (manager == null || manager.randomTrashFish == null)
            throw new InvalidOperationException("GameManager randomTrashFish list is unavailable; cannot export Fishing trash pool.");

        foreach (var fish in manager.randomTrashFish)
        {
            if (fish == null) continue;
            var id = SanitizeId(fish.name);
            fishById[id] = new FishData { item_id = id, is_trash = true };
        }

        WriteJson(new List<FishData>(fishById.Values), "fish.json");
        Logger.Msg($"✓ Exported {fishById.Count} fish");
    }
}
