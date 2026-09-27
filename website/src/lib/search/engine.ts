import MiniSearch, { type AsPlainObject, type Query } from "minisearch";
import type { EntityId } from "$lib/entities/registry";
import { isAdjacentSwap, nameKey, singular, tokenize } from "./normalize";
import { SYNONYMS } from "./synonyms";

/**
 * One search index and one ranking for the palette and the map search.
 * The build serializes the index; the browser and the tests load the same
 * payload through `loadSearchIndex`.
 */

export type SearchKind = EntityId | "page" | "list";

/** Where a search runs: the site palette, or the map, which keeps placements. */
export type SearchScope = "palette" | "map";

/** What a result row needs; stored once per document in the payload. */
export interface SearchDoc {
  readonly kind: SearchKind;
  readonly id: string;
  readonly name: string;
  readonly href: string;
  /** The result type shown on the row, for example "Item" or "NPC list". */
  readonly label: string;
  /** A classification the row must show, for example "Notable". */
  readonly detail: string | null;
  readonly image: string | null;
}

/** A document with the text the index searches. */
export interface IndexedDoc extends SearchDoc {
  /** Other names of the same thing, such as the towns of a zone. */
  readonly aliases: string;
  readonly keywords: string;
  readonly content: string;
}

export interface SearchPayload {
  readonly docs: readonly SearchDoc[];
  readonly index: AsPlainObject;
}

export interface RankedResult {
  readonly doc: SearchDoc;
  readonly score: number;
}

/** Map-only families: internal names or no page of their own. */
export const PLACEMENT_KINDS: ReadonlySet<SearchKind> = new Set<SearchKind>([
  "chest",
  "trap",
  "portal",
  "crafting_station",
  "alchemy_table",
  "scribing_table",
  "house",
  "treasure",
]);

/** Ranking weight per result kind; recipes repeat the names of their items. */
const KIND_WEIGHT: Partial<Record<SearchKind, number>> = {
  zone: 1.3,
  class: 1.3,
  profession: 1.3,
  page: 1.3,
  list: 1.3,
  recipe: 0.6,
};

const FIELDS = ["name", "aliases", "keywords", "content"];

const INDEX_OPTIONS = {
  fields: FIELDS,
  tokenize,
  // Index the singular beside each plural, so either form finds the other.
  processTerm: (term: string) => {
    const base = singular(term);
    return base === term ? term : [term, base];
  },
  searchOptions: {
    // Query words arrive already tokenized and expanded by `queryFor`.
    processTerm: (term: string) => term,
    boost: { name: 6, aliases: 4, keywords: 2, content: 0.4 },
    weights: { fuzzy: 0.15, prefix: 0.4 },
    maxFuzzy: 2,
  },
};

/** Edits a query word tolerates: none below 4 letters, 2 from 8 letters. */
function editsFor(term: string): number | false {
  if (term.length >= 8) return 2;
  if (term.length >= 4) return 1;
  return false;
}

export function createSearchPayload(
  docs: readonly IndexedDoc[],
): SearchPayload {
  const index = new MiniSearch(INDEX_OPTIONS);
  index.addAll(
    docs.map((doc, position) => ({
      id: position,
      name: doc.name,
      aliases: doc.aliases,
      keywords: doc.keywords,
      content: doc.content,
    })),
  );
  return {
    docs: docs.map(({ kind, id, name, href, label, detail, image }) => ({
      kind,
      id,
      name,
      href,
      label,
      detail,
      image,
    })),
    index: index.toJSON(),
  };
}

export interface LoadedSearchIndex {
  readonly index: MiniSearch;
  readonly docs: readonly SearchDoc[];
  readonly keys: readonly string[];
}

export function loadSearchIndex(payload: SearchPayload): LoadedSearchIndex {
  return {
    index: MiniSearch.loadJS(payload.index, INDEX_OPTIONS),
    docs: payload.docs,
    keys: payload.docs.map((doc) => nameKey(doc.name)),
  };
}

/**
 * Every typed word must match; each word matches any of its forms. Only the
 * last typed word matches as a prefix, because it may be unfinished. A synonym
 * is a whole word, so it matches without prefix or edits.
 */
function queryFor(words: readonly string[], combineWith: "AND" | "OR"): Query {
  return {
    combineWith,
    queries: words.map((word, position) => {
      const typed: Query = {
        combineWith: "OR",
        queries: [...new Set([word, singular(word)])],
        prefix: position === words.length - 1,
        fuzzy: editsFor,
      };
      const synonyms = SYNONYMS[word];
      if (!synonyms) return typed;
      return {
        combineWith: "OR",
        queries: [
          typed,
          {
            combineWith: "OR",
            queries: [...synonyms],
            prefix: false,
            fuzzy: false,
          },
        ],
      };
    }),
  };
}

export function rankSearch(
  loaded: LoadedSearchIndex,
  text: string,
  { scope, limit }: { scope: SearchScope; limit: number },
): RankedResult[] {
  const words = tokenize(text);
  if (words.length === 0) return [];
  const { index, docs, keys } = loaded;
  const inScope = (position: number) =>
    scope === "map" || !PLACEMENT_KINDS.has(docs[position].kind);
  const options = {
    filter: (result: { id: number }) => inScope(result.id),
    boostDocument: (position: number) => KIND_WEIGHT[docs[position].kind] ?? 1,
  };

  let hits = index.search(queryFor(words, "AND"), options);
  if (hits.length === 0 && words.length > 1) {
    hits = index.search(queryFor(words, "OR"), options);
  }

  const queryKey = words.join(" ");
  // A name that equals the query ranks first. MiniSearch counts a swap of two
  // adjacent letters as two edits, so a full name one swap away from the query
  // is found here instead of by fuzzy matching.
  const exact = hits.filter((hit) => keys[hit.id] === queryKey);
  const swapped =
    exact.length === 0 && queryKey.length >= 5
      ? keys.flatMap((key, position) =>
          inScope(position) && isAdjacentSwap(queryKey, key)
            ? [{ id: position, score: Number.POSITIVE_INFINITY }]
            : [],
        )
      : [];
  const ordered = [
    ...exact,
    ...swapped,
    ...hits.filter((hit) => keys[hit.id] !== queryKey),
  ];

  // The palette shows one row per destination. Map placements share the map
  // overview as their destination, so the map keeps one row per entity.
  const seen = new Set<string>();
  const results: RankedResult[] = [];
  for (const hit of ordered) {
    const doc = docs[hit.id];
    const key = scope === "map" ? `${doc.kind}:${doc.id}` : doc.href;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ doc, score: hit.score });
    if (results.length === limit) break;
  }
  return results;
}
