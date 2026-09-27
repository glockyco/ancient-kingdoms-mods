import { inflatedBytes } from "$lib/gzip";
import {
  loadSearchIndex,
  rankSearch,
  type LoadedSearchIndex,
  type SearchDoc,
  type SearchPayload,
  type SearchScope,
} from "./engine";

/**
 * Loads and queries the search index off the main thread. Parsing the index
 * took a 134 ms long task on a 4x throttled CPU, which froze typing in the
 * palette on its first search.
 */

export type SearchWorkerRequest =
  | { readonly kind: "configure"; readonly url: string }
  | { readonly kind: "preload" }
  | {
      readonly kind: "search";
      readonly id: number;
      readonly text: string;
      readonly scope: SearchScope;
      readonly limit: number;
    };

export interface SearchWorkerResponse {
  readonly id: number;
  readonly results?: ReadonlyArray<SearchDoc & { readonly score: number }>;
  readonly error?: string;
}

let indexUrl: string | null = null;
let indexPromise: Promise<LoadedSearchIndex> | null = null;

async function fetchIndex(): Promise<LoadedSearchIndex> {
  if (!indexUrl) {
    throw new Error("Search worker was queried before it was configured");
  }
  const response = await fetch(indexUrl);
  if (!response.ok) {
    throw new Error(`Unable to load the search index (${response.status})`);
  }
  const text = new TextDecoder().decode(await inflatedBytes(response));
  return loadSearchIndex(JSON.parse(text) as SearchPayload);
}

function searchIndex(): Promise<LoadedSearchIndex> {
  indexPromise ??= fetchIndex().catch((error: unknown) => {
    // Let the next search retry instead of caching the failure.
    indexPromise = null;
    throw error;
  });
  return indexPromise;
}

self.onmessage = (event: MessageEvent<SearchWorkerRequest>) => {
  const request = event.data;
  if (request.kind === "configure") {
    indexUrl = request.url;
    return;
  }
  if (request.kind === "preload") {
    searchIndex().catch(() => {
      // The search that needs the index reports the failure.
    });
    return;
  }
  searchIndex()
    .then((loaded) => {
      const results = rankSearch(loaded, request.text, {
        scope: request.scope,
        limit: request.limit,
      }).map(({ doc, score }) => ({ ...doc, score }));
      self.postMessage({
        id: request.id,
        results,
      } satisfies SearchWorkerResponse);
    })
    .catch((error: unknown) => {
      self.postMessage({
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      } satisfies SearchWorkerResponse);
    });
};

export {};
