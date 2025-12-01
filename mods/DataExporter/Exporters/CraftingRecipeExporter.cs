using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class CraftingRecipeExporter : BaseExporter
{
    public CraftingRecipeExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting crafting recipes...");

        var type = Il2CppType.Of<Il2Cpp.CraftingStation>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} crafting station objects total");

        var recipes = new List<CraftingRecipeData>();
        var seenRecipes = new HashSet<string>();
        var totalCount = 0;

        foreach (var obj in objects)
        {
            var station = obj.TryCast<Il2Cpp.CraftingStation>();
            if (station == null)
                continue;

            if (station.itemsCrafting == null || station.itemsCrafting.Count == 0)
                continue;

            var stationType = DetermineStationType(station);

            foreach (var craftingItem in station.itemsCrafting)
            {
                if (craftingItem == null || craftingItem.itemResult == null)
                    continue;

                totalCount++;
                var resultId = SanitizeId(craftingItem.itemResult.name);

                var recipe = new CraftingRecipeData
                {
                    id = resultId,
                    result_item_id = resultId,
                    result_amount = 1,
                    materials = new List<CraftingMaterial>(),
                    station_type = stationType
                };

                if (craftingItem.materials != null && craftingItem.materials.Length > 0)
                {
                    foreach (var material in craftingItem.materials)
                    {
                        if (material.item == null)
                            continue;

                        recipe.materials.Add(new CraftingMaterial
                        {
                            item_id = SanitizeId(material.item.name),
                            amount = material.amount
                        });
                    }
                }

                var recipeHash = $"{resultId}|{stationType}|{string.Join(",", recipe.materials.Select(m => $"{m.item_id}:{m.amount}"))}";

                if (!seenRecipes.Contains(recipeHash))
                {
                    seenRecipes.Add(recipeHash);
                    recipes.Add(recipe);
                }
            }
        }

        WriteJson(recipes, "crafting_recipes.json");
        Logger.Msg($"✓ Exported {recipes.Count} unique crafting recipes (deduplicated from {totalCount} total)");
    }

    private string DetermineStationType(Il2Cpp.CraftingStation station)
    {
        if (station.isCookingOven)
        {
            return "cooking";
        }

        return "unknown";
    }
}
