using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class ScribingRecipeExporter : BaseExporter
{
    public ScribingRecipeExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting scribing recipes...");

        var type = Il2CppType.Of<Il2Cpp.Table>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} table objects total");

        var recipes = new List<ScribingRecipeData>();
        var seenRecipes = new HashSet<string>();
        var totalCount = 0;

        foreach (var obj in objects)
        {
            var table = obj.TryCast<Il2Cpp.Table>();
            if (table == null)
                continue;

            if (!table.isScribingTable)
                continue;

            if (table.itemsTable == null || table.itemsTable.Count == 0)
                continue;

            foreach (var tableItem in table.itemsTable)
            {
                if (tableItem == null || tableItem.itemResult == null)
                    continue;

                totalCount++;
                var resultId = SanitizeId(tableItem.itemResult.name);

                var recipe = new ScribingRecipeData
                {
                    id = resultId,
                    result_item_id = resultId,
                    level_required = tableItem.level,
                    materials = new List<ScribingMaterial>()
                };

                if (tableItem.ingredients != null && tableItem.ingredients.Length > 0)
                {
                    foreach (var ingredient in tableItem.ingredients)
                    {
                        if (ingredient.item == null)
                            continue;

                        recipe.materials.Add(new ScribingMaterial
                        {
                            item_id = SanitizeId(ingredient.item.name),
                            amount = ingredient.amount
                        });
                    }
                }

                var recipeHash = $"{resultId}|{tableItem.level}|{string.Join(",", recipe.materials.Select(m => $"{m.item_id}:{m.amount}"))}";

                if (!seenRecipes.Contains(recipeHash))
                {
                    seenRecipes.Add(recipeHash);
                    recipes.Add(recipe);
                }
            }
        }

        WriteJson(recipes, "scribing_recipes.json");
        Logger.Msg($"✓ Exported {recipes.Count} unique scribing recipes (deduplicated from {totalCount} total)");
    }
}
