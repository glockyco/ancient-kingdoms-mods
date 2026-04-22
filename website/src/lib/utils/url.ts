/**
 * Get normalized URL search string.
 * Fixes HTML entity encoding from shared links where & becomes &amp;
 * (Steam discussion forums HTML-encode URLs in post text, so copy-pasted
 * links arrive with &amp; as a literal 5-char sequence instead of &.)
 * Also cleans up the browser URL bar so re-sharing the link works correctly.
 *
 * Must only be called in browser context (onMount, afterNavigate, $effect).
 */
export function getNormalizedUrlSearch(): string {
  let search = window.location.search;
  if (search.includes("&amp;")) {
    search = search.replaceAll("&amp;", "&");
    const cleanUrl = window.location.pathname + search + window.location.hash;
    window.history.replaceState(null, "", cleanUrl);
  }
  return search;
}
