import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { Altar } from "$lib/queries/altars";

export const prerender = true;

export const load: PageServerLoad = () => {
  const db = new Database("static/compendium.db", { readonly: true });

  const altars = db.prepare("SELECT * FROM altars ORDER BY name").all() as Altar[];

  db.close();

  return {
    altars,
  };
};
