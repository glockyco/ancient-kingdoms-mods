import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

export const prerender = true;

interface HashedEntry {
  hash: string;
  lastmod: string;
}

type BareEntry = Record<string, never>;

type Entry = HashedEntry | BareEntry;

interface Manifest {
  entries: Record<string, Entry>;
}

function hasLastmod(entry: Entry): entry is HashedEntry {
  return "lastmod" in entry;
}

export function GET() {
  const manifestPath = resolvePath("static/sitemap-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;

  const urls = Object.entries(manifest.entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([url, entry]) => {
      if (hasLastmod(entry)) {
        return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n  </url>`;
      }
      return `  <url>\n    <loc>${url}</loc>\n  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
