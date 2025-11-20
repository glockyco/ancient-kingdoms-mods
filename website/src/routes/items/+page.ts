import { getItems, getItemTypes, getItemCount } from "$lib/queries/items";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ url }) => {
  // Parse URL search params for filters
  const search = url.searchParams.get("search") || undefined;
  const qualityParam = url.searchParams.get("quality");
  const quality = qualityParam
    ? qualityParam.split(",").map(Number)
    : undefined;
  const itemTypeParam = url.searchParams.get("type");
  const itemType = itemTypeParam ? itemTypeParam.split(",") : undefined;
  const minLevel = url.searchParams.get("minLevel")
    ? Number(url.searchParams.get("minLevel"))
    : undefined;
  const maxLevel = url.searchParams.get("maxLevel")
    ? Number(url.searchParams.get("maxLevel"))
    : undefined;
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = 50;

  const filters = {
    search,
    quality,
    itemType,
    minLevel,
    maxLevel,
    limit: pageSize,
    offset: (page - 1) * pageSize,
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
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
};
