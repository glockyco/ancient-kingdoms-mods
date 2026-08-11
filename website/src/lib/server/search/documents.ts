import type Database from "better-sqlite3";
import {
  entityRegistry,
  searchableEntities,
  type EntityDef,
  type SearchableEntityId,
} from "$lib/entities/registry";

export interface SearchDoc {
  readonly entityType: SearchableEntityId;
  readonly entityId: string;
  readonly name: string;
  readonly keywords: string;
  readonly content: string;
  readonly imageDomain: string | null;
  readonly imageKind: EntityDef["imageKind"];
}

type RawRow = Record<string, unknown>;
type Builder = (db: Database.Database, def: EntityDef) => SearchDoc[];

const tableColumnsCache = new Map<string, Set<string>>();

function tableColumns(db: Database.Database, table: string): Set<string> {
  const cached = tableColumnsCache.get(table);
  if (cached) return cached;
  const columns = new Set(
    (
      db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    ).map((column) => column.name),
  );
  tableColumnsCache.set(table, columns);
  return columns;
}

function optionalColumn(
  columns: Set<string>,
  candidates: readonly string[],
): string | null {
  return candidates.find((column) => columns.has(column)) ?? null;
}

function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function docFromRow(
  def: EntityDef,
  row: RawRow,
  contentFields: readonly string[] = [],
): SearchDoc | null {
  const entityId = String(row.id ?? "");
  const name = String(row.name ?? "").trim();
  if (!entityId || !name) return null;
  const content = contentFields
    .map((field) => plainText(row[field]))
    .filter(Boolean)
    .join(" ");
  return {
    entityType: def.id as SearchableEntityId,
    entityId,
    name,
    keywords: String(row.keywords ?? "").trim(),
    content,
    imageDomain: def.imageDomain,
    imageKind: def.imageKind,
  };
}

function tableBuilder(
  table: string,
  contentCandidates: readonly string[] = [
    "tooltip_plain",
    "tooltip_text",
    "tooltip_html",
    "tooltip",
  ],
): Builder {
  return (db, def) => {
    const columns = tableColumns(db, table);
    const contentFields = contentCandidates.filter((field) =>
      columns.has(field),
    );
    const keywordExpr = columns.has("keywords") ? "keywords" : "NULL";
    const contentExpr = contentFields.length
      ? contentFields
          .map((field) => `COALESCE(${field}, '')`)
          .join(" || ' ' || ")
      : "NULL";
    const nameExpr = columns.has("name") ? "name" : "id";
    const rows = db
      .prepare(
        `SELECT id, ${nameExpr} AS name, ${keywordExpr} AS keywords, ${contentExpr} AS content FROM ${table} ORDER BY id`,
      )
      .all() as RawRow[];
    return rows
      .map((row) =>
        docFromRow(def, row, contentFields.length ? ["content"] : []),
      )
      .filter((doc): doc is SearchDoc => Boolean(doc));
  };
}

function rowsToDocs(def: EntityDef, rows: RawRow[]): SearchDoc[] {
  return rows
    .map((row) => docFromRow(def, row, ["content"]))
    .filter((doc): doc is SearchDoc => Boolean(doc));
}

