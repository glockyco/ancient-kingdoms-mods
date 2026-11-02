import { browser } from "$app/environment";
import { loadItemList } from "$lib/utils/item-list-client";
import type { PageLoad } from "./$types";

// As on the first page: the complete list starts when this page is requested.
export const load: PageLoad = ({ data }) => {
  if (browser) loadItemList().catch(() => {});
  return data;
};
