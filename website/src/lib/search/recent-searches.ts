const STORAGE_KEY = "search.recent";
const LIMIT = 8;

/** Queries the visitor opened a result for, most recent first. */
export function loadRecentSearches(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(stored)
      ? stored.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    // Storage may be unavailable or hold a value this version cannot read.
    return [];
  }
}

export function rememberSearch(query: string): string[] {
  const trimmed = query.trim();
  const recent = [
    trimmed,
    ...loadRecentSearches().filter(
      (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
    ),
  ].slice(0, LIMIT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Without storage the list lasts for this page only.
  }
  return recent;
}
