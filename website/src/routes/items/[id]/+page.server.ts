import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type { ItemDetailPageData } from "$lib/types/items";
import type { Item } from "$lib/queries/items";

export const prerender = true;

// Generate entries for all items at build time
export const entries: EntryGenerator = () => {
  const db = new Database("static/compendium.db", { readonly: true });
  const items = db.prepare("SELECT id FROM items").all() as Array<{
    id: string;
  }>;
  db.close();

  return items.map((item) => ({ id: item.id }));
};

// Load item data at build time (for SSR/prerendering)
export const load: PageServerLoad = ({ params }): ItemDetailPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(params.id) as
    | Item
    | undefined;

  if (!item) {
    db.close();
    throw error(404, `Item not found: ${params.id}`);
  }

  // For primal essence, get all essence trader NPCs
  let essenceTraders: Array<{ id: string; name: string }> = [];
  if (params.id === "primal_essence") {
    essenceTraders = db
      .prepare(
        `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_essence_trader') = 1`,
      )
      .all() as Array<{ id: string; name: string }>;
  }

  db.close();

  return {
    item,
    essenceTraders,
  };
};
