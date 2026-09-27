import compendiumUrl from "../../data/compendium.db.gz?url";
import searchIndexUrl from "../../data/search-index.json.gz?url";

/**
 * Content-hashed URLs for the gzipped database and search index, produced by
 * the Vite asset graph from the files scripts/compress-databases.mjs writes.
 * The hash is what lets them be served with a one-year immutable cache header,
 * and what makes a rebuilt file invalidate itself.
 *
 * Exactly one bundle may import these assets. Every rollup bundle that imports
 * a file emits its own copy of it under its own hashed name, so importing them
 * from a worker or the service worker as well would ship several copies at
 * URLs that never match each other. This module belongs to the main bundle;
 * the database and search workers are told their URL over postMessage, and
 * the service worker finds both in the build manifest.
 */
export const COMPENDIUM_DB_URL: string = compendiumUrl;
export const SEARCH_INDEX_URL: string = searchIndexUrl;
