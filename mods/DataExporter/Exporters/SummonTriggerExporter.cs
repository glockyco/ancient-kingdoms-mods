using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class SummonTriggerExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;

    public SummonTriggerExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath) => _snapshot = snapshot;

    public override void Export() => WriteJson(_snapshot.Read<List<SummonTriggerData>>("summon_triggers"), "summon_triggers.json");
}
