/**
 * Shared source type configuration for item source display across the site.
 *
 * Maps source type identifiers to their display properties (icon, color, label, link prefix).
 * Used by ObtainabilityTree, class detail page source cells, and any future source displays.
 */
import type { Component } from "svelte";
import Skull from "@lucide/svelte/icons/skull";
import Store from "@lucide/svelte/icons/store";
import ScrollText from "@lucide/svelte/icons/scroll-text";
import Flame from "@lucide/svelte/icons/flame";
import FlaskConical from "@lucide/svelte/icons/flask-conical";
import Hammer from "@lucide/svelte/icons/hammer";
import Pickaxe from "@lucide/svelte/icons/pickaxe";
import Box from "@lucide/svelte/icons/box";
import Package from "@lucide/svelte/icons/package";
import Dices from "@lucide/svelte/icons/dices";
import Combine from "@lucide/svelte/icons/combine";
import Shovel from "@lucide/svelte/icons/shovel";
import Sparkles from "@lucide/svelte/icons/sparkles";

export interface SourceTypeConfig {
  icon: Component;
  color: string;
  label: string;
  linkPrefix: string;
}

/**
 * All item source types with their display configuration.
 *
 * Includes both granular types (alchemy/crafting) for batch queries
 * and combined types (recipe/special) for ObtainabilityTree compatibility.
 */
export type ItemSourceType =
  | "drop"
  | "vendor"
  | "quest"
  | "altar"
  | "recipe"
  | "alchemy"
  | "crafting"
  | "gather"
  | "chest"
  | "pack"
  | "random"
  | "merge"
  | "treasure_map"
  | "special";

export const SOURCE_TYPE_CONFIG: Record<ItemSourceType, SourceTypeConfig> = {
  drop: {
    icon: Skull,
    color: "text-red-500",
    label: "Drop",
    linkPrefix: "/monsters/",
  },
  vendor: {
    icon: Store,
    color: "text-green-500",
    label: "Vendor",
    linkPrefix: "/npcs/",
  },
  quest: {
    icon: ScrollText,
    color: "text-blue-500",
    label: "Quest",
    linkPrefix: "/quests/",
  },
  altar: {
    icon: Flame,
    color: "text-orange-500",
    label: "Altar",
    linkPrefix: "/altars/",
  },
  recipe: {
    icon: Hammer,
    color: "text-orange-500",
    label: "Recipe",
    linkPrefix: "/recipes/",
  },
  alchemy: {
    icon: FlaskConical,
    color: "text-purple-500",
    label: "Alchemy",
    linkPrefix: "/recipes/",
  },
  crafting: {
    icon: Hammer,
    color: "text-orange-500",
    label: "Crafting",
    linkPrefix: "/recipes/",
  },
  gather: {
    icon: Pickaxe,
    color: "text-amber-500",
    label: "Gather",
    linkPrefix: "/gather-items/",
  },
  chest: {
    icon: Box,
    color: "text-blue-500",
    label: "Chest",
    linkPrefix: "/chests/",
  },
  pack: {
    icon: Package,
    color: "text-cyan-500",
    label: "Pack",
    linkPrefix: "/items/",
  },
  random: {
    icon: Dices,
    color: "text-purple-500",
    label: "Random",
    linkPrefix: "/items/",
  },
  merge: {
    icon: Combine,
    color: "text-indigo-500",
    label: "Merge",
    linkPrefix: "/items/",
  },
  treasure_map: {
    icon: Shovel,
    color: "text-teal-500",
    label: "Treasure",
    linkPrefix: "/items/",
  },
  special: {
    icon: Sparkles,
    color: "text-purple-500",
    label: "Service",
    linkPrefix: "/npcs/",
  },
};
