import { querySearch } from "$lib/db";
import {
  entityRegistry,
  type EntityDef,
  type EntityId,
  type SearchableEntityId,
} from "$lib/entities/registry";

export interface SearchResult {
  readonly entityType: SearchableEntityId;
  readonly entityId: string;
  readonly name: string;
  readonly entity: EntityDef;
  readonly href: string;
  readonly image: string | null;
  readonly snippet: string | null;
  readonly score: number;
}

interface SearchRow {
  entity_type: string;
  entity_id: string;
  name: string;
  image: string | null;
  snippet?: string | null;
  score?: number;
}

const NAME_QUERY = `
  SELECT entity_type, entity_id, name, image, NULL AS snippet, 0 AS score
  FROM entities
  WHERE lower(name) = lower(?)
  ORDER BY length(name), name, entity_type, entity_id
  LIMIT ?
`;

const PREFIX_QUERY = `
  SELECT entity_type, entity_id, name, image, NULL AS snippet, 1 AS score
  FROM entities
  WHERE lower(name) LIKE lower(?) || '%'
  ORDER BY length(name), name, entity_type, entity_id
  LIMIT ?
`;

const FTS_QUERY = `
  SELECT
    e.entity_type,
    e.entity_id,
    e.name,
    e.image,
    snippet(search_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet,
    bm25(search_fts, 10.0, 5.0, 1.0) AS score
  FROM search_fts
  JOIN entities e ON e.rowid = search_fts.rowid
  WHERE search_fts MATCH ?
  ORDER BY score, e.name, e.entity_type, e.entity_id
  LIMIT ?
`;

function ftsPrefix(value: string): string {
  return `"${value.replaceAll('"', '""')}"*`;
}

function editDistance(left: string, right: string): number {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] =
        left[i - 1] === right[j - 1]
          ? diagonal
          : Math.min(diagonal, previous[j], previous[j - 1]) + 1;
      diagonal = above;
    }
  }
  return previous[right.length];
}

function toResult(row: SearchRow): SearchResult | null {
  const entity = entityRegistry[row.entity_type as EntityId];
  if (!entity || !entity.searchable) return null;
  return {
    entityType: row.entity_type as SearchableEntityId,
    entityId: row.entity_id,
    name: row.name,
    entity,
    href: entity.detailHref(row.entity_id),
    image: row.image ? `/${row.image}` : null,
    snippet: row.snippet || null,
    score: row.score ?? 0,
  };
}

async function fuzzyNames(
  value: string,
  limit: number,
): Promise<SearchResult[]> {
  const rows = await querySearch<SearchRow>(
    "SELECT entity_type, entity_id, name, image FROM entities",
  );
  const queryValue = value.toLocaleLowerCase();
  const threshold = Math.max(1, Math.floor(queryValue.length / 3));
  return rows
    .map((row) => ({
      row,
      distance: editDistance(queryValue, row.name.toLocaleLowerCase()),
    }))
    .filter(({ distance }) => distance <= threshold)
    .sort(
      (a, b) => a.distance - b.distance || a.row.name.localeCompare(b.row.name),
    )
    .slice(0, limit)
    .map(({ row, distance }) => toResult({ ...row, score: distance }))
    .filter((result): result is SearchResult => Boolean(result));
}

/** Search every registered entity family using exact, prefix, FTS, then fuzzy tiers. */
export async function searchEntities(
  value: string,
  limit = 20,
): Promise<SearchResult[]> {
  const queryValue = value.trim();
  if (queryValue.length < 2) return [];

  const exact = await querySearch<SearchRow>(NAME_QUERY, [queryValue, limit]);
  if (exact.length > 0) {
    return exact
      .map(toResult)
      .filter((result): result is SearchResult => Boolean(result));
  }

  const prefix = await querySearch<SearchRow>(PREFIX_QUERY, [
    queryValue,
    limit,
  ]);
  if (prefix.length > 0) {
    return prefix
      .map(toResult)
      .filter((result): result is SearchResult => Boolean(result));
  }

  const fullText = await querySearch<SearchRow>(FTS_QUERY, [
    ftsPrefix(queryValue),
    limit,
  ]);
  if (fullText.length > 0) {
    return fullText
      .map(toResult)
      .filter((result): result is SearchResult => Boolean(result));
  }

  return fuzzyNames(queryValue, limit);
}
