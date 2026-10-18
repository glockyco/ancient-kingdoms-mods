import type { MethodView } from "../acquisition/types";
import type { AcquisitionItem } from "../acquisition/items";

export type RecipeType = "Alchemy" | "Cooking" | "Crafting" | "Scribing";
export interface RecipeIngredient {
  item_id: string | null;
  item_name: string;
  visual_public_path: string | null;
  amount: number;
}
export interface RecipeListView {
  id: string;
  methodId: string;
  result_item_id: string;
  result_item_name: string;
  result_visual_public_path: string | null;
  result_quality: number;
  result_amount: number;
  ingredients: RecipeIngredient[];
  type: RecipeType;
  tier: number;
  method: MethodView;
}
export interface RecipesPageData {
  recipes: RecipeListView[];
  acquisitionItems: Record<string, AcquisitionItem>;
}
export interface RecipeDetailInfo {
  id: string;
  result_item_id: string;
  result_item_name: string;
  result_visual_public_path: string | null;
  result_tooltip_html: string | null;
  result_quality: number;
}
export interface RecipeDetailPageData {
  recipe: RecipeDetailInfo;
  variants: readonly MethodView[];
  teachers: readonly {
    id: string;
    name: string;
    icon_path: string | null;
    tooltip_html: string | null;
  }[];
  description: string;
  acquisitionItems: Record<string, AcquisitionItem>;
  acquisitionNames: Readonly<Record<string, string>>;
}
