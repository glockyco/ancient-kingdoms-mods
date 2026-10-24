import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { queryAcquisitionRows } from "../src/lib/acquisition/queries.ts";
import { assembleAcquisitionModel } from "../src/lib/acquisition/assemble.ts";
import { publicAcquisitionFingerprint } from "../src/lib/acquisition/fingerprint.ts";
import { projectItemSources } from "../src/lib/acquisition/projections.ts";
import { PAGE_FINGERPRINT_FIELDS } from "./page-fingerprint-fields.mjs";

const SITE_URL = "https://ancient-kingdoms.compendiums.org";
const DB_PATH = resolve("data/compendium.db");
const MANIFEST_PATH = resolve("static/sitemap-manifest.json");
const ENTITY_MANIFEST = JSON.parse(
  readFileSync(resolve("src/lib/entities/entity-manifest.json"), "utf8"),
);
const ENTITIES = ENTITY_MANIFEST.filter(
  (entry) => entry.sitemap && entry.table && entry.detailPrefix,
).map((entry) => ({
  table: entry.table,
  route: entry.overviewHref.replace(/^\//, ""),
}));
const RECIPE_TABLES = [
  "crafting_recipes",
  "alchemy_recipes",
  "scribing_recipes",
];
const PROVIDER_ENTITIES = {
  monster_spawns: "monster_spawns",
  npcs: "npcs",
  altars: "altars",
  resource_spawns: "gathering_resource_spawns",
  chests: "chests",
  crafting_stations: "crafting_stations",
  alchemy_tables: "alchemy_tables",
  scribing_tables: "scribing_tables",
  items: "items",
  classes: "classes",
  treasure_locations: "treasure_locations",
};
const PROFESSION_DATA_TABLES = {
  adventuring: [
    "npcs",
    "npc_spawns",
    "zones",
    "zone_triggers",
    "quests",
    "monsters",
    "items",
  ],
  alchemy: ["alchemy_recipes", "alchemy_tables", "items", "npcs", "quests"],
  cooking: ["crafting_recipes", "crafting_stations", "items"],
  exploring: ["zone_triggers", "zones", "monster_spawns", "monsters"],
  fishing: [
    "gathering_resources",
    "gathering_resource_spawns",
    "zones",
    "items",
    "fish",
    "crafting_recipes",
    "alchemy_recipes",
  ],
  herbalism: ["gathering_resources", "items"],
  hunter: ["monsters"],
  lore_keeping: ["items", "visual_assets", "monsters"],
  mining: [
    "gathering_resources",
    "gathering_resource_spawns",
    "zones",
    "items",
    "quests",
    "npcs",
  ],
  radiant_seeker: [
    "gathering_resources",
    "gathering_resource_spawns",
    "zones",
    "items",
  ],
  scroll_mastery: ["items", "skills", "scribing_recipes", "scribing_tables"],
  slayer: [
    "achievements",
    "monsters",
    "monster_spawns",
    "zones",
    "visual_assets",
  ],
  treasure_hunter: ["items", "treasure_locations", "zones", "zone_triggers"],
};

/**
 * Hash a semantic value as a type-framed Merkle tree. Scalars are framed inline.
 * Composite children use fixed-width SHA-256 hex, independent of object sharing.
 */
export function createSemanticHasher() {
  const digests = new WeakMap();
  const mutableDescendants = new WeakSet();
  const keyFrames = new Map();
  function frame(value) {
    if (value === null) return "n";
    if (value === undefined) return "u";
    if (typeof value === "boolean") return value ? "b1" : "b0";
    if (typeof value === "number") {
      if (!Number.isFinite(value))
        throw new Error("sitemap-manifest: nonfinite semantic number");
      return `d${JSON.stringify(value)};`;
    }
    if (typeof value === "string") {
      const encoded = JSON.stringify(value);
      return `s${Buffer.byteLength(encoded)}:${encoded}`;
    }
    if (typeof value === "object") return `h${digest(value)}`;
    throw new Error(
      `sitemap-manifest: unsupported semantic value ${typeof value}`,
    );
  }
  function digest(value) {
    if (value && typeof value === "object") {
      const cached = digests.get(value);
      if (cached) return cached;
    }
    const parts = [];
    let immutable =
      value !== null && typeof value === "object" && Object.isFrozen(value);
    if (Array.isArray(value)) {
      parts.push(`a${value.length}:`);
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        if (descriptor && !Object.hasOwn(descriptor, "value"))
          throw new Error(
            "sitemap-manifest: semantic accessors are unsupported",
          );
        const child = value[index];
        parts.push(frame(child));
        if (
          child &&
          typeof child === "object" &&
          (!Object.isFrozen(child) || mutableDescendants.has(child))
        )
          immutable = false;
      }
    } else if (
      value !== null &&
      typeof value === "object" &&
      (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null)
    ) {
      const keys = Object.keys(value).sort();
      parts.push(`o${keys.length}:`);
      for (const key of keys) {
        let keyFrame = keyFrames.get(key);
        if (keyFrame === undefined) {
          const encoded = JSON.stringify(key);
          keyFrames.set(
            key,
            (keyFrame = `k${Buffer.byteLength(encoded)}:${encoded}`),
          );
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!Object.hasOwn(descriptor, "value"))
          throw new Error(
            "sitemap-manifest: semantic accessors are unsupported",
          );
        const child = descriptor.value;
        parts.push(keyFrame, frame(child));
        if (
          child &&
          typeof child === "object" &&
          (!Object.isFrozen(child) || mutableDescendants.has(child))
        )
          immutable = false;
      }
    } else if (value === null || typeof value !== "object")
      parts.push(frame(value));
    else throw new Error("sitemap-manifest: unsupported semantic object");
    // Only this node's frames are joined. Descendant composites never expand here.
    const result = createHash("sha256").update(parts.join("")).digest("hex");
    if (immutable) digests.set(value, result);
    else if (value && typeof value === "object" && Object.isFrozen(value))
      mutableDescendants.add(value);
    return result;
  }
  return digest;
}
export function hashRow(value) {
  return createSemanticHasher()(value);
}
function validateGenerated(generated) {
  if (
    typeof generated !== "string" ||
    !Number.isFinite(Date.parse(generated)) ||
    new Date(generated).toISOString() !== generated
  )
    throw new Error("sitemap-manifest: generation instant must be UTC ISO");
}
function validateManifest(manifest) {
  if (manifest?.version !== 2 || manifest.hash_scheme !== "compendium-page-v2")
    throw new Error("sitemap-manifest: unsupported baseline scheme");
  validateGenerated(manifest.generated);
  if (
    !manifest.entries ||
    typeof manifest.entries !== "object" ||
    Array.isArray(manifest.entries)
  )
    throw new Error("sitemap-manifest: invalid entries");
  for (const [url, entry] of Object.entries(manifest.entries)) {
    const keys = entry && typeof entry === "object" ? Object.keys(entry) : null;
    const bare = keys?.length === 0;
    const hashed =
      keys?.length === 2 &&
      typeof entry.hash === "string" &&
      entry.hash.length > 0 &&
      typeof entry.lastmod === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod) &&
      Number.isFinite(Date.parse(`${entry.lastmod}T00:00:00.000Z`)) &&
      new Date(`${entry.lastmod}T00:00:00.000Z`).toISOString().slice(0, 10) ===
        entry.lastmod;
    if (Array.isArray(entry) || (!bare && !hashed))
      throw new Error(`sitemap-manifest: invalid entry ${url}`);
  }
}
export function mergeManifests(prev, next, today, generated) {
  validateGenerated(generated);
  if (today !== generated.slice(0, 10))
    throw new Error("sitemap-manifest: date differs from generation instant");
  if (prev !== null) validateManifest(prev);
  const entries = {};
  for (const url of Object.keys(next.hashes).sort()) {
    const hash = next.hashes[url];
    const prior = prev?.entries[url];
    entries[url] = {
      hash,
      lastmod:
        prior && "hash" in prior && prior.hash === hash ? prior.lastmod : today,
    };
  }
  for (const url of [...next.bareUrls].sort()) entries[url] = {};
  return {
    version: 2,
    hash_scheme: "compendium-page-v2",
    generated,
    entries: Object.fromEntries(
      Object.keys(entries)
        .sort()
        .map((url) => [url, entries[url]]),
    ),
  };
}
function loadPrevManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  const previous = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  validateManifest(previous);
  return previous;
}
function columns(table, alias = "") {
  const fields = PAGE_FINGERPRINT_FIELDS[table];
  if (!fields) throw new Error(`Missing scalar sitemap fields for ${table}`);
  return fields
    .map((field) => `${alias ? `${alias}.` : ""}"${field}"`)
    .join(", ");
}
function createBuildReader(connection) {
  const statements = new Map();
  return {
    prepare(sql) {
      let reader = statements.get(sql);
      if (!reader) {
        const statement = connection.prepare(sql),
          results = new Map();
        reader = {
          all(...params) {
            const key = JSON.stringify(params);
            if (results.has(key)) return results.get(key);
            const rows = statement.all(...params);
            for (const row of rows) Object.freeze(row);
            Object.freeze(rows);
            results.set(key, rows);
            return rows;
          },
        };
        statements.set(sql, reader);
      }
      return reader;
    },
  };
}

