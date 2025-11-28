/**
 * Ingredient in a recipe
 */
export interface RecipeIngredient {
  item_id: string;
  item_name: string;
  amount: number;
}

/**
 * Recipe list view for overview page
 */
export interface RecipeListView {
  id: string;
  result_item_id: string;
  result_item_name: string;
  result_tooltip_html: string | null;
  result_quality: number;
  result_amount: number;
  ingredients: RecipeIngredient[];
  type: "Alchemy" | "Cooking" | "Crafting";
  tier: number;
}

/**
 * Recipes overview page data
 */
export interface RecipesPageData {
  recipes: RecipeListView[];
}
