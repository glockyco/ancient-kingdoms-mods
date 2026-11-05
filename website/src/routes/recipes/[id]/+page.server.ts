import { getDb } from "$lib/db.server";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type { RecipeDetailPageData } from "$lib/types/recipes";
import {
  getRecipeDefinitions,
  buildRecipeObtainabilityTree,
} from "$lib/server/obtainability";
import { recipeDescription } from "$lib/server/meta-description";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = getDb();

  return db
    .prepare(
      "SELECT id FROM crafting_recipes UNION SELECT id FROM alchemy_recipes UNION SELECT id FROM scribing_recipes",
    )
    .all() as { id: string }[];
};

export const load: PageServerLoad = async ({
  params,
}): Promise<RecipeDetailPageData> => {
  const db = getDb();

  const definitions = await getRecipeDefinitions(db, [params.id]);
  if (!definitions.length) throw error(404, `Recipe not found: ${params.id}`);
  const definition = definitions[0];
  // Omit method internals and materials from the page payload.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { method, method_id, materials, providers, ...recipe } = definition;
  const obtainabilityTree = await buildRecipeObtainabilityTree(db, definition);
  const description = recipeDescription(
    {
      result_item_name: recipe.result_item_name,
      type: recipe.type,
      result_amount: recipe.result_amount,
      station_type: recipe.station_type,
      xp: recipe.xp,
      tier: recipe.type === "Scribing" ? null : recipe.tier,
      level_required:
        recipe.type === "Alchemy" || recipe.type === "Scribing"
          ? recipe.tier
          : null,
    },
    definitions[0].materials,
  );
  return {
    recipe,
    obtainabilityTree,
    providers: providers.map(({ id, name }) => ({ id, name })),
    description,
  };
};
