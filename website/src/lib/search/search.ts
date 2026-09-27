import { browser } from "$app/environment";
import { SEARCH_INDEX_URL } from "$lib/database-assets";
import type { SearchDoc, SearchScope } from "./engine";
import type {
  SearchWorkerRequest,
  SearchWorkerResponse,
} from "./search.worker";

export type { SearchKind, SearchScope } from "./engine";

export interface SearchResult extends SearchDoc {
  readonly score: number;
}

interface PendingSearch {
  resolve: (results: SearchResult[]) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<number, PendingSearch>();

function post(message: SearchWorkerRequest, client: Worker): void {
  client.postMessage(message);
}

function workerClient(): Worker {
  if (!browser) throw new Error("Search runs only in the browser");
  if (worker) return worker;
  worker = new Worker(new URL("./search.worker.ts", import.meta.url), {
    type: "module",
  });
  // The worker cannot resolve the hashed index URL itself; see
  // src/lib/database-assets.ts. This message is queued before any search.
  post({ kind: "configure", url: SEARCH_INDEX_URL }, worker);
  worker.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
    const response = event.data;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (response.error) request.reject(new Error(response.error));
    else request.resolve([...(response.results ?? [])]);
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "Search worker failed");
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };
  return worker;
}

/** Start loading the index without blocking the caller. */
export function preloadSearchIndex(): void {
  if (!browser) return;
  post({ kind: "preload" }, workerClient());
}

/** Rank every document in the scope against the query text. */
export function searchEntities(
  text: string,
  {
    scope = "palette",
    limit = 20,
  }: { scope?: SearchScope; limit?: number } = {},
): Promise<SearchResult[]> {
  if (text.trim().length < 2) return Promise.resolve([]);
  const client = workerClient();
  const id = nextRequestId++;
  return new Promise<SearchResult[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    post({ kind: "search", id, text, scope, limit }, client);
  });
}
