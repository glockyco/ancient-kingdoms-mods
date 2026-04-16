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
  result_quality: number;
  result_amount: number;
  ingredients: RecipeIngredient[];
  type: "Alchemy" | "Cooking" | "Crafting" | "Scribing";
  tier: number;
}

/**
 * Recipes overview page data
 */
export interface RecipesPageData {
  recipes: RecipeListView[];
}

// ============================================================================
// Recipe Detail Page Types
// ============================================================================

export type RecipeType = "Alchemy" | "Cooking" | "Crafting" | "Scribing";

/**
 * Types of sources where items can be obtained
 */
export type ObtainabilitySourceType =
  | "drop"
  | "vendor"
  | "quest"
  | "altar"
  | "recipe"
  | "gather"
  | "chest"
  | "pack"
  | "random"
  | "merge"
  | "treasure_map"
  | "special";

/**
 * Summary of a source for an item (for linking to source pages)
 */
export interface SourceSummary {
  type: ObtainabilitySourceType;
  id: string;
  name: string;
}

/**
 * Service transformation (e.g., priestess blessing cursed runes)
 */
export type ServiceType = "blessing";

/**
 * Learning requirement for crafting (e.g., alchemy recipe items).
 * The obtainability node contains the recipe item details.
 */
export type LearningRequirement = ObtainabilityNode;

/**
 * Node in the obtainability tree (recursive)
 */
export interface ObtainabilityNode {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  quality: number;
  amount: number;
  depth: number;
  isRoot?: boolean;
  /** If this item is craftable, contains sub-recipe info */
  recipe?: {
    recipe_id: string;
    recipe_type: RecipeType;
    materials: ObtainabilityNode[];
    /** If this is an alchemy recipe, shows how to obtain the recipe item */
    learningRequirement?: LearningRequirement;
  };
  /** If this item is obtained via a service (e.g., priestess blessing) */
  service?: {
    service_type: ServiceType;
    materials: ObtainabilityNode[];
  };
  /** If this item is created by merging other items */
  merge?: {
    materials: ObtainabilityNode[];
  };
  /** Sources for obtaining this item (for leaf nodes or alternative sources) */
  sources: SourceSummary[];
  /** Total count of sources per type (before limiting) */
  sourceCountsByType: Record<string, number>;
}

/**
 * Recipe detail information
 */
export interface RecipeDetailInfo {
  id: string;
  result_item_id: string;
  result_item_name: string;
  result_tooltip_html: string | null;
  result_quality: number;
  result_amount: number;
  type: RecipeType;
  tier: number;
  station_type: string | null;
  xp: number;
  /** For alchemy recipes: the recipe item that teaches this recipe */
  taught_by_recipe_id: string | null;
  taught_by_recipe_name: string | null;
  taught_by_recipe_tooltip_html: string | null;
}

/**
 * Recipe detail page data
 */
export interface RecipeDetailPageData {
  recipe: RecipeDetailInfo;
  description: string;
  obtainabilityTree: ObtainabilityNode;
}
