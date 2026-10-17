import type Database from "better-sqlite3";
import {
  entityRegistry,
  searchableEntities,
  type EntityDef,
  type SearchableEntityId,
} from "$lib/entities/registry";
import { MECHANICS_GROUPS } from "$lib/data/mechanics";
import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
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

const LOCATION_SQL =
  "CASE WHEN t.name IS NOT NULL AND t.name != z.name THEN t.name || ', ' ELSE '' END || z.name";

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
  monster: (db) =>
    rowsToText(
      db
        .prepare(
          `
    SELECT m.id, m.name, m.keywords, NULL AS content,
      (SELECT group_concat(location, ', ') FROM (
        SELECT DISTINCT ${LOCATION_SQL} AS location
        FROM monster_spawns s JOIN zones z ON z.id = s.zone_id
        LEFT JOIN zone_triggers t ON t.id = s.sub_zone_id
        WHERE s.monster_id = m.id ORDER BY location
      )) AS detail
    FROM monsters m ORDER BY m.id
  `,
        )
        .all() as RawRow[],
    ),
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
  chest: (db) =>
    rowsToText(
      db
        .prepare(
          `
    SELECT c.id, 'Chest' AS name, c.keywords,
      ${LOCATION_SQL} AS detail
    FROM chests c JOIN zones z ON z.id = c.zone_id
    LEFT JOIN zone_triggers t ON t.id = c.sub_zone_id
    ORDER BY c.id
  `,
        )
        .all() as RawRow[],
    ),
  gathering_resource: (db) =>
    rowsToText(
      db
        .prepare(
          `
    SELECT r.id, r.name, r.keywords, r.description AS content,
      (SELECT group_concat(location, ', ') FROM (
        SELECT DISTINCT ${LOCATION_SQL} AS location
        FROM gathering_resource_spawns s JOIN zones z ON z.id = s.zone_id
        LEFT JOIN zone_triggers t ON t.id = s.sub_zone_id
        WHERE s.resource_id = r.id ORDER BY location
      )) AS detail,
      (SELECT group_concat(name, ', ') FROM (
        SELECT DISTINCT i.name FROM item_sources_gather g
        JOIN items i ON i.id = g.item_id
        WHERE g.resource_id = r.id AND r.is_fishing_spot = 1
        ORDER BY g.actual_drop_chance DESC, i.name LIMIT 3
      )) AS catches
    FROM gathering_resources r ORDER BY r.id
  `,
        )
        .all()
        .map((raw) => {
          const row = raw as RawRow;
          return {
            ...row,
            detail: [row.detail, row.catches ? `Catches: ${row.catches}` : null]
              .filter(Boolean)
              .join(". "),
          };
        }),
    ),
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
  altar: (db) =>
    rowsToText(
      db
        .prepare(
          `
    SELECT a.id, a.name, a.keywords,
      ${LOCATION_SQL} AS detail
    FROM altars a JOIN zones z ON z.id = a.zone_id
    LEFT JOIN zone_triggers t ON t.id = a.sub_zone_id
    ORDER BY a.id
  `,
        )
        .all() as RawRow[],
    ),
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
        SELECT tl.id, COALESCE(i.name, 'Treasure map') AS name,
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
          `
    SELECT p.id, p.name, 'summon companion pet' AS keywords,
      (SELECT group_concat(owner, ', ') FROM (
        SELECT DISTINCT upper(substr(c.value, 1, 1)) || substr(c.value, 2) || ' skill: ' || s.name AS owner
        FROM skills s, json_each(s.player_classes) c WHERE s.pet_id = p.id
        UNION
        SELECT DISTINCT m.name AS owner FROM skills s
        JOIN pet_skills ps ON ps.skill_id = s.id
        JOIN pets m ON m.id = ps.pet_id AND m.is_mercenary = 1
        WHERE p.id IN (s.archer_pet_id, s.reaper_pet_id)
        ORDER BY owner
      )) AS detail
    FROM pets p WHERE p.is_mercenary = 0 ORDER BY p.id
  `,
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
        keywords: `${text.keywords} ${text.detail ?? ""}`.trim(),
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
    page("Mechanics", "/mechanics", "rules reference"),
  );
  return docs;
}

/**
 * Adds every entry of a mechanics page's contents to `docs`. A guide article
 * that opens the same section already represents it, so the heading becomes
 * one of the article's aliases rather than a second result for one
 * destination. Any other section is a result of its own: its page title is a
 * keyword, so a query naming both, such as "combat healing", finds it, and it
 * is labelled like a guide article, because both open a section of a page.
 */
function withSections(docs: readonly IndexedDoc[]): IndexedDoc[] {
  const result = [...docs];
  const articleAt = new Map(
    result.flatMap((doc, at) =>
      doc.kind === "guide_topic" ? [[doc.href, at] as const] : [],
    ),
  );
  const pages = MECHANICS_GROUPS.flatMap((group) => [...group.pages]);
  for (const mechanics of pages) {
    const path = mechanics.href.split("#")[0];
    for (const section of MECHANICS_SECTIONS[mechanics.href]) {
      const href = `${path}#${section.id}`;
      const at = articleAt.get(href);
      if (at === undefined) {
        result.push({
          kind: "section",
          id: href,
          name: section.label,
          href,
          label: entityRegistry.guide_topic.label,
          detail: mechanics.title,
          image: null,
          aliases: "",
          keywords: mechanics.title,
          content: "",
        });
      } else {
        const article = result[at];
        result[at] = {
          ...article,
          aliases:
            `${article.aliases} ${section.label} ${mechanics.title}`.trim(),
          detail: mechanics.title,
        };
      }
    }
  }
  return result;
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
  return [...withSections([...entityDocs(db), ...pageDocs()]), ...listDocs()];
}