function all(db, sql, ...params) {
  return db.prepare(sql).all(...params);
}
function tableRows(db, table, where = "", params = []) {
  const fields = PAGE_FINGERPRINT_FIELDS[table];
  return all(
    db,
    `SELECT ${columns(table)} FROM ${table} ${where} ORDER BY ${fields.map((field) => `"${field}"`).join(", ")}`,
    ...params,
  );
}
function rowById(db, table, id) {
  return tableRows(db, table).find((row) => row.id === id) ?? null;
}
function rowsByColumn(db, table, column, value) {
  return tableRows(db, table).filter((row) => row[column] === value);
}
function rowsByIds(db, table, ids) {
  const unique = new Set(ids.filter((id) => id !== null && id !== undefined));
  return tableRows(db, table)
    .filter((row) => unique.has(row.id))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function hashWriter(hashes) {
  const hash = createSemanticHasher();
  return (path, payload) => {
    hashes[`${SITE_URL}${path}`] = hash(payload);
  };
}

async function acquisitionContext(db) {
  const execute = async (sql, params) => all(db, sql, ...params);
  const ids = (table) =>
    all(db, `SELECT id FROM ${table} ORDER BY id`).map((row) => row.id);
  const itemIds = ids("items");
  const monsterIds = ids("monsters");
  const recipeIds = [...new Set(RECIPE_TABLES.flatMap(ids))].sort();
  const providers = Object.entries(PROVIDER_ENTITIES).flatMap(([kind, table]) =>
    ids(table).map((id) => ({ kind, id })),
  );
  const requirementEntities = [
    ["item", "items"],
    ["skill", "skills"],
    ["quest", "quests"],
    ["portal", "portals"],
    ["resource", "gathering_resources"],
    ["summon_trigger", "summon_triggers"],
  ].flatMap(([kind, table]) => ids(table).map((id) => ({ kind, id })));
  const load = async (request) =>
    assembleAcquisitionModel(await queryAcquisitionRows(execute, request));
  const models = {
    items: await load({ kind: "items", itemIds }),
    monsters: await load({ kind: "monsters", monsterIds }),
    providers: await load({ kind: "providers", providers }),
    recipes: await load({ kind: "recipes", recipeIds }),
    requirements: await load({
      kind: "requirements",
      entities: requirementEntities,
    }),
  };
  return {
    models,
    itemIds,
    monsterIds,
    recipeIds,
    providers,
    requirementEntities,
    fingerprint: (kind, selection) =>
      publicAcquisitionFingerprint(models[kind], { kind, ...selection }),
  };
}
function itemPayload(db, id, context) {
  const item = rowById(db, "items", id);
  const skillIds = [
    item.potion_buff_id,
    item.food_buff_id,
    item.relic_buff_id,
    item.scroll_skill_id,
    item.weapon_proc_effect_id,
  ].filter(Boolean);
  return {
    row: item,
    acquisition: context.fingerprint("items", { itemIds: [id] }),
    referencedSkills: rowsByIds(db, "skills", skillIds),
  };
}
function monsterPayload(db, id, context) {
  const spawns = rowsByColumn(db, "monster_spawns", "monster_id", id);
  return {
    row: rowById(db, "monsters", id),
    spawns,
    spawnZones: rowsByIds(
      db,
      "zones",
      spawns.map((spawn) => spawn.zone_id),
    ),
    skills: rowsByColumn(db, "monster_skills", "monster_id", id),
    invasions: all(
      db,
      `SELECT ri.*, z.name AS zone_name FROM regional_invasions ri
       JOIN regional_invasion_attackers ria ON ria.invasion_id = ri.id
       JOIN zones z ON z.id = ri.zone_id
       WHERE ria.monster_id = ? ORDER BY ri.id`,
      id,
    ),
    loot: context.fingerprint("monsters", { monsterIds: [id] }),
  };
}
function npcPayload(db, id, context) {
  return {
    row: rowById(db, "npcs", id),
    spawns: rowsByColumn(db, "npc_spawns", "npc_id", id),
    skills: all(
      db,
      "SELECT skill_id, skill_index FROM npc_skills WHERE npc_id = ? ORDER BY skill_index",
      id,
    ),
    acquisition: context.fingerprint("providers", {
      providers: [{ kind: "npcs", id }],
    }),
  };
}
function questPayload(db, id, context) {
  return {
    row: rowById(db, "quests", id),
    npcs: all(
      db,
      `SELECT ${columns("npcs", "n")}, m.role, m.ordinal FROM npc_quest_memberships m JOIN npcs n ON n.id = m.npc_id WHERE m.quest_id = ? ORDER BY m.role, m.ordinal, n.id`,
      id,
    ),
    requirements: context.fingerprint("requirements", {
      entities: [{ kind: "quest", id }],
    }),
  };
}
function zonePayload(db, id, context) {
  const entries = { row: rowById(db, "zones", id) };
  for (const [name, table, column] of [
    ["altars", "altars", "zone_id"],
    ["chests", "chests", "zone_id"],
    ["gatheringResourceSpawns", "gathering_resource_spawns", "zone_id"],
    ["houses", "houses", "zone_id"],
    ["monsterSpawns", "monster_spawns", "zone_id"],
    ["npcSpawns", "npc_spawns", "zone_id"],
    ["portalsFrom", "portals", "from_zone_id"],
    ["portalsTo", "portals", "to_zone_id"],
    ["treasureLocations", "treasure_locations", "zone_id"],
    ["zoneTriggers", "zone_triggers", "zone_id"],
  ])
    entries[name] = rowsByColumn(db, table, column, id);
  const providers = [
    ...entries.monsterSpawns.map((row) => ({
      kind: "monster_spawns",
      id: row.id,
    })),
    ...entries.npcSpawns.map((row) => ({ kind: "npcs", id: row.npc_id })),
    ...entries.gatheringResourceSpawns.map((row) => ({
      kind: "resource_spawns",
      id: row.id,
    })),
    ...entries.chests.map((row) => ({ kind: "chests", id: row.id })),
    ...entries.altars.map((row) => ({ kind: "altars", id: row.id })),
    ...entries.treasureLocations.map((row) => ({
      kind: "treasure_locations",
      id: row.id,
    })),
  ];
  for (const table of [
    "crafting_stations",
    "alchemy_tables",
    "scribing_tables",
  ])
    providers.push(
      ...rowsByColumn(db, table, "zone_id", id).map((row) => ({
        kind: table,
        id: row.id,
      })),
    );
  entries.acquisition = context.fingerprint("providers", { providers });
  return entries;
}
function chestPayload(db, id, context) {
  return {
    row: rowById(db, "chests", id),
    acquisition: context.fingerprint("providers", {
      providers: [{ kind: "chests", id }],
    }),
  };
}
function gatheringPayload(db, id, context) {
  const spawns = rowsByColumn(
    db,
    "gathering_resource_spawns",
    "resource_id",
    id,
  );
  return {
    row: rowById(db, "gathering_resources", id),
    spawns,
    acquisition: context.fingerprint("providers", {
      providers: spawns.map((row) => ({ kind: "resource_spawns", id: row.id })),
    }),
    requirements: context.fingerprint("requirements", {
      entities: [{ kind: "resource", id }],
    }),
  };
}
function skillPayload(db, id, context) {
  const row = rowById(db, "skills", id);
  const payload = {
    row,
    monsterUsers: rowsByColumn(db, "monster_skills", "skill_id", id),
    petUsers: rowsByColumn(db, "pet_skills", "skill_id", id),
    npcUsers: all(
      db,
      `SELECT ${columns("npcs", "n")}, s.skill_index FROM npc_skills s JOIN npcs n ON n.id = s.npc_id WHERE s.skill_id = ? ORDER BY n.id, s.skill_index`,
      id,
    ),
    requirements: context.fingerprint("requirements", {
      entities: [{ kind: "skill", id }],
    }),
  };
  for (const [name, column] of [
    ["scrollItems", "scroll_skill_id"],
    ["procItems", "weapon_proc_effect_id"],
    ["potionItems", "potion_buff_id"],
    ["foodItems", "food_buff_id"],
    ["relicItems", "relic_buff_id"],
  ])
    payload[name] = rowsByColumn(db, "items", column, id);
  if (row.is_dispel)
    payload.monsterBuffs = all(
      db,
      `SELECT DISTINCT s.id, s.name, s.prob_ignore_cleanse FROM skills s JOIN monster_skills ms ON ms.skill_id = s.id WHERE s.skill_type IN ('target_buff', 'area_buff') AND s.is_cleanse = 0 AND s.prob_ignore_cleanse > 0 ORDER BY s.id`,
    );
  return payload;
}
function classPayload(db, id, context) {
  const requiredItems = tableRows(
    db,
    "items",
    "WHERE id IN (SELECT item_id FROM item_class_requirements WHERE class_id = ?)",
    [id],
  );
  return {
    row: rowById(db, "classes", id),
    requiredItems,
    acquisition: context.fingerprint("items", {
      itemIds: requiredItems.map((item) => item.id),
    }),
    creation: context.fingerprint("providers", {
      providers: [{ kind: "classes", id }],
    }),
  };
}
function altarPayload(db, id, context) {
  return {
    row: rowById(db, "altars", id),
    acquisition: context.fingerprint("providers", {
      providers: [{ kind: "altars", id }],
    }),
  };
}
function factionPayload(db, id, context) {
  const faction = rowById(db, "factions", id);
  const name = faction.name;
  const items = tableRows(
    db,
    "items",
    "WHERE faction_required_to_buy > 0 AND id IN (SELECT v.offered_item_id FROM acquisition_vendor_details v JOIN npcs n ON n.id = v.npc_id WHERE n.faction = ?)",
    [name],
  );
  return {
    row: faction,
    tiers: tableRows(db, "reputation_tiers"),
    nav: all(db, "SELECT id, name FROM factions ORDER BY id"),
    monsters: tableRows(
      db,
      "monsters",
      "WHERE is_dummy = 0 AND EXISTS (SELECT 1 FROM json_each(improve_faction) WHERE value = ?)",
      [name],
    ),
    monstersDecrease: tableRows(
      db,
      "monsters",
      "WHERE is_dummy = 0 AND EXISTS (SELECT 1 FROM json_each(decrease_faction) WHERE value = ?)",
      [name],
    ),
    npcs: rowsByColumn(db, "npcs", "faction", name),
    npcKills: tableRows(
      db,
      "npcs",
      "WHERE EXISTS (SELECT 1 FROM json_each(improve_faction) WHERE value = ?) OR EXISTS (SELECT 1 FROM json_each(decrease_faction) WHERE value = ?)",
      [name, name],
    ),
    chests: rowsByColumn(db, "chests", "decrease_faction", name),
    houses: rowsByColumn(db, "houses", "faction_id", name),
    quests: tableRows(
      db,
      "quests",
      "WHERE is_adventurer_quest = 0 AND id IN (SELECT m.quest_id FROM npc_quest_memberships m JOIN npcs n ON n.id = m.npc_id WHERE m.role = 'offer' AND n.faction = ?)",
      [name],
    ),
    items,
    acquisition: context.fingerprint("items", {
      itemIds: items.map((item) => item.id),
    }),
  };
}
function petPayload(db, id) {
  const row = rowById(db, "pets", id);
  const payload = { row, skills: rowsByColumn(db, "pet_skills", "pet_id", id) };
  if (!row.is_mercenary) return payload;
  return {
    ...payload,
    slots: all(
      db,
      "SELECT slot_index, accepted_category FROM equipment_slots WHERE owner_type = 'mercenary' AND owner_id = lower(?) ORDER BY slot_index",
      row.type_monster,
    ),
    recruiters: all(
      db,
      "SELECT n.id, n.name, n.preferred_mercenary_race, s.zone_id FROM npcs n JOIN npc_spawns s ON s.npc_id = n.id WHERE json_extract(n.roles, '$.is_recruiter_mercenaries') = 1 ORDER BY n.id, s.zone_id",
    ),
    curves: all(
      db,
      "SELECT type_monster, health_base, health_per_level, mana_base, mana_per_level FROM pets WHERE is_mercenary = 1 ORDER BY type_monster",
    ),
  };
}
const DETAIL_PAYLOADS = {
  items: itemPayload,
  monsters: monsterPayload,
  npcs: npcPayload,
  quests: questPayload,
  zones: zonePayload,
  chests: chestPayload,
  gathering_resources: gatheringPayload,
  skills: skillPayload,
  classes: classPayload,
  altars: altarPayload,
  factions: factionPayload,
};

export async function computeHashes() {
  const connection = new Database(DB_PATH, { readonly: true });
  const db = createBuildReader(connection);
  try {
    const context = await acquisitionContext(db);
    const hashes = {};
    const addHash = hashWriter(hashes);
    for (const { table, route } of ENTITIES) {
      const payloadFor = DETAIL_PAYLOADS[table];
      if (!payloadFor)
        throw new Error(`No payload function for table ${table}`);
      for (const { id } of all(db, `SELECT id FROM ${table} ORDER BY id`))
        addHash(`/${route}/${id}`, payloadFor(db, id, context));
    }
    for (const { id, is_mercenary } of all(
      db,
      "SELECT id, is_mercenary FROM pets ORDER BY id",
    ))
      addHash(
        `/${is_mercenary ? "mercenaries" : "summons"}/${id}`,
        petPayload(db, id),
      );
    for (const id of context.recipeIds)
      addHash(
        `/recipes/${id}`,
        context.fingerprint("recipes", { recipeIds: [id] }),
      );
    addOverviewHashes(db, addHash, context);
    addMechanicsHashes(db, addHash, context);
    addProfessionHashes(db, addHash, context);
    addHash("/achievements", {
      rows: tableRows(db, "achievements"),
      icons: tableRows(db, "visual_assets", "WHERE domain = 'achievement'"),
      source: fileHash("src/routes/achievements/+page.svelte"),
      server: fileHash(
        "src/routes/achievements/achievements-page-data.server.ts",
      ),
      catalog: fileHash("src/lib/data/achievements/catalog.ts"),
      relationships: fileHash("src/lib/data/achievements/relationships.ts"),
    });
    // These pages have no reliable content date because they also depend on live version/map assets.
    return { hashes, bareUrls: [`${SITE_URL}/`, `${SITE_URL}/map`] };
  } finally {
    connection.close();
  }
}
function addOverviewHashes(db, addHash, context) {
  addHash("/items", {
    items: tableRows(db, "items"),
    acquisition: context.fingerprint("items", { itemIds: context.itemIds }),
  });
  addHash("/monsters", {
    monsters: tableRows(db, "monsters"),
    spawns: tableRows(db, "monster_spawns"),
    loot: context.fingerprint("monsters", { monsterIds: context.monsterIds }),
  });
  addHash("/npcs", {
    npcs: tableRows(db, "npcs"),
    spawns: tableRows(db, "npc_spawns"),
    acquisition: context.fingerprint("providers", {
      providers: context.providers.filter(
        (provider) => provider.kind === "npcs",
      ),
    }),
  });
  for (const [route, table] of [
    ["zones", "zones"],
    ["quests", "quests"],
    ["chests", "chests"],
    ["traps", "traps"],
    ["gather-items", "gathering_resources"],
    ["skills", "skills"],
    ["classes", "classes"],
    ["altars", "altars"],
  ]) {
    const rows = tableRows(db, table);
    let acquisition;
    if (
      table === "quests" ||
      table === "skills" ||
      table === "gathering_resources"
    ) {
      const kind =
        table === "quests"
          ? "quest"
          : table === "skills"
            ? "skill"
            : "resource";
      acquisition = context.fingerprint("requirements", {
        entities: rows.map((row) => ({ kind, id: row.id })),
      });
    }
    if (table === "chests" || table === "altars")
      acquisition = context.fingerprint("providers", {
        providers: rows.map((row) => ({ kind: table, id: row.id })),
      });
    addHash(`/${route}`, {
      rows,
      ...(acquisition === undefined ? {} : { acquisition }),
    });
  }
  addHash("/factions", {
    factions: tableRows(db, "factions"),
    tiers: tableRows(db, "reputation_tiers"),
  });
  addHash("/mercenaries", {
    pets: tableRows(db, "pets", "WHERE is_mercenary = 1"),
    skills: tableRows(
      db,
      "pet_skills",
      "WHERE pet_id IN (SELECT id FROM pets WHERE is_mercenary = 1)",
    ),
    recruiters: all(
      db,
      "SELECT n.id, n.name, n.preferred_mercenary_race, s.zone_id FROM npcs n JOIN npc_spawns s ON s.npc_id = n.id WHERE json_extract(n.roles, '$.is_recruiter_mercenaries') = 1 ORDER BY n.id, s.zone_id",
    ),
    source: fileHash("src/routes/mercenaries/+page.svelte"),
  });
  addHash("/summons", tableRows(db, "pets", "WHERE is_mercenary = 0"));
  addHash(
    "/recipes",
    context.fingerprint("recipes", { recipeIds: context.recipeIds }),
  );
}
function staticSectionPages(section) {
  const directory = join("src/routes", section);
  return [
    "",
    ...readdirSync(directory, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(join(directory, entry.name, "+page.svelte")),
      )
      .map((entry) => entry.name)
      .sort(),
  ];
}
function pageParts(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      const name = prefix + entry.name;
      if (entry.isDirectory())
        return existsSync(join(path, "+page.svelte"))
          ? []
          : pageParts(path, `${name}/`);
      if (
        !/\.(svelte|ts)$/.test(entry.name) ||
        entry.name.endsWith(".test.ts") ||
        (prefix === "" && entry.name.startsWith("+page"))
      )
        return [];
      return [[name, fileHash(path)]];
    });
}
function pageSources(section, slug) {
  const directory = join("src/routes", section, slug);
  const server = join(directory, "+page.server.ts");
  const parts = pageParts(directory);
  return {
    source: fileHash(join(directory, "+page.svelte")),
    ...(existsSync(server) ? { server: fileHash(server) } : {}),
    ...(parts.length ? { parts: Object.fromEntries(parts) } : {}),
  };
}
function addMechanicsHashes(db, addHash, context) {
  for (const slug of staticSectionPages("mechanics")) {
    let rows;
    switch (slug) {
      case "character":
        rows = {
          npcs: tableRows(
            db,
            "npcs",
            "WHERE json_extract(roles, '$.is_skill_master') = 1 OR json_extract(roles, '$.is_veteran_master') = 1 OR json_extract(roles, '$.is_reset_attributes') = 1",
          ),
          items: rowsByIds(db, "items", ["token_of_redemption"]),
        };
        break;
      case "experience":
        rows = {
          items: rowsByIds(db, "items", [
            "token_of_redemption",
            "scroll_of_knowledge_v",
          ]),
          npcs: tableRows(
            db,
            "npcs",
            "WHERE json_extract(roles, '$.is_veteran_master') = 1",
          ),
          zones: rowsByIds(db, "zones", [
            "alaenanore_village",
            "thogh_maldur",
            "milldenn",
            "bonebreach",
            "felarii_village",
          ]),
        };
        break;
      case "guilds":
        rows = rowsByIds(db, "monsters", [
          "the_archon",
          "captain_kragek",
          "valaark",
        ]);
        break;
      case "inventory":
        rows = {
          backpacks: tableRows(db, "items", "WHERE item_type = 'backpack'"),
          chests: tableRows(db, "items", "WHERE item_type = 'structure'"),
          houses: tableRows(db, "houses"),
          zones: tableRows(db, "zones"),
          fish: tableRows(db, "fish"),
          fishingSpots: tableRows(
            db,
            "gathering_resources",
            "WHERE is_fishing_spot = 1",
          ),
          sources: context.fingerprint("items", {
            itemIds: all(
              db,
              "SELECT id FROM items WHERE item_type = 'backpack' AND backpack_slots > 0 ORDER BY id",
            ).map((row) => row.id),
          }),
          factions: tableRows(db, "factions"),
          reputationTiers: tableRows(db, "reputation_tiers"),
          armorBreakingSkills: tableRows(
            db,
            "skills",
            "WHERE break_armor_prob > 0",
          ),
          dungeonRefusedPotions: all(
            db,
            "SELECT id, name FROM items WHERE potion_buff_id IS NOT NULL AND potion_buff_allow_dungeon = 0 ORDER BY id",
          ),
        };
        break;
      case "mercenary-stats":
        rows = {
          pets: tableRows(db, "pets", "WHERE is_mercenary = 1"),
          npcs: tableRows(db, "npcs"),
          npcSpawns: tableRows(db, "npc_spawns"),
          zones: tableRows(db, "zones"),
        };
        break;
      case "monster-spawns":
        rows = {
          monsters: tableRows(db, "monsters"),
          spawns: tableRows(db, "monster_spawns"),
          triggers: tableRows(db, "summon_triggers"),
          placeholders: tableRows(db, "summon_trigger_placeholders"),
          npcs: tableRows(db, "npcs"),
          zones: tableRows(db, "zones"),
        };
        break;
      case "regional-events": {
        const attackers = tableRows(db, "regional_invasion_attackers");
        const invasions = tableRows(db, "regional_invasions");
        rows = {
          settings: tableRows(db, "regional_event_settings"),
          invasions,
          attackers,
          monsters: rowsByIds(
            db,
            "monsters",
            attackers.map((attacker) => attacker.monster_id),
          ),
          zones: tableRows(db, "zones"),
        };
        break;
      }
      case "seasonal-events": {
        const monsters = tableRows(db, "monsters", "WHERE is_halloween = 1");
        const npcs = tableRows(db, "npcs", "WHERE is_christmas_npc = 1");
        const memberships = all(
          db,
          "SELECT quest_id, npc_id, role, ordinal FROM npc_quest_memberships WHERE quest_id IN (SELECT m.quest_id FROM npc_quest_memberships m JOIN npcs n ON n.id = m.npc_id WHERE m.role = 'offer' AND n.is_christmas_npc = 1) ORDER BY quest_id, role, ordinal, npc_id",
        );
        // Seasonal shop items, their currencies and the quest rewards.
        const itemIds = all(
          db,
          "SELECT offered_item_id AS id FROM acquisition_vendor_details WHERE season != 'none' UNION SELECT i.item_id FROM acquisition_vendor_details v JOIN acquisition_cost_groups g ON g.method_id = v.id JOIN acquisition_inputs i ON i.cost_group_id = g.id WHERE v.season != 'none' AND i.item_id IS NOT NULL UNION SELECT r.item_id FROM quest_reward_slots r WHERE r.quest_id IN (SELECT quest_id FROM npc_quest_memberships m JOIN npcs n ON n.id = m.npc_id WHERE m.role = 'offer' AND n.is_christmas_npc = 1) ORDER BY id",
        ).map((row) => row.id);
        rows = {
          monsters,
          monsterSpawns: tableRows(db, "monster_spawns").filter((row) =>
            monsters.some((monster) => monster.id === row.monster_id),
          ),
          npcs,
          npcSpawns: tableRows(db, "npc_spawns").filter((row) =>
            npcs.some((npc) => npc.id === row.npc_id),
          ),
          memberships,
          quests: rowsByIds(
            db,
            "quests",
            memberships.map((row) => row.quest_id),
          ),
          questNpcs: rowsByIds(
            db,
            "npcs",
            memberships.map((row) => row.npc_id),
          ),
          zones: tableRows(db, "zones"),
          items: context.fingerprint("items", { itemIds }),
          loot: context.fingerprint("monsters", {
            monsterIds: monsters.map((monster) => monster.id),
          }),
          icons: tableRows(db, "visual_assets", "WHERE domain = 'item'"),
        };
        break;
      }
      case "reputation":
        rows = {
          tiers: tableRows(db, "reputation_tiers"),
          factions: tableRows(db, "factions"),
          notableNpcs: tableRows(db, "npcs", "WHERE is_notable = 1"),
        };
        break;
      default:
        if (existsSync(join("src/routes/mechanics", slug, "+page.server.ts")))
          throw new Error(
            `Missing sitemap database dependencies for mechanics/${slug}`,
          );
    }
    addHash(`/mechanics${slug ? `/${slug}` : ""}`, {
      ...pageSources("mechanics", slug),
      ...(rows === undefined ? {} : { rows }),
    });
  }
}
function professionAcquisition(db, slug, context) {
  if (["herbalism", "mining", "fishing", "radiant_seeker"].includes(slug)) {
    const flag = {
      herbalism: "is_plant",
      mining: "is_mineral",
      fishing: "is_fishing_spot",
      radiant_seeker: "is_radiant_spark",
    }[slug];
    const providers = all(
      db,
      `SELECT spawn.id FROM gathering_resource_spawns spawn JOIN gathering_resources resource ON resource.id = spawn.resource_id WHERE resource.${flag} = 1 ORDER BY spawn.id`,
    ).map((row) => ({ kind: "resource_spawns", id: row.id }));
    const resources = context.fingerprint("providers", { providers });
    if (slug === "herbalism") return { resources };
    if (slug === "fishing") {
      const rods = all(
        db,
        "SELECT id FROM items WHERE weapon_category = 'Fishing Rod' ORDER BY id",
      ).map((row) => row.id);
      const recipes = all(
        db,
        `SELECT DISTINCT COALESCE(detail.crafting_recipe_id, detail.alchemy_recipe_id) AS id
        FROM acquisition_recipe_details detail JOIN acquisition_cost_groups cost ON cost.method_id = detail.id
        JOIN acquisition_inputs input ON input.cost_group_id = cost.id JOIN fish ON fish.item_id = input.item_id
        WHERE detail.display_kind IN ('cooking', 'alchemy') AND input.withheld = 0 ORDER BY id`,
      ).map((row) => row.id);
      return {
        resources,
        rods: context.fingerprint("items", { itemIds: rods }),
        recipes: context.fingerprint("recipes", { recipeIds: recipes }),
      };
    }
    const primaryItems = all(
      db,
      `SELECT DISTINCT output.item_id AS id FROM acquisition_outputs output
      JOIN acquisition_resource_details detail ON detail.id = output.method_id JOIN gathering_resources resource ON resource.id = detail.resource_id
      WHERE resource.${flag} = 1 AND output.yield_rule != 'pool' AND output.withheld = 0 AND output.item_id IS NOT NULL ORDER BY id`,
    ).map((row) => row.id);
    // Reverse uses retain the displayed recipe counts and mineral quest/vendor memberships.
    const rewards = context.fingerprint("items", { itemIds: primaryItems });
    if (slug === "radiant_seeker") return { resources, rewards };
    const pickaxes = all(
      db,
      "SELECT id FROM items WHERE weapon_category = 'Pickaxe' ORDER BY id",
    ).map((row) => row.id);
    return {
      resources,
      rewards,
      pickaxes: context.fingerprint("items", { itemIds: pickaxes }),
    };
  }
  if (slug === "treasure_hunter") {
    const itemIds = all(
      db,
      `SELECT id FROM items WHERE id IN ('random_map', 'buried_treasure_chest', 'shovel')
      OR id IN (SELECT required_map_id FROM treasure_locations WHERE reward_id = 'buried_treasure_chest') ORDER BY id`,
    ).map((row) => row.id);
    return context.fingerprint("items", { itemIds });
  }
  if (slug === "lore_keeping") {
    const selected = new Set(),
      maxDepth = 8;
    let frontier = all(
      db,
      "SELECT id FROM items WHERE book_text IS NOT NULL AND book_text != '' ORDER BY id",
    ).map((row) => row.id);
    // Limited expansion nodes still expose direct sources, so retain the next frontier too.
    for (let depth = 0; depth <= maxDepth + 1 && frontier.length; depth++) {
      const next = [];
      for (const id of frontier) {
        if (selected.has(id)) continue;
        selected.add(id);
        for (const method of projectItemSources(context.models.items, id)
          .methods)
          for (const group of method.costGroups)
            for (const input of group.inputs)
              if (input.item_id && !input.withheld) next.push(input.item_id);
      }
      frontier = next;
    }
    return context.fingerprint("items", { itemIds: [...selected] });
  }
  return undefined;
}