const builders: Partial<Record<SearchableEntityId, Builder>> = {
  item: tableBuilder("items"),
  monster: tableBuilder("monsters"),
  npc: tableBuilder("npcs"),
  zone: tableBuilder("zones", ["description"]),
  quest: tableBuilder("quests", [
    "tooltip_complete_plain",
    "tooltip_complete_html",
    "tooltip_complete",
    "tooltip_html",
    "tooltip",
  ]),
  chest: tableBuilder("chests", ["description"]),
  gathering_resource: tableBuilder("gathering_resources", ["description"]),
  skill: (db, def) => {
    const columns = tableColumns(db, "skills");
    const keywordExpr = columns.has("keywords")
      ? "keywords"
      : "trim(coalesce(damage_type, '') || ' ' || coalesce(buff_category, '') || ' ' || coalesce(player_classes, '') || ' ' || coalesce(skill_aggro_message, ''))";
    const tooltip = optionalColumn(columns, [
      "tooltip_plain",
      "tooltip_text",
      "tooltip_template",
    ]);
    const rows = db
      .prepare(
        `SELECT id, name, ${keywordExpr} AS keywords, ${tooltip ? `${tooltip} AS content` : "NULL AS content"} FROM skills ORDER BY id`,
      )
      .all() as RawRow[];
    return rowsToDocs(def, rows);
  },
  class: tableBuilder("classes", ["description"]),
  altar: tableBuilder("altars", ["description"]),
  faction: tableBuilder("factions", ["description"]),
  profession: tableBuilder("professions", ["description"]),
  trap: tableBuilder("traps", ["description"]),
  house: tableBuilder("houses", ["description"]),
  crafting_station: tableBuilder("crafting_stations"),
  alchemy_table: tableBuilder("alchemy_tables"),
  scribing_table: tableBuilder("scribing_tables"),
  portal: (db, def) => {
    const rows = db
      .prepare(
        `
        SELECT
          p.id,
          COALESCE(NULLIF(fs.name, ''), NULLIF(fz.name, ''), p.from_sub_zone_id, p.from_zone_id)
            || ' → ' ||
          COALESCE(NULLIF(ts.name, ''), NULLIF(tz.name, ''), p.to_sub_zone_id, p.to_zone_id) AS name,
          p.keywords
        FROM portals p
        LEFT JOIN zone_triggers fs ON fs.id = p.from_sub_zone_id
        LEFT JOIN zone_triggers ts ON ts.id = p.to_sub_zone_id
        LEFT JOIN zones fz ON fz.id = p.from_zone_id
        LEFT JOIN zones tz ON tz.id = p.to_zone_id
        WHERE p.is_template = 0
        ORDER BY p.id
      `,
      )
      .all() as RawRow[];
    return rowsToDocs(def, rows);
  },
  treasure: (db, def) => {
    const rows = db
      .prepare(
        `
        SELECT tl.id, COALESCE(i.name, 'Treasure Map ' || tl.id) AS name,
               NULL AS keywords, NULL AS content
        FROM treasure_locations tl
        LEFT JOIN items i ON i.id = tl.required_map_id
        ORDER BY tl.id
      `,
      )
      .all() as RawRow[];
    return rowsToDocs(def, rows);
  },
  recipe: (db, def) => {
    const rows = db
      .prepare(
        `
        SELECT r.id, i.name AS name, r.type AS keywords, i.tooltip_html AS content
        FROM (
          SELECT id, result_item_id, 'crafting recipe' AS type FROM crafting_recipes
          UNION ALL
          SELECT id, result_item_id, 'alchemy recipe' AS type FROM alchemy_recipes
          UNION ALL
          SELECT id, result_item_id, 'scribing recipe' AS type FROM scribing_recipes
        ) r
        JOIN items i ON i.id = r.result_item_id
        ORDER BY r.id
      `,
      )
      .all() as RawRow[];
    return rowsToDocs(def, rows);
  },
  mercenary: (db, def) => {
    const rows = db
      .prepare(
        "SELECT id, name, 'mercenary companion' AS keywords, NULL AS content FROM pets WHERE is_mercenary = 1 ORDER BY id",
      )
      .all() as RawRow[];
    return rowsToDocs(def, rows);
  },
  summon: (db, def) => {
    const rows = db
      .prepare(
        "SELECT id, name, 'summon companion pet' AS keywords, NULL AS content FROM pets WHERE is_mercenary = 0 ORDER BY id",
      )
      .all() as RawRow[];
    return rowsToDocs(def, rows);
  },
  achievement: (db, def) => {
    const rows = db
      .prepare(
        "SELECT id, name, NULL AS keywords, description AS content FROM achievements ORDER BY id",
      )
      .all() as RawRow[];
    return rowsToDocs(def, rows);
  },
};

export const searchDocumentBuilders = builders as Record<
  SearchableEntityId,
  Builder
>;

export function buildSearchDocuments(db: Database.Database): SearchDoc[] {
  tableColumnsCache.clear();
  const docs: SearchDoc[] = [];
  for (const entityType of searchableEntities) {
    const def = entityRegistry[entityType];
    const builder = searchDocumentBuilders[entityType];
    if (!builder)
      throw new Error(`Missing search document builder for ${entityType}`);
    docs.push(...builder(db, def));
  }
  return docs;
}
