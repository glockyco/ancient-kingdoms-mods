import type { EntityVisualAsset } from "$lib/types/visual-assets";
import type { Item } from "$lib/queries/items";
import type {
  ItemSourceView,
  ItemUseView,
  RequirementRoot,
} from "$lib/acquisition/types";
import type { AcquisitionItem } from "$lib/acquisition/items";

/**
 * Full item data from SQL query (includes JSON fields for parsing)
 */
export interface ItemListView {
  id: string;
  name: string;
  visual_public_path: string | null;
  item_type: string;
  quality: number;
  level_required: number;
  item_level: number;
  slot: string | null;
  backpack_slots: number;
  backpack_is_unique: boolean;
  class_required: string;
  stats: string | null;
  stat_count: number;
  stat_keys: string;
  alchemy_recipe_tiers: number[];
  mount_speed: number;
  augment_is_defensive: boolean | null;
  augment_armor_set_name: string | null;
}

/**
 * Item data for client-side rendering (bulky JSON fields stripped)
 */
export type ItemListViewClient = Omit<
  ItemListView,
  "stats" | "stat_keys" | "class_required"
>;

/**
 * Zone info for item obtainability (overview page filtering)
 */
export interface ItemZoneInfo {
  item_id: string;
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
}

/**
 * Data structure returned by the items page load function
 */
export interface ItemsPageData {
  items: ItemListView[];
  itemZones: ItemZoneInfo[];
}

/**
 * Data structure returned by the item detail page load function
 */
export interface ItemDetailPageData {
  item: Item;
  maxLevel: number;
  title: string;
  description: string;
  sources: ItemSourceView;
  usages: readonly ItemUseView[];
  acquisitionItems: Record<string, AcquisitionItem>;
  acquisitionNames: Readonly<Record<string, string>>;
  itemRequirements: readonly RequirementRoot[];
  taughtRecipeId: string | null;
  recipeTeachers: readonly {
    id: string;
    name: string;
    icon_path: string | null;
  }[];
  fishing_role: "fish" | "trash_fish" | "rod" | "costume" | null;
  fishing_effect: {
    title: string;
    description_paragraphs: string[];
    fishing_page_href: string;
  } | null;
  veteranMasters: Array<{ id: string; name: string }>;
  augmenters: Array<{ id: string; name: string }>;
  /** Icon artwork for this item. */
  visualAsset: EntityVisualAsset | null;
  itemIconPaths: Record<string, string | null>;
  /** Sprite of the creature a pet whistle summons. */
  petVisualAsset: EntityVisualAsset | null;
}