function addProfessionHashes(db, addHash, context) {
  const professions = tableRows(db, "professions");
  const cached = new Map();
  const rowsFor = (table) => {
    if (!cached.has(table)) cached.set(table, tableRows(db, table));
    return cached.get(table);
  };
  for (const slug of staticSectionPages("professions")) {
    if (!slug) {
      addHash("/professions", {
        professions,
        achievements: rowsFor("achievements"),
        zoneTriggers: rowsFor("zone_triggers"),
        ...pageSources("professions", slug),
      });
      continue;
    }
    const profession = professions.find((row) => row.id === slug);
    if (!profession) throw new Error(`Missing profession row for ${slug}`);
    const dependencies = PROFESSION_DATA_TABLES[slug];
    if (!dependencies)
      throw new Error(
        `Missing sitemap database dependencies for profession ${slug}`,
      );
    let acquisition;
    if (["alchemy", "cooking", "scroll_mastery"].includes(slug)) {
      const kind =
        slug === "alchemy"
          ? "alchemy"
          : slug === "cooking"
            ? "cooking"
            : "scribing";
      const recipeIds = all(
        db,
        "SELECT DISTINCT COALESCE(crafting_recipe_id, alchemy_recipe_id, scribing_recipe_id) AS id FROM acquisition_recipe_details WHERE display_kind = ? ORDER BY id",
        kind,
      ).map((row) => row.id);
      acquisition = context.fingerprint("recipes", { recipeIds });
    } else if (
      [
        "fishing",
        "lore_keeping",
        "mining",
        "radiant_seeker",
        "treasure_hunter",
        "herbalism",
      ].includes(slug)
    )
      acquisition = professionAcquisition(db, slug, context);
    else if (slug === "adventuring")
      acquisition = context.fingerprint("requirements", {
        entities: context.requirementEntities.filter(
          (entity) => entity.kind === "quest",
        ),
      });
    const directory = join("src/routes/professions", slug);
    const helpers = readdirSync(directory)
      .filter((file) => file.endsWith("-page-data.server.ts"))
      .sort()
      .map((file) => fileHash(join(directory, file)));
    addHash(`/professions/${slug}`, {
      profession,
      achievement: rowById(db, "achievements", profession.achievement_id),
      rows: Object.fromEntries(
        dependencies.map((table) => [table, rowsFor(table)]),
      ),
      ...(acquisition === undefined ? {} : { acquisition }),
      ...pageSources("professions", slug),
      helpers,
    });
  }
}
async function main() {
  const generated =
    process.env.COMPENDIUM_SITEMAP_GENERATED ?? new Date().toISOString();
  validateGenerated(generated);
  const previous = loadPrevManifest();
  const next = await computeHashes();
  const merged = mergeManifests(
    previous,
    next,
    generated.slice(0, 10),
    generated,
  );
  const temporary = `${MANIFEST_PATH}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(merged, null, 2)}\n`);
    renameSync(temporary, MANIFEST_PATH);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  const entries = Object.values(merged.entries);
  const hashed = entries.filter((entry) => "hash" in entry).length;
  const bumped = Object.entries(merged.entries).filter(
    ([url, entry]) =>
      "hash" in entry && previous?.entries[url]?.lastmod !== entry.lastmod,
  ).length;
  const removed = Object.keys(previous?.entries ?? {}).filter(
    (url) => !(url in merged.entries),
  ).length;
  console.log(
    `sitemap-manifest: ${hashed} hashed (${bumped} bumped), ${entries.length - hashed} bare, ${removed} removed`,
  );
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  await main();
