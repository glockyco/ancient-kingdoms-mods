using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class CraftingStationExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;

    public CraftingStationExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath) => _snapshot = snapshot;

    public override void Export() => WriteJson(_snapshot.Read<List<CraftingStationData>>("crafting_stations"), "crafting_stations.json");
}
