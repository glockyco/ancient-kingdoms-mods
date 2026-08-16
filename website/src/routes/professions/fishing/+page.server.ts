import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { loadFishingPageData } from "./fishing-page-data.server";
export const prerender = true;

export const load: PageServerLoad = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    return loadFishingPageData(db);
  } finally {
    db.close();
  }
};
