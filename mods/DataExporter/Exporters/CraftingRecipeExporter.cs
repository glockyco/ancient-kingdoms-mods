using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class CraftingRecipeExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;

    public CraftingRecipeExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath) => _snapshot = snapshot;

    public override void Export() => WriteJson(_snapshot.Read<List<CraftingRecipeData>>("crafting_recipes"), "crafting_recipes.json");
}
