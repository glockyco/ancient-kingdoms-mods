import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";

export const prerender = true;

// Generate entries for all items at build time
export const entries: EntryGenerator = () => {
  const db = new Database("static/compendium.db", { readonly: true });
  const items = db.prepare("SELECT id FROM items").all() as Array<{ id: string }>;
  db.close();

  return items.map((item) => ({ id: item.id }));
};

// Load item data at build time (for SSR/prerendering)
export const load: PageServerLoad = ({ params }) => {
  const db = new Database("static/compendium.db", { readonly: true });

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(params.id);
  db.close();

  if (!item) {
    throw error(404, `Item not found: ${params.id}`);
  }

  return {
    item,
  };
};
