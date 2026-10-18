using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class ScribingTableExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;

    public ScribingTableExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath) => _snapshot = snapshot;

    public override void Export() => WriteJson(_snapshot.Read<List<ScribingTableData>>("scribing_tables"), "scribing_tables.json");
}
