import ruleData from "./rules-data.json";
import { METHOD_KINDS, PROVIDER_TABLES } from "./types";
import type {
  AcquisitionQuery,
  AcquisitionRequest,
  AcquisitionRows,
  DataRow,
  MethodRow,
  CostGroupRow,
  InputRow,
  OutputRow,
  PoolEntry,
  ProviderDomain,
  SqlValue,
} from "./types";
export const DETAIL_TABLES = {
  kill: "acquisition_kill_details",
  vendor: "acquisition_vendor_details",
  quest: "acquisition_quest_details",
  recipe: "acquisition_recipe_details",
  resource: "acquisition_resource_details",
  world_chest: "acquisition_world_chest_details",
  item: "acquisition_item_details",
  treasure: "acquisition_treasure_details",
  service: "acquisition_service_details",
  creation: "acquisition_creation_details",
  housing: "acquisition_housing_details",
  cap_xp: "acquisition_cap_xp_details",
  altar: "acquisition_altar_details",
} as const;
const ENTITY_TABLES = [
  "items",
  "monsters",
  "monster_spawns",
  "npcs",
  "npc_spawns",
  "altars",
  "gathering_resources",
  "gathering_resource_spawns",
  "chests",
  "crafting_stations",
  "alchemy_tables",
  "scribing_tables",
  "classes",
  "race_progression",
  "treasure_locations",
  "quests",
  "skills",
  "portals",
  "summon_triggers",
  "zones",
  "zone_triggers",
  "factions",
  "crafting_recipes",
  "alchemy_recipes",
  "scribing_recipes",
  "progression_rules",
] as const;
const FACT_TABLES = [
  "quest_objectives",
  "quest_objective_items",
  "quest_objective_monsters",
  "quest_objective_locations",
  "quest_objective_brews",
  "quest_predecessors",
  "quest_class_requirements",
  "quest_race_requirements",
  "quest_faction_requirements",
  "quest_reward_slots",
  "quest_provided_items",
  "npc_quest_memberships",
  "npc_skills",
  "item_class_requirements",
  "skill_predecessors",
  "loot_monster_rules",
  "loot_chest_rules",
  "loot_fishing_rules",
  "acquisition_method_fishing_rules",
  "item_pool_definitions",
  "acquisition_global_roots",
  "luck_tokens",
  "summon_trigger_placeholders",
] as const;
export function dataError(context: string, message: string): never {
  throw new Error(`acquisition: ${context}: ${message}`);
}
export function text(
  row: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const v = row[key];
  if (typeof v !== "string" || !v) return dataError(context, `invalid ${key}`);
  return v;
}
export function numeric(
  row: Record<string, unknown>,
  key: string,
  context: string,
  nullable = false,
): number | null {
  const v = row[key];
  if (nullable && v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v))
    return dataError(context, `invalid ${key}`);
  return v;
}
export interface RecipeTeachingItemRow extends DataRow {
  readonly result_item_id: string;
  readonly name: string;
  readonly tooltip_html: string | null;
  readonly icon_path: string | null;
}
// Metadata expires with its input bundle, not with a long-lived collection of every queried row.
const detachedScalarRows = new WeakMap<AcquisitionRows, WeakSet<object>>();
export function detachedScalarRowOwnership(
  rows: AcquisitionRows,
): (row: object) => boolean {
  const owned = detachedScalarRows.get(rows);
  return (row) => owned?.has(row) ?? false;
}
function detachRow(
  row: Record<string, unknown>,
  owned: WeakSet<object>,
): DataRow {
  const detached = { ...row };
  let scalar = Object.getOwnPropertySymbols(detached).length === 0;
  for (const key in detached) {
    const value = detached[key];
    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function")
    ) {
      scalar = false;
      break;
    }
  }
  Object.freeze(detached);
  if (scalar) owned.add(detached);
  return detached as DataRow;
}
function decodeRows(
  table: string,
  rows: readonly Record<string, unknown>[],
  owned: WeakSet<object>,
): DataRow[] {
  return rows.map((row) => {
    const normalized =
      table === "luck_tokens" ? { ...row, id: row.zone_id } : row;
    text(normalized, "id", table);
    return detachRow(normalized, owned);
  });
}
export async function queryAcquisitionRows(
  execute: AcquisitionQuery,
  request: AcquisitionRequest,
): Promise<AcquisitionRows> {
  const owned = new WeakSet<object>();
  const store = new Map<string, Map<string, DataRow>>();
  const pendingRows = new Map<string, string[]>();
  async function select(
    table: string,
    column: string,
    ids: readonly SqlValue[],
  ): Promise<DataRow[]> {
    const values = [...new Set(ids)];
    const result: DataRow[] = [];
    for (let i = 0; i < values.length; i += 200) {
      const batch = values.slice(i, i + 200);
      if (!batch.length) continue;
      const rows = decodeRows(
        table,
        await execute(
          `SELECT * FROM ${table} WHERE ${column} IN (${batch.map(() => "?").join(",")})`,
          batch,
        ),
        owned,
      );
      let target = store.get(table);
      if (!target) {
        target = new Map();
        store.set(table, target);
      }
      const pending = pendingRows.get(table) ?? [];
      for (const row of rows) {
        if (!target.has(row.id)) pending.push(row.id);
        target.set(row.id, row);
        result.push(row);
      }
      pendingRows.set(table, pending);
    }
    return result;
  }
  const methodIds = new Set<string>();
  const addMethods = (rows: readonly DataRow[]) => {
    for (const row of rows)
      methodIds.add(text(row, "method_id", "method membership"));
  };
  const initialItems: string[] = [];
  const initialMonsters: string[] = [];
  const initialRequirements: { kind: string; id: string }[] = [];
  switch (request.kind) {
    case "items":
      initialItems.push(...request.itemIds);
      break;
    case "monsters":
      initialMonsters.push(...request.monsterIds);
      break;
    case "providers": {
      const grouped: Partial<Record<ProviderDomain, string[]>> = {};
      for (const provider of request.providers) {
        if (!Object.hasOwn(PROVIDER_TABLES, provider.kind))
          dataError("request", `unsupported provider ${provider.kind}`);
        (grouped[provider.kind] ??= []).push(provider.id);
      }
      for (const domain of Object.keys(grouped) as ProviderDomain[])
        addMethods(
          await select(
            `acquisition_providers_${domain}`,
            PROVIDER_TABLES[domain],
            grouped[domain]!,
          ),
        );
      break;
    }
    case "recipes":
      for (const column of [
        "crafting_recipe_id",
        "alchemy_recipe_id",
        "scribing_recipe_id",
      ])
        for (const row of await select(
          DETAIL_TABLES.recipe,
          column,
          request.recipeIds,
        ))
          methodIds.add(row.id);
      break;
    case "requirements":
      initialRequirements.push(...request.entities);
      initialItems.push(
        ...request.entities
          .filter((entity) => entity.kind === "item")
          .map((entity) => entity.id),
      );
      for (const row of await select(
        DETAIL_TABLES.quest,
        "quest_id",
        request.entities
          .filter((entity) => entity.kind === "quest")
          .map((entity) => entity.id),
      ))
        methodIds.add(row.id);
      break;
    default:
      dataError("request", "unsupported discriminant");
  }
  if (initialItems.length) {
    addMethods(await select("acquisition_outputs", "item_id", initialItems));
    const ins = await select("acquisition_inputs", "item_id", initialItems);
    const groups = await select(
      "acquisition_cost_groups",
      "id",
      ins.map((r) => text(r, "cost_group_id", "input")),
    );
    addMethods(groups);
    for (const [table, column] of [
      [DETAIL_TABLES.item, "item_id"],
      [DETAIL_TABLES.vendor, "offered_item_id"],
      [DETAIL_TABLES.recipe, "declared_result_item_id"],
      [DETAIL_TABLES.treasure, "map_item_id"],
      [DETAIL_TABLES.housing, "structure_item_id"],
    ] as const) {
      for (const row of await select(table, column, initialItems))
        methodIds.add(row.id);
    }
    await select("item_pool_definitions", "item_id", initialItems);
  }
  if (initialItems.length) {
    await select("portals", "required_item_id", initialItems);
    await select("treasure_locations", "required_map_id", initialItems);
    const itemObjectives = await select(
      "quest_objective_items",
      "item_id",
      initialItems,
    );
    const brewObjectives = await select(
      "quest_objective_brews",
      "item_id",
      initialItems,
    );
    const objectives = await select(
      "quest_objectives",
      "id",
      [...itemObjectives, ...brewObjectives].map((row) => row.id),
    );
    const questIds = objectives.map((row) => text(row, "quest_id", row.id));
    for (const row of await select(DETAIL_TABLES.quest, "quest_id", questIds))
      methodIds.add(row.id);
  }
  await select(
    "npc_skills",
    "skill_id",
    initialRequirements
      .filter((ref) => ref.kind === "skill")
      .map((ref) => ref.id),
  );
  if (initialMonsters.length) {
    for (const row of await select(
      DETAIL_TABLES.kill,
      "monster_id",
      initialMonsters,
    ))
      methodIds.add(row.id);
    await select("monsters", "id", initialMonsters);
  }
  const loadedMethods = new Set<string>();
  while ([...methodIds].some((id) => !loadedMethods.has(id))) {
    const next = [...methodIds].filter((id) => !loadedMethods.has(id));
    next.forEach((id) => loadedMethods.add(id));
    const methods = await select("acquisition_methods", "id", next);
    const foundMethods = new Set(methods.map((method) => method.id));
    for (const id of next)
      if (!foundMethods.has(id)) dataError(id, "referenced method is missing");
    for (const row of methods) {
      if (
        typeof row.kind !== "string" ||
        !METHOD_KINDS.some((kind) => kind === row.kind)
      )
        dataError(row.id, `unknown method kind ${row.kind}`);
      if (row.setup_method_id !== null)
        methodIds.add(text(row, "setup_method_id", row.id));
    }
    for (const table of Object.values(DETAIL_TABLES))
      await select(table, "id", next);
    for (const domain of Object.keys(PROVIDER_TABLES) as ProviderDomain[])
      await select(`acquisition_providers_${domain}`, "method_id", next);
    await select("acquisition_home_providers", "method_id", next);
    const groups = await select("acquisition_cost_groups", "method_id", next);
    await select(
      "acquisition_inputs",
      "cost_group_id",
      groups.map((row) => row.id),
    );
    for (const table of [
      "acquisition_outputs",
      "acquisition_faction_effects",
      "acquisition_method_pools",
      "acquisition_global_roots",
      "acquisition_method_fishing_rules",
    ])
      await select(table, "method_id", next);
  }
  const recipeTeachingItems: RecipeTeachingItemRow[] = [];
  const recipeResultIds = [
    ...new Set(
      [...(store.get(DETAIL_TABLES.recipe)?.values() ?? [])].map((row) =>
        text(row, "declared_result_item_id", row.id),
      ),
    ),
  ];
  for (let i = 0; i < recipeResultIds.length; i += 200) {
    const batch = recipeResultIds.slice(i, i + 200);
    const teachers = decodeRows(
      "recipe_teaching_items",
      await execute(
        `SELECT i.id,i.recipe_potion_learned_id AS result_item_id,i.name,i.tooltip_html,v.public_path AS icon_path
      FROM items i LEFT JOIN visual_assets v ON v.domain='item' AND v.entity_id=i.id AND v.kind='icon'
      WHERE i.recipe_potion_learned_id IN (${batch.map(() => "?").join(",")})`,
        batch,
      ),
      owned,
    );
    for (const row of teachers) {
      text(row, "result_item_id", row.id);
      text(row, "name", row.id);
      for (const field of ["tooltip_html", "icon_path"])
        if (row[field] !== null && typeof row[field] !== "string")
          dataError(row.id, `invalid ${field}`);
      recipeTeachingItems.push(row as RecipeTeachingItemRow);
    }
  }
  const selectedMethods = [
    ...(store.get("acquisition_methods")?.values() ?? []),
  ];
  if (selectedMethods.some((method) => method.kind === "world_chest"))
    await select("skills", "name", [ruleData.worldChest.lockpickingSkillName]);
  if (selectedMethods.some((method) => method.kind === "cap_xp")) {
    const progression = await execute(
      "SELECT * FROM progression_rules WHERE id = ?",
      [1],
    );
    store.set(
      "progression_rules",
      new Map(
        progression.map((row) => [
          String(row.id),
          detachRow({ ...row, id: String(row.id) }, owned),
        ]),
      ),
    );
    pendingRows.set("progression_rules", [
      ...store.get("progression_rules")!.keys(),
    ]);
  }
  const rows = (table: string) => [...(store.get(table)?.values() ?? [])];
  // Reverse memberships belong to selected actions/providers, not every referenced identity.
  // Otherwise a skill's casters pull in their quests, those quests' NPCs, and the whole world.
  const selectedNpcIds = new Set<string>();
  if (request.kind === "providers")
    for (const provider of request.providers)
      if (provider.kind === "npcs") selectedNpcIds.add(provider.id);
  await select("npc_skills", "npc_id", [...selectedNpcIds]);
  const selectedMemberships = await select("npc_quest_memberships", "npc_id", [
    ...selectedNpcIds,
  ]);
  const selectedQuestIds = new Set([
    ...rows(DETAIL_TABLES.quest).map((row) => text(row, "quest_id", row.id)),
    ...initialRequirements
      .filter((ref) => ref.kind === "quest")
      .map((ref) => ref.id),
    ...selectedMemberships.map((row) => text(row, "quest_id", row.id)),
    ...rows("quest_objectives").map((row) => text(row, "quest_id", row.id)),
  ]);
  for (const fact of FACT_TABLES.filter((fact) => fact.startsWith("quest_")))
    if (!fact.startsWith("quest_objective_"))
      await select(fact, "quest_id", [...selectedQuestIds]);
  await select("npc_quest_memberships", "quest_id", [...selectedQuestIds]);
  const objectiveIds = rows("quest_objectives").map((row) => row.id);
  for (const child of [
    "quest_objective_items",
    "quest_objective_monsters",
    "quest_objective_locations",
    "quest_objective_brews",
  ])
    await select(child, "id", objectiveIds);
  // Load referenced definitions and finite typed dependencies, never their upstream acquisition.
  const needed = new Map<string, Set<string>>();
  const want = (table: string, value: unknown) => {
    if (typeof value === "string") {
      let ids = needed.get(table);
      if (!ids) {
        ids = new Set();
        needed.set(table, ids);
      }
      ids.add(value);
    }
  };
  initialItems.forEach((id) => want("items", id));
  initialMonsters.forEach((id) => want("monsters", id));
  const requirementTables: Record<string, string> = {
    item: "items",
    skill: "skills",
    quest: "quests",
    portal: "portals",
    resource: "gathering_resources",
    summon_trigger: "summon_triggers",
  };
  if (request.kind === "providers")
    for (const provider of request.providers)
      want(
        provider.kind === "resource_spawns"
          ? "gathering_resource_spawns"
          : provider.kind,
        provider.id,
      );
  for (const ref of initialRequirements) {
    const table = requirementTables[ref.kind];
    if (!table) dataError("requirements", `unsupported ${ref.kind}`);
    want(table, ref.id);
  }
  selectedNpcIds.forEach((id) => want("npcs", id));
  selectedQuestIds.forEach((id) => want("quests", id));
  const foreignTables: Record<string, string> = {
    item_id: "items",
    offered_item_id: "items",
    declared_result_item_id: "items",
    result_item_id: "items",
    reward_item_id: "items",
    structure_item_id: "items",
    map_item_id: "items",
    key_item_id: "items",
    monster_id: "monsters",
    monster_spawn_id: "monster_spawns",
    parent_monster_spawn_id: "monster_spawns",
    need_monster_dead_spawn_id: "monster_spawns",
    npc_id: "npcs",
    altar_id: "altars",
    resource_id: "gathering_resources",
    resource_spawn_id: "gathering_resource_spawns",
    chest_id: "chests",
    crafting_station_id: "crafting_stations",
    alchemy_table_id: "alchemy_tables",
    scribing_table_id: "scribing_tables",
    class_id: "classes",
    quest_id: "quests",
    predecessor_quest_id: "quests",
    skill_id: "skills",
    predecessor_skill_id: "skills",
    treasure_location_id: "treasure_locations",
    zone_id: "zones",
    loot_zone_id: "zones",
    from_zone_id: "zones",
    to_zone_id: "zones",
    sub_zone_id: "zone_triggers",
    faction_id: "factions",
    crafting_recipe_id: "crafting_recipes",
    alchemy_recipe_id: "alchemy_recipes",
    scribing_recipe_id: "scribing_recipes",
    pool_id: "loot_pools",
    child_pool_id: "loot_pools",
    loot_pool_id: "loot_pools",
    primary_pool_id: "loot_pools",
    trash_pool_id: "loot_pools",
    fallback_pool_id: "loot_pools",
    fishing_rule_id: "loot_fishing_rules",
  };
  Object.assign(foreignTables, {
    required_item_id: "items",
    required_map_id: "items",
    tool_required_id: "items",
    fragment_token_id: "items",
    boss_luck_token_id: "items",
    from_sub_zone_id: "zone_triggers",
    to_sub_zone_id: "zone_triggers",
    reward_common_id: "items",
    reward_magic_id: "items",
    reward_epic_id: "items",
    reward_legendary_id: "items",
    required_activation_item_id: "items",
    summoned_monster_spawn_id: "monster_spawns",
    summoned_npc_spawn_id: "npc_spawns",
    race_id: "race_progression",
  });
  const loaded = new Map<string, Set<string>>();
  while (true) {
    for (const table of store.keys()) {
      const pending = pendingRows.get(table) ?? [];
      pendingRows.delete(table);
      for (const id of pending) {
        const row = store.get(table)!.get(id)!;
        for (const column in row) {
          const target = foreignTables[column];
          if (target && Object.hasOwn(row, column)) want(target, row[column]);
        }
      }
    }
    let progress = false;
    for (const [table, ids] of needed) {
      let seen = loaded.get(table);
      if (!seen) {
        seen = new Set();
        loaded.set(table, seen);
      }
      const next = [...ids].filter((id) => !seen.has(id));
      if (!next.length) continue;
      progress = true;
      next.forEach((id) => seen.add(id));
      await select(table, "id", next);
      if (table === "zones") await select("luck_tokens", "zone_id", next);
      if (table === "loot_pools") {
        await select("loot_pool_entries", "pool_id", next);
        await select("loot_monster_rules", "pool_id", next);
        await select("loot_chest_rules", "pool_id", next);
      }
      if (table === "items") {
        await select("item_class_requirements", "item_id", next);
        await select("item_pool_definitions", "item_id", next);
      }
      if (table === "skills") {
        await select("skill_predecessors", "skill_id", next);
        for (const id of next) {
          const skill = store.get("skills")?.get(id);
          if (!skill || skill.player_classes === null) continue;
          if (typeof skill.player_classes !== "string")
            dataError(id, "invalid player class membership");
          let classes: unknown;
          try {
            classes = JSON.parse(skill.player_classes);
          } catch {
            dataError(id, "invalid player class membership JSON");
          }
          if (
            !Array.isArray(classes) ||
            classes.some((value) => typeof value !== "string")
          )
            dataError(id, "invalid player class membership");
          for (const classId of classes) want("classes", classId);
        }
      }
      if (table === "npcs") {
        await select("npc_spawns", "npc_id", next);
        const npcs = next.flatMap((id) => {
          const npc = store.get("npcs")?.get(id);
          return npc ? [npc] : [];
        });
        await select(
          "factions",
          "name",
          npcs.flatMap((npc) =>
            typeof npc.faction === "string" ? [npc.faction] : [],
          ),
        );
      }
      if (table === "monster_spawns" || table === "npc_spawns") {
        const target =
          table === "monster_spawns"
            ? "summoned_monster_spawn_id"
            : "summoned_npc_spawn_id";
        for (const trigger of await select("summon_triggers", target, next))
          want("summon_triggers", trigger.id);
      }
      if (table === "summon_triggers") {
        const guards = await select(
          "summon_trigger_placeholders",
          "trigger_id",
          next,
        );
        for (const guard of guards) want("monster_spawns", guard.spawn_id);
      }
      if (table === "factions") continue;
    }
    if (!progress) break;
  }
  const providers = Object.fromEntries(
    (Object.keys(PROVIDER_TABLES) as ProviderDomain[]).map((domain) => [
      domain,
      rows(`acquisition_providers_${domain}`),
    ]),
  ) as unknown as AcquisitionRows["providers"];
  const result: AcquisitionRows = Object.freeze({
    methods: rows("acquisition_methods") as unknown as MethodRow[],
    costGroups: rows("acquisition_cost_groups") as unknown as CostGroupRow[],
    inputs: rows("acquisition_inputs") as unknown as InputRow[],
    outputs: rows("acquisition_outputs") as unknown as OutputRow[],
    effects: rows("acquisition_faction_effects"),
    methodPools: rows("acquisition_method_pools"),
    pools: rows("loot_pools"),
    poolEntries: rows("loot_pool_entries") as unknown as PoolEntry[],
    details: Object.fromEntries(
      Object.entries(DETAIL_TABLES).map(([kind, table]) => [kind, rows(table)]),
    ) as unknown as AcquisitionRows["details"],
    providers,
    homeProviders: rows(
      "acquisition_home_providers",
    ) as unknown as AcquisitionRows["homeProviders"],
    entities: Object.fromEntries(
      ENTITY_TABLES.map((table) => [table, rows(table)]),
    ),
    facts: {
      ...Object.fromEntries(FACT_TABLES.map((table) => [table, rows(table)])),
      recipe_teaching_items: recipeTeachingItems,
    },
    request,
  });
  detachedScalarRows.set(result, owned);
  return result;
}
