import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { canonicalUrl } from "$lib/seo/site";
import { listPageUrl } from "$lib/components/ui/data-table/crawlable-pagination";
import { _pagination as altars } from "../altars/+page.server";
import { _pagination as chests } from "../chests/+page.server";
import { _pagination as gatherItems } from "../gather-items/+page.server";
import { _pagination as items } from "../items/+page.server";
import { _pagination as monsters } from "../monsters/+page.server";
import { _pagination as npcs } from "../npcs/+page.server";
import { _pagination as quests } from "../quests/+page.server";
import { _pagination as recipes } from "../recipes/+page.server";
import { _pagination as skills } from "../skills/+page.server";
import { _pagination as summons } from "../summons/+page.server";
import { _pagination as traps } from "../traps/+page.server";

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

export async function GET() {
  const manifestPath = resolvePath("static/sitemap-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;

  // Numbered list pages share their first page's date.
  for (const pagination of [
    altars,
    chests,
    gatherItems,
    items,
    monsters,
    npcs,
    quests,
    recipes,
    skills,
    summons,
    traps,
  ]) {
    const overviewUrl = canonicalUrl(pagination.basePath);
    const overview = manifest.entries[overviewUrl];
    if (!overview) throw new Error(`Missing sitemap overview: ${overviewUrl}`);
    for (const entry of await pagination.entries()) {
      const url = canonicalUrl(
        listPageUrl(pagination.basePath, Number(entry.page)),
      );
      manifest.entries[url] = overview;
    }
  }

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
