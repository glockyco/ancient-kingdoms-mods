using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class AlchemyRecipeExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;

    public AlchemyRecipeExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath) => _snapshot = snapshot;

    public override void Export() => WriteJson(_snapshot.Read<List<AlchemyRecipeData>>("alchemy_recipes"), "alchemy_recipes.json");
}
