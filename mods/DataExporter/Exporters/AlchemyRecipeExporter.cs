using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class AlchemyRecipeExporter : BaseExporter
{
    public AlchemyRecipeExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting alchemy recipes...");

        var type = Il2CppType.Of<Il2Cpp.Table>();
        var objects = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {objects.Length} alchemy table objects total");

        var recipes = new List<AlchemyRecipeData>();
        var seenRecipes = new HashSet<string>();
        var recipeIdCounter = 0;

        foreach (var obj in objects)
        {
            var table = obj.TryCast<Il2Cpp.Table>();
            if (table == null)
                continue;

            if (table.itemsTable == null || table.itemsTable.Count == 0)
                continue;

            foreach (var tableItem in table.itemsTable)
            {
                if (tableItem == null || tableItem.itemResult == null)
                    continue;

                var resultId = SanitizeId(tableItem.itemResult.name);

                var recipe = new AlchemyRecipeData
                {
                    id = $"alchemy_recipe_{recipeIdCounter++}",
                    result_item_id = resultId,
                    level_required = tableItem.level,
                    materials = new List<AlchemyMaterial>()
                };

                if (tableItem.ingredients != null && tableItem.ingredients.Length > 0)
                {
                    foreach (var ingredient in tableItem.ingredients)
                    {
                        if (ingredient.item == null)
                            continue;

                        recipe.materials.Add(new AlchemyMaterial
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

        WriteJson(recipes, "alchemy_recipes.json");
        Logger.Msg($"✓ Exported {recipes.Count} unique alchemy recipes (deduplicated from {recipeIdCounter} total)");
    }
}
