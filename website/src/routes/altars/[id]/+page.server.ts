import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type { Altar } from "$lib/queries/altars";

export const prerender = true;

// Generate entries for all altars at build time
export const entries: EntryGenerator = () => {
  const db = new Database("static/compendium.db", { readonly: true });
  const altars = db.prepare("SELECT id FROM altars").all() as Array<{
    id: string;
  }>;
  db.close();

  return altars.map((altar) => ({ id: altar.id }));
};

// Load altar data at build time (for SSR/prerendering)
export const load: PageServerLoad = ({ params }) => {
  const db = new Database("static/compendium.db", { readonly: true });

  const altar = db.prepare("SELECT * FROM altars WHERE id = ?").get(params.id) as
    | Altar
    | undefined;

  if (!altar) {
    db.close();
    throw error(404, `Altar not found: ${params.id}`);
  }

  db.close();

  return {
    altar,
  };
};
