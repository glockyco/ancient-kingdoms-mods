/**
 * Item zone relationship types - for zone-based filtering
 *
 * These types represent precomputed relationships between items and zones,
 * enabling efficient "what items can I get/use in this zone?" queries.
 */

import type { ItemSourceType, ItemUsageType } from "./item-sources";

// ============================================================================
// ZONE RELATIONSHIP TYPES
// ============================================================================

/**
 * Item that can be obtained in a specific zone
 */
export interface ItemZoneObtainable {
  item_id: string;
  zone_id: string;
  source_type: ItemSourceType;
}

/**
 * Item that can be used in a specific zone
 */
export interface ItemZoneUsable {
  item_id: string;
  zone_id: string;
  usage_type: ItemUsageType;
}

// Re-export for convenience
export type { ItemSourceType, ItemUsageType } from "./item-sources";

// ============================================================================
// ZONE FILTERING TYPES
// ============================================================================

/**
 * Zone filter options for item searches
 */
export interface ZoneFilter {
  zone_id: string;
  zone_name: string;
  obtainable_types?: ItemSourceType[];
  usable_types?: ItemUsageType[];
}

/**
 * Result of zone-based item query
 */
export interface ZoneItemsResult {
  zone_id: string;
  zone_name: string;
  obtainable_items: ZoneItemSummary[];
  usable_items: ZoneItemSummary[];
}

/**
 * Summary of an item available in a zone
 */
export interface ZoneItemSummary {
  item_id: string;
  item_name: string;
  quality: number;
  sources_count: number; // Number of ways to obtain/use this item in the zone
}

// ============================================================================
// QUERY RESULT TYPES
// ============================================================================

/**
 * Items obtainable in a specific zone
 */
export interface ZoneObtainableItemsResult {
  zone_id: string;
  items: Array<{
    item_id: string;
    item_name: string;
    quality: number;
    sources: ItemSourceType[];
  }>;
}

/**
 * Items usable in a specific zone
 */
export interface ZoneUsableItemsResult {
  zone_id: string;
  items: Array<{
    item_id: string;
    item_name: string;
    quality: number;
    usages: ItemUsageType[];
  }>;
}
