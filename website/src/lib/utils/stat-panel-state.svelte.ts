/* eslint-disable svelte/prefer-svelte-reactivity */
/* eslint-disable svelte/no-navigation-without-resolve */
import { afterNavigate, replaceState } from "$app/navigation";
import { getNormalizedUrlSearch } from "$lib/utils/url";

const URL_KEY = "statsPanel";

/**
 * Persisted stat panel open/close state (URL param + localStorage).
 * Must be called during component initialization (top-level <script>).
 */
export function createStatPanelState(storageKey: string): { open: boolean } {
  let open = $state(false);
  let routerReady = $state(false);

  afterNavigate(() => {
    if (!routerReady) {
      const urlValue = new URLSearchParams(getNormalizedUrlSearch()).get(
        URL_KEY,
      );
      if (urlValue !== null) {
        open = urlValue === "1";
      } else {
        try {
          open = localStorage.getItem(storageKey) === "1";
        } catch {
          // localStorage unavailable
        }
      }
      routerReady = true;
    }
  });

  $effect(() => {
    if (!routerReady) return;

    try {
      if (open) {
        localStorage.setItem(storageKey, "1");
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // localStorage unavailable
    }

    const url = new URL(window.location.href);
    if (open) {
      url.searchParams.set(URL_KEY, "1");
    } else {
      url.searchParams.delete(URL_KEY);
    }
    replaceState(url, {});
  });

  return {
    get open() {
      return open;
    },
    set open(v: boolean) {
      open = v;
    },
  };
}
