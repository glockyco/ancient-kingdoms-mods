using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class ScribingRecipeExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;

    public ScribingRecipeExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath) => _snapshot = snapshot;

    public override void Export() => WriteJson(_snapshot.Read<List<ScribingRecipeData>>("scribing_recipes"), "scribing_recipes.json");
}
