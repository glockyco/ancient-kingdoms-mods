import { getItems, getItemTypesWithCounts, getQualityCounts, getItemCount } from "$lib/queries/items";
import { PAGINATION } from "$lib/config";
import type { PageLoad } from "./$types";
import type { ItemsPageData } from "$lib/types/items";

// Disable SSR to prevent flash of wrong content
// Page renders as empty shell, then client-side load fetches correct data
export const ssr = false;

export const load: PageLoad = async ({ url }): Promise<ItemsPageData> => {
  // Parse URL search params for filters
  const search = url.searchParams.get("search") || undefined;
  const qualityParam = url.searchParams.get("quality");
  const quality = qualityParam ? qualityParam.split(",").map(Number) : undefined;
  const itemTypeParam = url.searchParams.get("type");
  const itemType = itemTypeParam ? itemTypeParam.split(",") : undefined;
  const minLevel = url.searchParams.get("minLevel")
    ? Number(url.searchParams.get("minLevel"))
    : undefined;
  const maxLevel = url.searchParams.get("maxLevel")
    ? Number(url.searchParams.get("maxLevel"))
    : undefined;
  const page = Number(url.searchParams.get("page") || "1");

  // Client-side queries
  const filters = {
    search,
    quality,
    itemType,
    minLevel,
    maxLevel,
    limit: PAGINATION.PAGE_SIZE,
    offset: (page - 1) * PAGINATION.PAGE_SIZE,
  };

  // Fetch type counts based on current quality filter, and quality counts based on current type filter
  const [items, totalCount, availableTypes, qualityCounts] = await Promise.all([
    getItems(filters),
    getItemCount(filters),
    getItemTypesWithCounts(quality),
    getQualityCounts(itemType),
  ]);

  return {
    items,
    totalCount,
    availableTypes,
    qualityCounts,
    filters: {
      search,
      quality,
      itemType,
      minLevel,
      maxLevel,
    },
    pagination: {
      page,
      pageSize: PAGINATION.PAGE_SIZE,
      totalPages: Math.ceil(totalCount / PAGINATION.PAGE_SIZE),
    },
  };
};
