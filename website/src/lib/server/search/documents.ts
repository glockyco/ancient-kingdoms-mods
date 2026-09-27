import type Database from "better-sqlite3";
import {
  entityRegistry,
  searchableEntities,
  type EntityDef,
  type SearchableEntityId,
} from "$lib/entities/registry";
import { MECHANICS_GROUPS } from "$lib/data/mechanics";
import type { IndexedDoc } from "$lib/search/engine";
import { FILTERED_LISTS, listHref, listTableLabel } from "$lib/search/lists";
import { nameKey } from "$lib/search/normalize";

/** Text of one entity before its destination and artwork are resolved. */
interface EntityText {
  readonly entityId: string;
  readonly name: string;
  readonly aliases: string;
  readonly keywords: string;
  readonly content: string;
  readonly detail: string | null;
}

type RawRow = Record<string, unknown>;
type Builder = (db: Database.Database) => EntityText[];

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

function textFromRow(row: RawRow): EntityText | null {
  const entityId = String(row.id ?? "");
  const name = String(row.name ?? "").trim();
  if (!entityId || !name) return null;
  return {
    entityId,
    name,
    aliases: "",
    keywords: String(row.keywords ?? "").trim(),
    content: plainText(row.content),
    detail: typeof row.detail === "string" ? row.detail : null,
  };
}

function rowsToText(rows: RawRow[]): EntityText[] {
  return rows
    .map(textFromRow)
    .filter((text): text is EntityText => Boolean(text));
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
  return (db) => {
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
    return rowsToText(
      db
        .prepare(
          `SELECT id, ${nameExpr} AS name, ${keywordExpr} AS keywords, ${contentExpr} AS content FROM ${table} ORDER BY id`,
        )
        .all() as RawRow[],
    );
  };
}

