import { browser } from "$app/environment";
import { loadItemList } from "$lib/utils/item-list-client";
import type { PageLoad } from "./$types";

// Start the complete list when the overview is requested, which includes a
// hovered link to it, so the list is often in memory before the page mounts.
export const load: PageLoad = ({ data }) => {
  if (browser) loadItemList().catch(() => {});
  return data;
};
