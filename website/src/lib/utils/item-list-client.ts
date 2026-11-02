import { base } from "$app/paths";
import type { ItemListPayload } from "./item-list";

/** The complete item list, which the item overview's head also preloads. */
export const ITEM_LIST_URL = `${base}/items/list.json`;

let request: Promise<ItemListPayload> | null = null;

/** The complete item list once it has arrived in this page session. */
export let loadedItemList: ItemListPayload | null = null;

/**
 * Fetch the complete item list at most once per page session. The overview's
 * load function starts it, so hovering a link to the overview already
 * downloads the list, and later visits reuse it. A failed request is retried
 * on the next call.
 */
export function loadItemList(): Promise<ItemListPayload> {
  request ??= fetch(ITEM_LIST_URL)
    .then((response) => {
      if (!response.ok)
        throw new Error(`Item list returned ${response.status}`);
      return response.json() as Promise<ItemListPayload>;
    })
    .then((payload) => (loadedItemList = payload))
    .catch((error: unknown) => {
      request = null;
      throw error;
    });
  return request;
}