const builders: Record<SearchableEntityId, Builder> = {
  item: tableBuilder("items"),
  monster: tableBuilder("monsters"),
  npc: (db) =>
    rowsToText(
      db
        .prepare(
          `SELECT id, name, keywords, NULL AS content,
             CASE WHEN is_notable THEN 'Notable' END AS detail
           FROM npcs ORDER BY id`,
        )
        .all() as RawRow[],
    ),
  // A zone also answers to the names of its areas, such as its towns.
  zone: (db) => {
    const areas = db.prepare(
      `SELECT zt.name FROM zone_triggers zt
       JOIN zones z ON z.zone_id = zt.zone_id
       WHERE z.id = ? ORDER BY zt.name`,
    );
    return rowsToText(
      db
        .prepare(
          "SELECT id, name, description AS content FROM zones ORDER BY id",
        )
        .all() as RawRow[],
    ).map((zone) => {
      const zoneKey = nameKey(zone.name).replace(/^the /, "");
      const areaNames = (areas.all(zone.entityId) as Array<{ name: string }>)
        .map((area) => area.name)
        .filter((name) => nameKey(name).replace(/^the /, "") !== zoneKey);
      return { ...zone, aliases: areaNames.join(" ") };
    });
  },
  quest: tableBuilder("quests", [
    "tooltip_complete_plain",
    "tooltip_complete_html",
    "tooltip_complete",
    "tooltip_html",
    "tooltip",
  ]),
  chest: tableBuilder("chests", ["description"]),
  gathering_resource: tableBuilder("gathering_resources", ["description"]),
  skill: (db) => {
    const columns = tableColumns(db, "skills");
    const keywordExpr = columns.has("keywords")
      ? "keywords"
      : "trim(coalesce(damage_type, '') || ' ' || coalesce(buff_category, '') || ' ' || coalesce(player_classes, '') || ' ' || coalesce(skill_aggro_message, ''))";
    const tooltip = optionalColumn(columns, [
      "tooltip_plain",
      "tooltip_text",
      "tooltip_template",
    ]);
    return rowsToText(
      db
        .prepare(
          `SELECT id, name, ${keywordExpr} AS keywords, ${tooltip ? `${tooltip} AS content` : "NULL AS content"} FROM skills ORDER BY id`,
        )
        .all() as RawRow[],
    );
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
  portal: (db) =>
    rowsToText(
      db
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
        .all() as RawRow[],
    ),
  treasure: (db) =>
    rowsToText(
      db
        .prepare(
          `
        SELECT tl.id, COALESCE(i.name, 'Treasure Map ' || tl.id) AS name,
               NULL AS keywords, NULL AS content
        FROM treasure_locations tl
        LEFT JOIN items i ON i.id = tl.required_map_id
        ORDER BY tl.id
      `,
        )
        .all() as RawRow[],
    ),
  recipe: (db) =>
    rowsToText(
      db
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
        .all() as RawRow[],
    ),
  mercenary: (db) =>
    rowsToText(
      db
        .prepare(
          "SELECT id, name, 'mercenary companion' AS keywords, NULL AS content FROM pets WHERE is_mercenary = 1 ORDER BY id",
        )
        .all() as RawRow[],
    ),
  summon: (db) =>
    rowsToText(
      db
        .prepare(
          "SELECT id, name, 'summon companion pet' AS keywords, NULL AS content FROM pets WHERE is_mercenary = 0 ORDER BY id",
        )
        .all() as RawRow[],
    ),
  achievement: (db) =>
    rowsToText(
      db
        .prepare(
          "SELECT id, name, NULL AS keywords, description AS content FROM achievements ORDER BY id",
        )
        .all() as RawRow[],
    ),
  guide_topic: (db) =>
    rowsToText(
      db
        .prepare(
          "SELECT id, title AS name, 'adventurers guide help' AS keywords, body AS content FROM game_guide_articles ORDER BY id",
        )
        .all() as RawRow[],
    ),
};

function entityDocs(db: Database.Database): IndexedDoc[] {
  const imagePath = db.prepare(
    `SELECT public_path FROM visual_assets
     WHERE domain = ? AND entity_id = ? AND kind = ?`,
  );
  const imageFor = (def: EntityDef, entityId: string): string | null => {
    if (!def.imageDomain || !def.imageKind) return null;
    const row = imagePath.get(def.imageDomain, entityId, def.imageKind) as
      { public_path: string } | undefined;
    return row ? `/${row.public_path}` : null;
  };

  const docs: IndexedDoc[] = [];
  for (const kind of searchableEntities) {
    const def = entityRegistry[kind];
    for (const text of builders[kind](db)) {
      docs.push({
        kind,
        id: text.entityId,
        name: text.name,
        aliases: text.aliases,
        href: def.detailHref(text.entityId),
        label: def.label,
        detail: text.detail,
        image: imageFor(def, text.entityId),
        keywords: text.keywords,
        content: text.content,
      });
    }
  }
  return docs;
}

function pageDocs(): IndexedDoc[] {
  // A page's subtitle names what the page covers, so it counts as an alias.
  const page = (name: string, href: string, aliases: string): IndexedDoc => ({
    kind: "page",
    id: href,
    name,
    href,
    label: "Page",
    detail: null,
    image: null,
    aliases,
    keywords: "",
    content: "",
  });
  const overviews = new Map<string, IndexedDoc>();
  for (const kind of searchableEntities) {
    const { overviewHref, pluralLabel } = entityRegistry[kind];
    if (overviewHref === "/map" || overviewHref === "/mechanics") continue;
    if (!overviews.has(overviewHref)) {
      overviews.set(overviewHref, page(pluralLabel, overviewHref, "list all"));
    }
  }
  // A mechanics entry that points into an overview page, such as the
  // mercenary rules on /mercenaries, is the same page as that overview.
  const docs = MECHANICS_GROUPS.flatMap((group) =>
    group.pages
      .filter((mechanics) => !overviews.has(mechanics.href.split("#")[0]))
      .map((mechanics) =>
        page(
          mechanics.title,
          mechanics.href,
          `mechanics rules ${mechanics.description}`,
        ),
      ),
  );
  docs.push(...overviews.values());
  docs.push(
    page("Map", "/map", "interactive world map locations"),
    page(
      "Combat Simulator",
      "/tools/combat-simulator",
      "calculator dps damage",
    ),
    page("Game Mechanics", "/mechanics", "rules reference"),
  );
  return docs;
}

function listDocs(): IndexedDoc[] {
  return FILTERED_LISTS.map((list) => ({
    kind: "list",
    id: `${list.filter.kind}:${list.filter.value}`,
    name: list.name,
    href: listHref(list.filter),
    label: listTableLabel(list.filter),
    detail: null,
    image: null,
    aliases: list.aliases ?? "",
    keywords: "",
    content: "",
  }));
}

/** Every document of the search index, in a stable order. */
export function buildSearchDocuments(db: Database.Database): IndexedDoc[] {
  tableColumnsCache.clear();
  return [...entityDocs(db), ...pageDocs(), ...listDocs()];
}
