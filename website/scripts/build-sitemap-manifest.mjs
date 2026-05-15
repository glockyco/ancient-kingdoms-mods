import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const SITE_URL = "https://ancient-kingdoms.compendiums.org";
const DB_PATH = resolve("static/compendium.db");
const MANIFEST_PATH = resolve("sitemap-manifest.json");

const ENTITIES = [
  { table: "items", route: "items" },
  { table: "monsters", route: "monsters" },
  { table: "npcs", route: "npcs" },
  { table: "zones", route: "zones" },
  { table: "quests", route: "quests" },
  { table: "chests", route: "chests" },
  { table: "gathering_resources", route: "gather-items" },
  { table: "skills", route: "skills" },
  { table: "classes", route: "classes" },
  { table: "altars", route: "altars" },
];

const ITEM_SOURCE_TABLES = [
  "item_source_entries",
  "item_sources_altar",
  "item_sources_chest",
  "item_sources_gather",
  "item_sources_merge",
  "item_sources_monster",
  "item_sources_pack",
  "item_sources_quest",
  "item_sources_random",
  "item_sources_recipe",
  "item_sources_treasure_map",
  "item_sources_vendor",
];

const ITEM_USAGE_TABLES = [
  "item_usages_altar",
  "item_usages_chest",
  "item_usages_portal",
  "item_usages_quest",
  "item_usages_recipe",
];

const PROFESSION_SLUGS = [
  "adventuring",
  "alchemy",
  "cooking",
  "exploring",
  "herbalism",
  "hunter",
  "lore_keeping",
  "mining",
  "radiant_seeker",
  "scroll_mastery",
  "slayer",
  "treasure_hunter",
];

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

export function hashRow(row) {
  return createHash("sha256").update(canonicalJson(row)).digest("hex");
}

export function mergeManifests(prev, next, today) {
  const prevEntries = prev?.entries ?? {};
  const entries = {};

  for (const [url, hash] of Object.entries(next.hashes ?? {})) {
    const prior = prevEntries[url];
    if (prior && "hash" in prior && prior.hash === hash) {
      entries[url] = { hash, lastmod: prior.lastmod };
    } else {
      entries[url] = { hash, lastmod: today };
    }
  }

  for (const url of next.bareUrls ?? []) {
    entries[url] = {};
  }

  return {
    version: 1,
    generated: new Date().toISOString(),
    entries,
  };
}

