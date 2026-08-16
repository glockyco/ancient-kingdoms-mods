/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;

/**
 * The database URLs are content-hashed, so the cache does not need the build
 * version in its name. A deploy that leaves the game data untouched now keeps
 * the cached copy instead of downloading 19 MB again. Stale entries are
 * dropped on activate by comparing against the current URLs.
 *
 * The URLs are read from the build manifest rather than imported. Importing
 * the assets here would emit a second copy of each database under a different
 * hashed name, and this worker would then cache a URL the page never requests.
 * src/lib/database-assets.ts owns the only import.
 */
const DB_CACHE_NAME = "db-cache";
const DB_URLS = build.filter((url) =>
  /\/(compendium|search)\.db[.-][\w-]+\.gz$/.test(url),
);

// Tile URLs are not content-hashed, so this cache is still keyed by build.
const TILES_CACHE_NAME = `tiles-cache-${version}`;

// Zoom levels to pre-cache for offline map overview
const PRECACHE_ZOOM_LEVELS = ["-3", "-2", "-1", "0"];

interface TilesManifest {
  zoom_levels: Record<
    string,
    {
      count: number;
      size_bytes: number;
      tiles: string[];
    }
  >;
  total_count: number;
  total_size_bytes: number;
}

async function precacheEssentialTiles(): Promise<void> {
  try {
    const response = await fetch("/tiles/tiles-manifest.json");
    if (!response.ok) return;

    const manifest: TilesManifest = await response.json();
    const cache = await caches.open(TILES_CACHE_NAME);

    const tilesToCache: string[] = [];
    for (const zoom of PRECACHE_ZOOM_LEVELS) {
      const zoomData = manifest.zoom_levels[zoom];
      if (zoomData) {
        tilesToCache.push(...zoomData.tiles);
      }
    }

    // Fetch tiles in batches to avoid overwhelming network
    const batchSize = 20;
    for (let i = 0; i < tilesToCache.length; i += batchSize) {
      const batch = tilesToCache.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const tileResponse = await fetch(url);
            if (tileResponse.ok) {
              await cache.put(url, tileResponse);
            }
          } catch {
            // Tile fetch failed, skip silently
          }
        }),
      );
    }
  } catch {
    // Manifest fetch failed, skip tile pre-caching
  }
}

/**
 * Installation must stay cheap.
 *
 * This used to download both databases and the four overview zoom levels of
 * map tiles, about 19 MB, for every new client on every route, before the
 * visitor had asked for anything. A page view of /traps paid for the whole
 * compendium. Everything is now fetched on demand and kept once it arrives.
 */
sw.addEventListener("install", (event) => {
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== DB_CACHE_NAME && key !== TILES_CACHE_NAME)
          .map((key) => caches.delete(key)),
      );

      // The database cache outlives a deploy, so it has to drop entries whose
      // content hash no longer matches the build being activated.
      const dbCache = await caches.open(DB_CACHE_NAME);
      const cached = await dbCache.keys();
      await Promise.all(
        cached
          .filter((request) => !DB_URLS.includes(new URL(request.url).pathname))
          .map((request) => dbCache.delete(request)),
      );

      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;
  if (url.origin !== sw.location.origin) return;

  // Database: cache-first. The URL carries a content hash, so a cache hit is
  // always the right bytes and never needs revalidation.
  if (DB_URLS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DB_CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Tiles: cache-first
  if (url.pathname.startsWith("/tiles/") && url.pathname.endsWith(".webp")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(TILES_CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Everything else: let browser handle normally
});

sw.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    sw.skipWaiting();
  }

  if (event.data?.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ version });
  }

  // The map page asks for the overview zoom levels once it is open. Warming
  // them on install instead would charge every visitor for a feature most of
  // them never reach.
  if (event.data?.type === "WARM_MAP_TILES") {
    event.waitUntil(precacheEssentialTiles());
  }
});
