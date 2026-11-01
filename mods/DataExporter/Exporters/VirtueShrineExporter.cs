using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class VirtueShrineExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;

    public VirtueShrineExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath) => _snapshot = snapshot;

    public override void Export() => WriteJson(_snapshot.Read<List<VirtueShrineData>>("virtue_shrines"), "virtue_shrines.json");
}