function loadPrevManifest() {
  if (!existsSync(MANIFEST_PATH)) return { entries: {} };
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function all(db, sql, ...params) {
  return db.prepare(sql).all(...params);
}

function get(db, sql, ...params) {
  return db.prepare(sql).get(...params) ?? null;
}

function rowById(db, table, id) {
  return get(db, `SELECT * FROM ${table} WHERE id = ?`, id);
}

function rowsByColumn(db, table, column, value) {
  return all(
    db,
    `SELECT * FROM ${table} WHERE ${column} = ? ORDER BY rowid`,
    value,
  );
}

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function itemPayload(db, id) {
  const item = rowById(db, "items", id);
  const buffIds = [
    item?.potion_buff_id,
    item?.food_buff_id,
    item?.relic_buff_id,
    item?.scroll_skill_id,
    item?.weapon_proc_effect_id,
  ].filter(Boolean);

  return {
    row: item,
    sources: Object.fromEntries(
      ITEM_SOURCE_TABLES.map((table) => [
        table,
        rowsByColumn(db, table, "item_id", id),
      ]),
    ),
    reverseSources: {
      randomOutcomes: rowsByColumn(
        db,
        "item_sources_random",
        "random_item_id",
        id,
      ),
      packContents: rowsByColumn(db, "item_sources_pack", "pack_item_id", id),
      mergeResults: rowsByColumn(
        db,
        "item_sources_merge",
        "component_item_id",
        id,
      ),
      treasureLocations: rowsByColumn(
        db,
        "treasure_locations",
        "required_map_id",
        id,
      ),
    },
    usages: {
      ...Object.fromEntries(
        ITEM_USAGE_TABLES.map((table) => [
          table,
          rowsByColumn(db, table, "item_id", id),
        ]),
      ),
      currency: rowsByColumn(
        db,
        "item_usages_currency",
        "currency_item_id",
        id,
      ),
      zonesObtainable: rowsByColumn(db, "item_zones_obtainable", "item_id", id),
      zonesUsable: rowsByColumn(db, "item_zones_usable", "item_id", id),
      chestsOpened: rowsByColumn(db, "chests", "key_required_id", id),
    },
    referencedSkills: buffIds.length
      ? all(
          db,
          `SELECT * FROM skills WHERE id IN (${buffIds.map(() => "?").join(",")}) ORDER BY id`,
          ...buffIds,
        )
      : [],
    specialNpcRoleRows: specialItemNpcRows(db, id, item),
  };
}

function specialItemNpcRows(db, id, item) {
  if (id === "primal_essence") {
    return rowsByJsonRole(db, "is_essence_trader");
  }
  if (id === "token_of_redemption") {
    return rowsByJsonRole(db, "is_veteran_master");
  }
  if (item?.item_type === "augment" && !item.augment_armor_set_name) {
    return rowsByJsonRole(db, "is_augmenter");
  }
  if (id === "cursed_rune" || id === "blessed_rune") {
    return rowsByJsonRole(db, "is_priestess");
  }
  if (id === "adventurers_essence") {
    return all(
      db,
      `SELECT * FROM npcs
       WHERE json_extract(roles, '$.is_renewal_sage') = 1
         AND respawn_dungeon_id = 100
       ORDER BY id`,
    );
  }
  return [];
}

function rowsByJsonRole(db, role) {
  return all(
    db,
    `SELECT * FROM npcs WHERE json_extract(roles, '$.${role}') = 1 ORDER BY id`,
  );
}

function monsterPayload(db, id) {
  const drops = rowsByColumn(db, "item_sources_monster", "monster_id", id);
  const dropItemIds = drops.map((drop) => drop.item_id);
  return {
    row: rowById(db, "monsters", id),
    drops,
    spawns: rowsByColumn(db, "monster_spawns", "monster_id", id),
    skills: rowsByColumn(db, "monster_skills", "monster_id", id),
    dropItems: rowsByIds(db, "items", dropItemIds),
    dropItemQuestUsages: rowsByValues(
      db,
      "item_usages_quest",
      "item_id",
      dropItemIds,
    ),
  };
}

function npcPayload(db, id) {
  return {
    row: rowById(db, "npcs", id),
    spawns: rowsByColumn(db, "npc_spawns", "npc_id", id),
    vendorSources: rowsByColumn(db, "item_sources_vendor", "npc_id", id),
    currencyUsages: rowsByColumn(db, "item_usages_currency", "npc_id", id),
  };
}

function questPayload(db, id) {
  return {
    row: rowById(db, "quests", id),
    offeredBy: all(
      db,
      `SELECT * FROM npcs
       WHERE EXISTS (
         SELECT 1 FROM json_each(npcs.quests_offered)
         WHERE json_extract(value, '$.id') = ?
       )
       ORDER BY id`,
      id,
    ),
    completedAt: all(
      db,
      `SELECT * FROM npcs
       WHERE EXISTS (
         SELECT 1 FROM json_each(npcs.quests_completed_here)
         WHERE json_extract(value, '$.id') = ?
       )
       ORDER BY id`,
      id,
    ),
    itemSources: rowsByColumn(db, "item_sources_quest", "quest_id", id),
    itemUsages: rowsByColumn(db, "item_usages_quest", "quest_id", id),
  };
}

function zonePayload(db, id) {
  return {
    row: rowById(db, "zones", id),
    altars: rowsByColumn(db, "altars", "zone_id", id),
    chests: rowsByColumn(db, "chests", "zone_id", id),
    gatheringResourceSpawns: rowsByColumn(
      db,
      "gathering_resource_spawns",
      "zone_id",
      id,
    ),
    houses: rowsByColumn(db, "houses", "zone_id", id),
    monsterSpawns: rowsByColumn(db, "monster_spawns", "zone_id", id),
    npcSpawns: rowsByColumn(db, "npc_spawns", "zone_id", id),
    portalsFrom: rowsByColumn(db, "portals", "from_zone_id", id),
    portalsTo: rowsByColumn(db, "portals", "to_zone_id", id),
    treasureLocations: rowsByColumn(db, "treasure_locations", "zone_id", id),
    zoneTriggers: rowsByColumn(db, "zone_triggers", "zone_id", id),
  };
}

function chestPayload(db, id) {
  return {
    row: rowById(db, "chests", id),
    sources: rowsByColumn(db, "item_sources_chest", "chest_id", id),
    usages: rowsByColumn(db, "item_usages_chest", "chest_id", id),
  };
}

function gatheringPayload(db, id) {
  return {
    row: rowById(db, "gathering_resources", id),
    spawns: rowsByColumn(db, "gathering_resource_spawns", "resource_id", id),
    sources: rowsByColumn(db, "item_sources_gather", "resource_id", id),
  };
}

function skillPayload(db, id) {
  return {
    row: rowById(db, "skills", id),
    monsterUsers: rowsByColumn(db, "monster_skills", "skill_id", id),
    petUsers: rowsByColumn(db, "pet_skills", "skill_id", id),
    scrollItems: rowsByColumn(db, "items", "scroll_skill_id", id),
    procItems: rowsByColumn(db, "items", "weapon_proc_effect_id", id),
    potionItems: rowsByColumn(db, "items", "potion_buff_id", id),
    foodItems: rowsByColumn(db, "items", "food_buff_id", id),
    relicItems: rowsByColumn(db, "items", "relic_buff_id", id),
  };
}

function classPayload(db, id) {
  return {
    row: rowById(db, "classes", id),
    requiredItems: rowsByColumn(db, "items", "class_required", id),
  };
}

function altarPayload(db, id) {
  return {
    row: rowById(db, "altars", id),
    sources: rowsByColumn(db, "item_sources_altar", "altar_id", id),
    usages: rowsByColumn(db, "item_usages_altar", "altar_id", id),
  };
}

function petPayload(db, id) {
  return {
    row: rowById(db, "pets", id),
    skills: rowsByColumn(db, "pet_skills", "pet_id", id),
  };
}

function recipePayload(db, table, id) {
  return {
    table,
    row: rowById(db, table, id),
    source: rowsByColumn(db, "item_sources_recipe", "recipe_id", id),
    usages: rowsByColumn(db, "item_usages_recipe", "recipe_id", id),
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
};

function rowsByIds(db, table, ids) {
  return rowsByValues(db, table, "id", ids);
}

function rowsByValues(db, table, column, values) {
  if (values.length === 0) return [];
  return all(
    db,
    `SELECT * FROM ${table} WHERE ${column} IN (${values.map(() => "?").join(",")}) ORDER BY rowid`,
    ...values,
  );
}

function addHash(hashes, path, payload) {
  hashes[`${SITE_URL}${path}`] = hashRow(payload);
}

function computeHashes() {
  const db = new Database(DB_PATH, { readonly: true });
  const hashes = {};

  for (const { table, route } of ENTITIES) {
    const payloadFor = DETAIL_PAYLOADS[table];
    if (!payloadFor) throw new Error(`No payload function for table ${table}`);
    const ids = all(db, `SELECT id FROM ${table} ORDER BY id`);
    for (const { id } of ids)
      addHash(hashes, `/${route}/${id}`, payloadFor(db, id));
  }

  for (const { id } of all(
    db,
    "SELECT id FROM pets WHERE id NOT IN ('rolim','nieven','bemere','ciliren') ORDER BY id",
  )) {
    addHash(hashes, `/pets/${id}`, petPayload(db, id));
  }

  for (const table of [
    "crafting_recipes",
    "alchemy_recipes",
    "scribing_recipes",
  ]) {
    for (const { id } of all(db, `SELECT id FROM ${table} ORDER BY id`)) {
      addHash(hashes, `/recipes/${id}`, recipePayload(db, table, id));
    }
  }

  addOverviewHashes(db, hashes);
  addMechanicsHashes(hashes);
  addProfessionHashes(db, hashes);

  const bareUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}/map`,
    `${SITE_URL}/tools/combat-simulator`,
  ];

  db.close();
  return { hashes, bareUrls };
}

function addOverviewHashes(db, hashes) {
  addHash(hashes, "/items", {
    items: all(
      db,
      `SELECT id, name, item_type, quality, level_required, item_level, slot,
              backpack_slots, class_required, stats,
              alchemy_recipe_level_required, mount_speed,
              augment_is_defensive, augment_armor_set_name,
              (
                SELECT COUNT(*)
                FROM json_each(stats)
                WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set')
                  AND json_each.value != 0
                  AND json_each.value != 0.0
                  AND json_each.value != 'false'
              ) as stat_count,
              (
                SELECT json_group_array(json_each.key)
                FROM json_each(stats)
                WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set')
                  AND json_each.value != 0
                  AND json_each.value != 0.0
                  AND json_each.value != 'false'
              ) as stat_keys
       FROM items ORDER BY name`,
    ),
    itemZones: all(
      db,
      "SELECT * FROM item_zones_obtainable ORDER BY item_id, zone_id, source_type",
    ),
  });
  addHash(hashes, "/monsters", {
    monsters: all(db, "SELECT * FROM monsters ORDER BY id"),
    spawns: all(db, "SELECT * FROM monster_spawns ORDER BY rowid"),
  });
  addHash(hashes, "/npcs", {
    npcs: all(db, "SELECT * FROM npcs ORDER BY id"),
    spawns: all(db, "SELECT * FROM npc_spawns ORDER BY rowid"),
  });
  addHash(hashes, "/zones", all(db, "SELECT * FROM zones ORDER BY id"));
  addHash(hashes, "/quests", all(db, "SELECT * FROM quests ORDER BY id"));
  addHash(hashes, "/chests", all(db, "SELECT * FROM chests ORDER BY id"));
  addHash(
    hashes,
    "/gather-items",
    all(db, "SELECT * FROM gathering_resources ORDER BY id"),
  );
  addHash(hashes, "/skills", all(db, "SELECT * FROM skills ORDER BY id"));
  addHash(hashes, "/classes", all(db, "SELECT * FROM classes ORDER BY id"));
  addHash(hashes, "/altars", all(db, "SELECT * FROM altars ORDER BY id"));
  addHash(
    hashes,
    "/pets",
    all(
      db,
      "SELECT * FROM pets WHERE id NOT IN ('rolim','nieven','bemere','ciliren') ORDER BY id",
    ),
  );
  addHash(hashes, "/recipes", {
    crafting: all(db, "SELECT * FROM crafting_recipes ORDER BY id"),
    alchemy: all(db, "SELECT * FROM alchemy_recipes ORDER BY id"),
    scribing: all(db, "SELECT * FROM scribing_recipes ORDER BY id"),
  });
}

function addMechanicsHashes(hashes) {
  for (const { url, file } of [
    { url: "/mechanics", file: "src/routes/mechanics/+page.svelte" },
    {
      url: "/mechanics/inventory",
      file: "src/routes/mechanics/inventory/+page.svelte",
    },
    {
      url: "/mechanics/combat",
      file: "src/routes/mechanics/combat/+page.svelte",
    },
    {
      url: "/mechanics/experience",
      file: "src/routes/mechanics/experience/+page.svelte",
    },
  ]) {
    hashes[`${SITE_URL}${url}`] = fileHash(file);
  }
}

function addProfessionHashes(db, hashes) {
  const professions = all(db, "SELECT * FROM professions ORDER BY id");
  hashes[`${SITE_URL}/professions`] = hashRow({
    professions,
    source: fileHash("src/routes/professions/+page.svelte"),
    server: fileHash("src/routes/professions/+page.server.ts"),
  });
  for (const slug of PROFESSION_SLUGS) {
    const sourcePath = `src/routes/professions/${slug}/+page.svelte`;
    const serverPath = `src/routes/professions/${slug}/+page.server.ts`;
    hashes[`${SITE_URL}/professions/${slug}`] = hashRow({
      profession: professions.find((p) => p.id === slug) ?? null,
      source: existsSync(sourcePath) ? fileHash(sourcePath) : null,
      server: existsSync(serverPath) ? fileHash(serverPath) : null,
    });
  }
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const prev = loadPrevManifest();
  const next = computeHashes();
  const merged = mergeManifests(prev, next, todayUtc());
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(merged, null, 2)}\n`);

  const entries = Object.values(merged.entries);
  const hashedCount = entries.filter((entry) => "hash" in entry).length;
  const bareCount = entries.length - hashedCount;
  const bumped = Object.entries(merged.entries).filter(
    ([url, entry]) =>
      "hash" in entry && prev.entries?.[url]?.lastmod !== entry.lastmod,
  ).length;
  const removed = Object.keys(prev.entries ?? {}).filter(
    (url) => !(url in merged.entries),
  ).length;
  console.log(
    `sitemap-manifest: ${hashedCount} hashed (${bumped} bumped), ${bareCount} bare, ${removed} removed`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
