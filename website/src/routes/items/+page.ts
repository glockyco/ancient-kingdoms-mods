import { browser } from "$app/environment";
import { getItems, getItemTypes, getItemCount } from "$lib/queries/items";
import { PAGINATION } from "$lib/config";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ url, data }) => {
  // During SSR/prerendering, always use server data
  if (!browser) {
    return data;
  }

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

  // Check if any filters are applied
  const hasFilters = search || quality || itemType || minLevel || maxLevel || page > 1;

  // If no filters, use prerendered server data
  if (!hasFilters) {
    return data;
  }

  // Otherwise, use client-side queries for filtering (browser only)
  const filters = {
    search,
    quality,
    itemType,
    minLevel,
    maxLevel,
    limit: PAGINATION.PAGE_SIZE,
    offset: (page - 1) * PAGINATION.PAGE_SIZE,
  };

  const [items, totalCount, availableTypes] = await Promise.all([
    getItems(filters),
    getItemCount(filters),
    getItemTypes(),
  ]);

  return {
    items,
    totalCount,
    availableTypes,
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
