import type { DatabaseTarget } from "./db.worker";
import compendiumUrl from "../../data/compendium.db.gz?url";
import searchUrl from "../../data/search.db.gz?url";

/**
 * Content-hashed URLs for the gzipped databases, produced by the Vite asset
 * graph from the files scripts/compress-databases.mjs writes. The hash is what
 * lets them be served with a one-year immutable cache header, and what makes a
 * rebuilt database invalidate itself.
 *
 * Exactly one bundle may import these assets. Every rollup bundle that imports
 * a file emits its own copy of it under its own hashed name, so importing them
 * from the database worker or the service worker as well would ship three
 * copies at three URLs that never match each other. This module belongs to the
 * main bundle; the database worker is told the URLs over postMessage, and the
 * service worker finds them in the build manifest.
 */
export const DATABASE_URLS: Record<DatabaseTarget, string> = {
  compendium: compendiumUrl,
  search: searchUrl,
};
