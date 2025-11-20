import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { PAGINATION } from "$lib/config";

export const prerender = true;

// Load initial page of items at build time (for SSR/prerendering)
export const load: PageServerLoad = () => {
  const db = new Database("static/compendium.db", { readonly: true });

  // Get first page of items
  const items = db
    .prepare("SELECT * FROM items ORDER BY name LIMIT ?")
    .all(PAGINATION.PAGE_SIZE);

  // Get total count
  const totalCount = (db.prepare("SELECT COUNT(*) as count FROM items").get() as { count: number }).count;

  // Get available types
  const availableTypes = db
    .prepare("SELECT DISTINCT item_type FROM items WHERE item_type IS NOT NULL AND item_type != '' ORDER BY item_type")
    .all() as Array<{ item_type: string }>;

  db.close();

  return {
    items,
    totalCount,
    availableTypes: availableTypes.map((t) => t.item_type),
    filters: {
      search: undefined,
      quality: undefined,
      itemType: undefined,
      minLevel: undefined,
      maxLevel: undefined,
    },
    pagination: {
      page: 1,
      pageSize: PAGINATION.PAGE_SIZE,
      totalPages: Math.ceil(totalCount / PAGINATION.PAGE_SIZE),
    },
  };
};
