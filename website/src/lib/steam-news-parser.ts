export interface ParsedGameVersion {
  ok: true;
  version: string; // dotted version, e.g. "0.9.18.0"
  date: number; // Unix seconds (from RSS pubDate)
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
 * Walk RSS items newest-first and return the first parseable version.
 * Steam's RSS feed is the source rendered by the public news hub and has
 * proven fresher than ISteamNews for newly published updates.
 */
export function parseGameVersionRss(
  rss: string | undefined | null,
): GameVersionResult {
  if (!rss) return { ok: false };

  const items = rss.match(/<item\b[\s\S]*?<\/item>/gi);
  if (!items) return { ok: false };

  for (const item of items) {
    const title = readTag(item, "title");
    if (!title) continue;

    const m = VERSION_RE.exec(title);
    if (!m) continue;

    return {
      ok: true,
      version: m[1],
      date: parseRssDate(readTag(item, "pubDate")),
      url: readTag(item, "link") ?? "",
    };
  }

  return { ok: false };
}

function readTag(xml: string, tagName: string): string | null {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = re.exec(xml);
  if (!match) return null;

  return decodeXmlText(stripCdata(match[1]).trim());
}

function stripCdata(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<![CDATA[") && trimmed.endsWith("]]>")) {
    return trimmed.slice(9, -3);
  }
  return value;
}

function parseRssDate(value: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

function decodeXmlText(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (_, entity: string) => {
      switch (entity.toLowerCase()) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default:
          return decodeNumericEntity(entity);
      }
    },
  );
}

function decodeNumericEntity(entity: string): string {
  const radix = entity.startsWith("#x") || entity.startsWith("#X") ? 16 : 10;
  const digits = entity.slice(radix === 16 ? 2 : 1);
  const codePoint = Number.parseInt(digits, radix);
  return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : "";
}
