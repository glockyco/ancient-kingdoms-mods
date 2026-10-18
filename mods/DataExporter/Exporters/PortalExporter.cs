using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class PortalExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;

    public PortalExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath) => _snapshot = snapshot;

    public override void Export() => WriteJson(_snapshot.Read<List<PortalData>>("portals"), "portals.json");
}
