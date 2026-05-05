/**
 * Subset of a Steam News API news item used by parseGameVersion.
 * Other fields (author, contents, gid, tags, etc.) are ignored.
 */
export interface SteamNewsItem {
  title: string;
  date: number; // Unix seconds
  url: string;
}

export interface ParsedGameVersion {
  ok: true;
  version: string; // dotted version, e.g. "0.9.14.3"
  date: number; // Unix seconds (from Steam newsitem.date)
  url: string; // Steam announcement URL
}

export interface UnparsedGameVersion {
  ok: false;
}

export type GameVersionResult = ParsedGameVersion | UnparsedGameVersion;

// Match v<major>.<minor>.<patch>[.<hotfix>] anywhere in the title.
// Two-segment versions (e.g. "v1.0") are rejected because the live game uses
// at least three segments and a "v1.0" title is more likely a marketing/demo
// post than a patch release.
const VERSION_RE = /v(\d+(?:\.\d+){2,3})\b/i;

/**
 * Walk newsitems newest-first and return the first parseable version.
 * Steam News API returns newest-first; we do not re-sort.
 */
export function parseGameVersion(
  newsitems: SteamNewsItem[] | undefined | null,
): GameVersionResult {
  if (!Array.isArray(newsitems)) return { ok: false };
  for (const item of newsitems) {
    if (!item || typeof item.title !== "string") continue;
    const m = VERSION_RE.exec(item.title);
    if (m) {
      return {
        ok: true,
        version: m[1],
        date: Number(item.date) || 0,
        url: typeof item.url === "string" ? item.url : "",
      };
    }
  }
  return { ok: false };
}
