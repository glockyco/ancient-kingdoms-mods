import type { Item } from "$lib/queries/items";

/**
 * Data structure returned by the items page load functions
 */
export interface ItemsPageData {
	items: Item[];
	totalCount: number;
	availableTypes: Array<{ type: string; count: number }>;
	qualityCounts: Array<{ quality: number; count: number }>;
	filters: {
		search: string | undefined;
		quality: number[] | undefined;
		itemType: string[] | undefined;
		minLevel: number | undefined;
		maxLevel: number | undefined;
	};
	pagination: {
		page: number;
		pageSize: number;
		totalPages: number;
	};
}

/**
 * Data structure returned by the item detail page load function
 */
export interface ItemDetailPageData {
	item: Item;
}
