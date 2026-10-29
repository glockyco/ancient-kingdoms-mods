import { METHOD_KINDS, PROVIDER_TABLES } from "./types";
import type {
  AcquisitionRows,
  AcquisitionModel,
  DataRow,
  MethodRow,
  MethodView,
  HomeProviderView,
  ProviderDomain,
  ProviderView,
  ProviderRef,
  DirectLocation,
  RequirementRoot,
  RequirementExpression,
  Repeatability,
  Phase,
  CostGroupRow,
} from "./types";
import {
  dataError,
  text,
  numeric,
  detachedScalarRowOwnership,
} from "./queries";
import { composeRequirements, predicate, combine } from "./conditions";
import {
  calculateMethodProbabilities,
  methodProbabilityFactors,
  evaluateOutputQuantity,
  professionAttempt,
  CODE_DEFINED_RULES,
} from "./rules";
import { SEASONS, type Season } from "../data/seasonal-events";
const DETAIL_KIND: Record<MethodRow["kind"], string> = {
  kill: "kill",
  vendor: "vendor",
  quest_accept: "quest",
  quest_complete: "quest",
  altar_activate: "altar",
  recipe: "recipe",
  gather: "resource",
  world_chest: "world_chest",
  portable_chest: "item",
  pack_use: "item",
  merge: "item",
  fragment: "item",
  treasure_dig: "treasure",
  blessing: "service",
  essence: "service",
  creation: "creation",
  housing: "housing",
  cap_xp: "cap_xp",
};
const RULES: Record<MethodRow["kind"], readonly string[]> = {
  kill: [
    "monster_loot",
    "boss_loot",
    "altar_final_loot",
    "placeholder_loot",
    "lootless",
  ],
  vendor: ["vendor"],
  quest_accept: ["quest_accept"],
  quest_complete: ["quest_complete"],
  altar_activate: ["altar_activate"],
  recipe: ["crafting", "cooking", "alchemy", "scribing"],
  gather: ["herbalism", "mining", "fishing", "radiant", "gather_fixed"],
  world_chest: ["world_chest"],
  portable_chest: ["portable_chest"],
  pack_use: ["pack_use"],
  merge: ["merge"],
  fragment: ["fragment"],
  treasure_dig: ["treasure_dig"],
  blessing: ["blessing"],
  essence: ["essence"],
  creation: ["creation"],
  housing: ["housing"],
  cap_xp: ["cap_xp"],
};
const PHASES: Record<MethodRow["kind"], Phase> = {
  kill: "loot",
  vendor: "purchase",
  quest_accept: "accept",
  quest_complete: "complete",
  altar_activate: "activate",
  recipe: "attempt",
  gather: "attempt",
  world_chest: "attempt",
  portable_chest: "use",
  pack_use: "use",
  merge: "use",
  fragment: "use",
  treasure_dig: "use",
  blessing: "exchange",
  essence: "exchange",
  creation: "accept",
  housing: "purchase",
  cap_xp: "loot",
};
function index<T>(
  rows: readonly T[],
  key: (row: T) => string,
): ReadonlyMap<string, readonly T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const group = groups.get(id) ?? [];
    group.push(row);
    groups.set(id, group);
  }
  for (const group of groups.values()) Object.freeze(group);
  return readonlyMap(groups);
}
function readonlyMap<K, V>(source: Map<K, V>): ReadonlyMap<K, V> {
  return Object.freeze({
    get size() {
      return source.size;
    },
    get: (key: K) => source.get(key),
    has: (key: K) => source.has(key),
    entries: () => source.entries(),
    keys: () => source.keys(),
    values: () => source.values(),
    forEach: (
      callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
      thisArg?: unknown,
    ) =>
      source.forEach((value, key) =>
        callback.call(thisArg, value, key, readonlyMap(source)),
      ),
    [Symbol.iterator]: () => source[Symbol.iterator](),
  });
}
function enumField(
  row: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
) {
  if (typeof row[field] !== "string" || !allowed.includes(row[field]))
    dataError(String(row.id), `unsupported ${field}: ${row[field]}`);
}
function flag(row: Record<string, unknown>, field: string) {
  if (row[field] !== 0 && row[field] !== 1)
    dataError(String(row.id), `invalid ${field}`);
}
function integer(
  row: Record<string, unknown>,
  field: string,
  minimum: number,
  nullable = false,
) {
  const value = numeric(row, field, String(row.id), nullable);
  if (value !== null && (!Number.isInteger(value) || value < minimum))
    dataError(String(row.id), `invalid ${field}`);
}
export function assembleAcquisitionModel(
  input: AcquisitionRows,
): AcquisitionModel {
  const ownsScalarRow = detachedScalarRowOwnership(input);
  function freeze<T>(value: T): T {
    if (
      value &&
      typeof value === "object" &&
      !ownsScalarRow(value) &&
      !Object.isFrozen(value)
    ) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  }
  function copyRows<T extends object>(rows: readonly T[]): readonly T[] {
    return rows.map((row) => (ownsScalarRow(row) ? row : structuredClone(row)));
  }
  function copyFamilies<T extends Readonly<Record<string, readonly object[]>>>(
    families: T,
  ): T {
    return Object.fromEntries(
      Object.entries(families).map(([table, rows]) => [table, copyRows(rows)]),
    ) as T;
  }
  // Only rows detached and checked by the query boundary can bypass external-input copying.
  const rows: AcquisitionRows = freeze({
    methods: copyRows(input.methods),
    costGroups: copyRows(input.costGroups),
    inputs: copyRows(input.inputs),
    outputs: copyRows(input.outputs),
    effects: copyRows(input.effects),
    methodPools: copyRows(input.methodPools),
    pools: copyRows(input.pools),
    poolEntries: copyRows(input.poolEntries),
    homeProviders: copyRows(input.homeProviders),
    details: copyFamilies(input.details),
    providers: copyFamilies(input.providers),
    entities: copyFamilies(input.entities),
    facts: copyFamilies(input.facts),
    request: structuredClone(input.request),
  });
  const methods = new Map<string, MethodRow>();
  for (const row of rows.methods) {
    if (methods.has(row.id)) dataError(row.id, "duplicate method");
    if (!METHOD_KINDS.includes(row.kind)) dataError(row.id, "unsupported kind");
    if (!RULES[row.kind].includes(row.rule_id))
      dataError(row.id, `invalid rule ${row.rule_id} for ${row.kind}`);
    flag(row as unknown as Record<string, unknown>, "rooted");
    if (
      row.source_level_hint !== null &&
      (!Number.isFinite(row.source_level_hint) || row.source_level_hint < 0)
    )
      dataError(row.id, "invalid source-level hint");
    methods.set(row.id, row);
  }
  const requireMethod = (id: string, context: string) => {
    if (!methods.has(id)) dataError(context, `missing method ${id}`);
  };
  const costs = new Map<string, CostGroupRow>();
  for (const group of rows.costGroups) {
    requireMethod(group.method_id, group.id);
    enumField(group as unknown as Record<string, unknown>, "phase", [
      "activate",
      "purchase",
      "accept",
      "complete",
      "attempt",
      "use",
      "exchange",
    ]);
    enumField(group as unknown as Record<string, unknown>, "quantity_rule", [
      "fixed",
      "all_carried",
      "quest_completion",
    ]);
    enumField(group as unknown as Record<string, unknown>, "consumption_rule", [
      "on_success",
      "before_roll",
      "after_outer_success",
      "quest_inventory_then_equipped",
      "replace_carried_stack",
    ]);
    enumField(group as unknown as Record<string, unknown>, "selection_rule", [
      "always",
      "chest_key_first",
      "chest_lockpick_fallback",
    ]);
    if (costs.has(group.id)) dataError(group.id, "duplicate cost group");
    costs.set(group.id, group);
  }
  const seenOrdinals = new Set<string>();
  function ordinal(row: Record<string, unknown>, parent: string) {
    integer(row, "ordinal", 0);
    const key = `${parent}:${row.ordinal}`;
    if (seenOrdinals.has(key)) dataError(String(row.id), "duplicate ordinal");
    seenOrdinals.add(key);
  }
  for (const entry of rows.inputs) {
    const row = entry as unknown as Record<string, unknown>;
    if (!costs.has(entry.cost_group_id))
      dataError(entry.id, "missing cost group");
    ordinal(row, `input:${entry.cost_group_id}`);
    enumField(row, "resource_kind", ["item", "gold"]);
    enumField(row, "role", [
      "material",
      "currency",
      "activation",
      "key",
      "lockpick",
      "component",
      "fragment",
      "selected_instance",
      "quest_primary",
      "quest_secondary",
    ]);
    integer(row, "amount", 1);
    flag(row, "withheld");
    if (
      entry.resource_kind === "gold" &&
      (entry.item_id !== null || entry.withheld)
    )
      dataError(entry.id, "gold input has item identity");
    if (entry.resource_kind === "item" && !entry.item_id && !entry.withheld)
      dataError(entry.id, "lost required item");
  }
  for (const entry of rows.outputs) {
    const row = entry as unknown as Record<string, unknown>;
    requireMethod(entry.method_id, entry.id);
    ordinal(row, `output:${entry.method_id}`);
    enumField(row, "resource_kind", ["item", "gold"]);
    enumField(row, "yield_rule", [
      "fixed",
      "uniform_inclusive",
      "uniform_upper_exclusive",
      "all_carried",
      "extra_gather",
      "radiant",
      "pool",
    ]);
    enumField(row, "delivery", [
      "inventory",
      "keyring",
      "equipment",
      "corpse",
      "placed_structure",
      "quest_progress",
    ]);
    flag(row, "withheld");
    integer(row, "amount_min", 0, true);
    integer(row, "amount_max", 0, true);
    integer(row, "slot", 0, true);
    integer(row, "condition_slot", 0, true);
    if (
      entry.resource_kind === "gold" &&
      (entry.item_id !== null || entry.withheld)
    )
      dataError(entry.id, "gold output has item identity");
    if (entry.resource_kind === "item" && !entry.item_id && !entry.withheld)
      dataError(entry.id, "lost output item");
    if (
      entry.yield_rule === "fixed" &&
      (entry.amount_min === null ||
        entry.amount_min <= 0 ||
        entry.amount_min !== entry.amount_max)
    )
      dataError(entry.id, "invalid fixed output");
  }
  const pools = new Map(rows.pools.map((p) => [p.id, p]));
  for (const pool of rows.pools)
    enumField(pool, "kind", [
      "monster",
      "random",
      "portable_chest",
      "resource_secondary",
      "fishing_primary",
      "fishing_trash",
      "fishing_fallback",
    ]);
  for (const entry of rows.poolEntries) {
    const row = entry as unknown as Record<string, unknown>;
    if (!pools.has(entry.pool_id)) dataError(entry.id, "missing pool");
    ordinal(row, `pool:${entry.pool_id}`);
    enumField(row, "resolution", ["direct", "uniform_child"]);
    enumField(row, "quest_gate", ["none", "public_need", "withheld_need"]);
    integer(row, "duplicate_group", 0);
    integer(row, "cap", 0, true);
    for (const field of [
      "counts_equipment",
      "guaranteed_equipment_candidate",
      "scales_with_treasure_hunter",
      "withheld",
    ])
      flag(row, field);
    const probability = numeric(row, "probability", entry.id)!;
    if (probability < 0 || probability > 1)
      dataError(entry.id, "probability outside 0..1");
    if (
      entry.resolution === "uniform_child" &&
      (!entry.child_pool_id || !pools.has(entry.child_pool_id))
    )
      dataError(entry.id, "missing child pool");
    if (entry.resolution === "direct" && entry.child_pool_id !== null)
      dataError(entry.id, "direct entry has child pool");
    if (!entry.item_id && !entry.withheld)
      dataError(entry.id, "lost pool identity");
  }
  const entityMaps = new Map<string, ReadonlyMap<string, DataRow>>();
  for (const [table, entities] of Object.entries(rows.entities)) {
    const map = new Map<string, DataRow>();
    for (const entity of entities) {
      if (map.has(entity.id)) dataError(entity.id, `duplicate ${table}`);
      map.set(entity.id, entity);
    }
    entityMaps.set(table, readonlyMap(map));
  }
  const get = (table: string, id: unknown): DataRow | undefined =>
    typeof id === "string" ? entityMaps.get(table)?.get(id) : undefined;
  for (const row of [...rows.inputs, ...rows.outputs, ...rows.poolEntries])
    if (row.withheld && row.item_id !== null)
      dataError(row.id, "withheld target retains identity");
  for (const providers of [
    ...Object.values(rows.providers),
    rows.homeProviders,
  ])
    for (const provider of providers)
      requireMethod(text(provider, "method_id", provider.id), provider.id);
  const events = [
    "corpse_generation",
    "eligible_kill",
    "successful_hook",
    "cast",
    "attempt",
    "successful_opening",
    "opening",
    "parent_award",
  ];
  for (const binding of rows.methodPools) {
    requireMethod(text(binding, "method_id", binding.id), binding.id);
    if (!pools.has(String(binding.pool_id)))
      dataError(binding.id, "missing bound pool");
    ordinal(binding, `method_pool:${binding.method_id}`);
    enumField(binding, "event", events);
  }
  for (const effect of rows.effects) {
    requireMethod(text(effect, "method_id", effect.id), effect.id);
    enumField(effect, "event", events);
    integer(effect, "delta", Number.MIN_SAFE_INTEGER);
    flag(effect, "withheld");
    if (
      effect.withheld
        ? effect.faction_id !== null
        : !get("factions", effect.faction_id)
    )
      dataError(effect.id, "lost effect faction or inconsistent withholding");
  }
  for (const input of rows.inputs)
    if (input.item_id && !get("items", input.item_id))
      dataError(input.id, "missing input item");
  for (const output of rows.outputs)
    if (output.item_id && !get("items", output.item_id))
      dataError(output.id, "missing output item");
  for (const entry of rows.poolEntries)
    if (entry.item_id && !get("items", entry.item_id))
      dataError(entry.id, "missing pool target item");
  const restrictions: Record<string, { target: string; table: string }> = {
    item_class_requirements: { target: "class_id", table: "classes" },
    skill_predecessors: { target: "predecessor_skill_id", table: "skills" },
    quest_predecessors: { target: "predecessor_quest_id", table: "quests" },
    quest_class_requirements: { target: "class_id", table: "classes" },
    quest_race_requirements: { target: "race_id", table: "race_progression" },
    quest_faction_requirements: { target: "faction_id", table: "factions" },
  };
  for (const [table, definition] of Object.entries(restrictions)) {
    for (const row of rows.facts[table] ?? []) {
      flag(row, "withheld");
      integer(row, "ordinal", 0);
      if (
        row.withheld
          ? row[definition.target] !== null
          : typeof row[definition.target] !== "string"
      )
        dataError(row.id, "lost or inconsistent required target");
      if (!row.withheld && !get(definition.table, row[definition.target]))
        dataError(row.id, "missing required target definition");
      if (table === "skill_predecessors") integer(row, "rank", 0);
    }
  }
  const objectiveChildIds = new Map(
    [
      "quest_objective_items",
      "quest_objective_monsters",
      "quest_objective_locations",
      "quest_objective_brews",
    ].map((table) => [
      table,
      new Set((rows.facts[table] ?? []).map((row) => row.id)),
    ]),
  );
  for (const objective of rows.facts.quest_objectives ?? []) {
    enumField(objective, "kind", ["item", "monster", "location", "brew"]);
    enumField(objective, "role", [
      "gather_counter",
      "inventory_primary",
      "inventory_secondary",
      "equipped",
      "kill_counter",
      "location_visit",
      "tracking_location",
      "brew_counter",
    ]);
    flag(objective, "withheld");
    ordinal(objective, `objective:${objective.quest_id}`);
    if (objective.kind === "location") {
      if (objective.amount !== null)
        dataError(
          objective.id,
          "location objective must not be a numeric count",
        );
    } else integer(objective, "amount", 1);
    const childTables: Record<string, string> = {
      item: "quest_objective_items",
      monster: "quest_objective_monsters",
      location: "quest_objective_locations",
      brew: "quest_objective_brews",
    };
    const childTable = childTables[String(objective.kind)];
    if (!childTable || !objectiveChildIds.get(childTable)?.has(objective.id))
      dataError(objective.id, "missing typed objective child");
  }
  for (const slot of rows.facts.quest_reward_slots ?? []) {
    enumField(slot, "slot_kind", ["shared", "class"]);
    flag(slot, "class_withheld");
    flag(slot, "item_withheld");
    integer(slot, "amount", 1);
    ordinal(slot, `reward:${slot.quest_id}`);
    if (
      slot.item_withheld
        ? slot.item_id !== null
        : typeof slot.item_id !== "string"
    )
      dataError(slot.id, "inconsistent reward target");
    if (
      slot.slot_kind === "class" &&
      (slot.class_withheld
        ? slot.class_id !== null
        : typeof slot.class_id !== "string")
    )
      dataError(slot.id, "lost class reward condition");
  }
  for (const [family, details] of Object.entries(rows.details))
    for (const detail of details) {
      const method = methods.get(detail.id);
      if (!method || DETAIL_KIND[method.kind] !== family)
        dataError(detail.id, "orphan or mismatched typed detail");
      const reference = (field: string, table: string, nullable = false) => {
        if (detail[field] === null && nullable) return;
        if (!get(table, text(detail, field, detail.id)))
          dataError(detail.id, `missing ${field} definition`);
      };
      const chance = (field: string) => {
        const value = numeric(detail, field, detail.id)!;
        if (value < 0 || value > 1) dataError(detail.id, `invalid ${field}`);
      };
      switch (family) {
        case "kill":
          reference("monster_id", "monsters");
          if (!pools.has(text(detail, "loot_pool_id", detail.id)))
            dataError(detail.id, "missing kill pool");
          for (const field of [
            "loot_zone_withheld",
            "respawn",
            "is_boss",
            "is_elite",
            "is_hunt",
            "is_summoned_pet",
          ])
            flag(detail, field);
          integer(detail, "loot_zone_number", 0, true);
          if (detail.loot_zone_withheld) {
            if (
              detail.loot_zone_number !== null ||
              detail.loot_zone_id !== null
            )
              dataError(detail.id, "withheld zone retains identity");
          } else {
            if (detail.loot_zone_number === null)
              dataError(detail.id, "lost native loot zone");
            if (Number(detail.loot_zone_number) > 0) {
              reference("loot_zone_id", "zones");
              if (
                get("zones", detail.loot_zone_id)?.zone_id !==
                detail.loot_zone_number
              )
                dataError(detail.id, "conflicting native loot zone");
            } else if (detail.loot_zone_id !== null)
              dataError(detail.id, "native zone zero has lookup identity");
          }
          if (numeric(detail, "exp_multiplier", detail.id)! < 0)
            dataError(detail.id, "negative loot multiplier");
          enumField(detail, "event_kind", [
            "authored",
            "altar_final",
            "placeholder",
            "lootless",
          ]);
          for (const field of ["gold_min", "gold_max"])
            integer(detail, field, 0);
          chance("gold_probability");
          if (Number(detail.gold_max) < Number(detail.gold_min))
            dataError(detail.id, "reversed gold bounds");
          reference("altar_id", "altars", true);
          reference("parent_monster_spawn_id", "monster_spawns", true);
          integer(detail, "wave_number", 0, true);
          integer(detail, "wave_member_index", 0, true);
          if (
            detail.event_kind === "placeholder" &&
            (detail.respawn !== 0 || !detail.parent_monster_spawn_id)
          )
            dataError(detail.id, "invalid placeholder parent context");
          if (
            detail.event_kind === "altar_final" &&
            (!detail.altar_id ||
              detail.wave_number === null ||
              detail.wave_member_index === null)
          )
            dataError(detail.id, "incomplete final-wave context");
          break;
        case "vendor":
          reference("npc_id", "npcs");
          reference("offered_item_id", "items");
          // Null marks a year-round offer.
          if (detail.season !== null)
            enumField(detail, "season", Object.keys(SEASONS));
          break;
        case "quest":
          reference("quest_id", "quests");
          enumField(detail, "phase", ["accept", "complete"]);
          if (`quest_${detail.phase}` !== method.kind)
            dataError(detail.id, "quest phase disagrees with method");
          break;
        case "recipe": {
          const routes: Record<string, string> = {
            crafting_recipe_id: "crafting_recipes",
            alchemy_recipe_id: "alchemy_recipes",
            scribing_recipe_id: "scribing_recipes",
          };
          const selected = Object.entries(routes).filter(
            ([field]) => detail[field] !== null,
          );
          if (selected.length !== 1)
            dataError(detail.id, "recipe must have exactly one route anchor");
          reference(selected[0][0], selected[0][1]);
          reference("declared_result_item_id", "items");
          integer(detail, "result_amount", 1);
          integer(detail, "tier", 0);
          integer(detail, "experience", 0, true);
          enumField(detail, "display_kind", [
            "crafting",
            "cooking",
            "alchemy",
            "scribing",
          ]);
          if (detail.display_kind !== method.rule_id)
            dataError(detail.id, "recipe display kind disagrees with rule");
          if (
            get(selected[0][1], detail[selected[0][0]])?.result_item_id !==
            detail.declared_result_item_id
          )
            dataError(
              detail.id,
              "recipe anchor result disagrees with definition",
            );
          break;
        }
        case "resource":
          reference("resource_id", "gathering_resources");
          enumField(detail, "resource_kind", [
            "plant",
            "mineral",
            "fishing",
            "radiant",
            "other",
          ]);
          chance("outer_success");
          integer(detail, "gold_min", 0);
          integer(detail, "gold_max", 0);
          break;
        case "world_chest":
          reference("chest_id", "chests");
          reference("key_item_id", "items", true);
          flag(detail, "key_item_withheld");
          chance("outer_success");
          integer(detail, "gold_min", 0);
          integer(detail, "gold_max", 0);
          if (detail.key_item_withheld && detail.key_item_id !== null)
            dataError(detail.id, "withheld key retains identity");
          break;
        case "item":
          reference("item_id", "items");
          break;
        case "treasure":
          reference("treasure_location_id", "treasure_locations");
          reference("map_item_id", "items", true);
          flag(detail, "map_item_withheld");
          if (detail.map_item_withheld && detail.map_item_id !== null)
            dataError(detail.id, "withheld map retains identity");
          break;
        case "service":
          enumField(detail, "service_role", ["blessing", "essence"]);
          if (detail.service_role !== method.kind)
            dataError(detail.id, "service role disagrees with method");
          break;
        case "creation":
          reference("class_id", "classes");
          break;
        case "housing":
          reference("structure_item_id", "items");
          break;
        case "cap_xp":
          reference("reward_item_id", "items");
          break;
        case "altar":
          reference("altar_id", "altars");
          break;
        default:
          dataError(detail.id, `unsupported detail family ${family}`);
      }
    }
  const requirements = composeRequirements(rows);
  const detailRows = new Map<string, DataRow>();
  for (const details of Object.values(rows.details))
    for (const detail of details) {
      if (detailRows.has(detail.id))
        dataError(detail.id, "duplicate typed detail");
      detailRows.set(detail.id, detail);
    }
  const providersByMethod = new Map<
    ProviderDomain,
    ReadonlyMap<string, readonly DataRow[]>
  >();
  for (const domain of Object.keys(PROVIDER_TABLES) as ProviderDomain[]) {
    const memberships: readonly DataRow[] = rows.providers[domain];
    providersByMethod.set(
      domain,
      index(memberships, (provider) =>
        text(provider, "method_id", provider.id),
      ),
    );
  }
  const homesByMethod = index(rows.homeProviders, (provider) =>
    text(provider, "method_id", provider.id),
  );
  const effectsByMethod = index(rows.effects, (effect) =>
    text(effect, "method_id", effect.id),
  );
  const npcSpawnsByNpc = index(rows.entities.npc_spawns ?? [], (spawn) =>
    text(spawn, "npc_id", spawn.id),
  );
  const monsterTriggers = index(
    rows.entities.summon_triggers ?? [],
    (trigger) => String(trigger.summoned_monster_spawn_id),
  );
  const npcTriggers = index(rows.entities.summon_triggers ?? [], (trigger) =>
    String(trigger.summoned_npc_spawn_id),
  );
  const rewardSlotsByQuest = index(
    rows.facts.quest_reward_slots ?? [],
    (slot) => String(slot.quest_id),
  );
  const lockpicksByMethod = new Map<string, (typeof rows.inputs)[number]>();
  for (const input of rows.inputs) {
    if (input.role !== "lockpick") continue;
    const methodId = costs.get(input.cost_group_id)!.method_id;
    if (!lockpicksByMethod.has(methodId))
      lockpicksByMethod.set(methodId, input);
  }
  const outputsByMethod = index(rows.outputs, (o) => o.method_id);
  const inputsByGroup = index(rows.inputs, (i) => i.cost_group_id);
  const costsByMethod = index(rows.costGroups, (g) => g.method_id);
  const entriesByPool = index(
    [...rows.poolEntries].sort((a, b) => a.ordinal - b.ordinal),
    (e) => e.pool_id,
  );
  for (const group of rows.costGroups)
    if (!inputsByGroup.get(group.id)?.length)
      dataError(group.id, "empty cost group");
  const methodViews = new Map<string, MethodView>();
  const pending = new Set<string>();
  function build(id: string): MethodView {
    const cached = methodViews.get(id);
    if (cached) return cached;
    if (pending.has(id)) dataError(id, "cyclic setup method");
    pending.add(id);
    const method = methods.get(id),
      detail = detailRows.get(id);
    if (!method) return dataError(id, "missing method");
    if (!detail)
      return dataError(id, `expected one ${DETAIL_KIND[method.kind]} detail`);
    const methodRequirements: RequirementRoot[] = [];
    const phase = PHASES[method.kind];
    const add = (
      parts: RequirementExpression[],
      enforcement: RequirementRoot["enforcement"] = "both",
      subject: RequirementRoot["subject"] = "player",
    ) => {
      if (parts.length)
        methodRequirements.push({
          phase,
          subject,
          enforcement,
          expression: combine("all", parts),
        });
    };
    switch (method.kind) {
      case "quest_accept":
      case "quest_complete": {
        const quest = get("quests", detail.quest_id);
        if (!quest) dataError(id, "missing quest definition");
        methodRequirements.push(
          ...(requirements.get(`quest:${quest.id}`) ?? []).filter(
            (r) => r.phase === phase,
          ),
        );
        break;
      }
      case "gather": {
        const resource = get("gathering_resources", detail.resource_id);
        if (!resource) dataError(id, "missing resource definition");
        methodRequirements.push(
          ...(requirements.get(`resource:${resource.id}`) ?? []),
        );
        break;
      }
      case "recipe": {
        const routeColumns = [
          "crafting_recipe_id",
          "alchemy_recipe_id",
          "scribing_recipe_id",
        ];
        if (
          routeColumns.filter(
            (column) => detail[column] !== null && detail[column] !== undefined,
          ).length !== 1
        )
          dataError(id, "recipe must have one route");
        text(detail, "declared_result_item_id", id);
        integer(detail, "result_amount", 1);
        integer(detail, "tier", 0);
        enumField(detail, "display_kind", [
          "crafting",
          "cooking",
          "alchemy",
          "scribing",
        ]);
        const parts: RequirementExpression[] = [];
        // Source: server-scripts/Player.cs:13786-13827; server-scripts/TableUI.cs:71-98.
        // Scribing uses Alchemy success but does not require learning the recipe.
        if (method.rule_id === "alchemy")
          parts.push(
            predicate({
              kind: "recipe_known",
              resultItemId: String(detail.declared_result_item_id),
            }),
          );
        const profession =
          method.rule_id === "scribing"
            ? "alchemy"
            : method.rule_id === "alchemy" || method.rule_id === "cooking"
              ? method.rule_id
              : null;
        // Lower tiers already meet the attempt floor at zero skill.
        if (
          profession &&
          !professionAttempt(profession, Number(detail.tier), 0, null).qualified
        )
          parts.push(
            predicate({
              kind: "profession_floor",
              profession,
              tier: Number(detail.tier),
            }),
          );
        add(parts);
        break;
      }
      case "world_chest": {
        if (!detail.key_item_id && !detail.key_item_withheld) break;
        const key = detail.key_item_withheld
          ? predicate({ kind: "withheld", reason: "unpublished_target" })
          : predicate({
              kind: "item_count",
              itemId: text(detail, "key_item_id", id),
              location: "inventory",
              amount: 1,
            });
        const lockpick = lockpicksByMethod.get(id);
        const lockpickSkill = (rows.entities.skills ?? []).find(
          (skill) =>
            skill.name === CODE_DEFINED_RULES.worldChest.lockpickingSkillName,
        );
        const fallback: RequirementExpression[] = [
          lockpickSkill
            ? predicate({
                kind: "skill_base_rank",
                skillId: lockpickSkill.id,
                rank: 1,
              })
            : predicate({ kind: "withheld", reason: "unpublished_target" }),
          lockpick?.item_id
            ? predicate({
                kind: "item_count",
                itemId: lockpick.item_id,
                location: "inventory",
                amount: 1,
              })
            : predicate({ kind: "withheld", reason: "unpublished_target" }),
        ];
        add([combine("any", [key, combine("all", fallback)])]);
        break;
      }
      case "treasure_dig":
        add(
          [
            predicate({
              kind: "usable_tool",
              category: "Shovel",
              requiresDurability: false,
            }),
          ],
          "normal_ui",
        );
        break;
      case "essence": {
        const selected = (costsByMethod.get(id) ?? [])
          .flatMap((g) => inputsByGroup.get(g.id) ?? [])
          .find((i) => i.role === "selected_instance");
        if (selected?.item_id) {
          add(
            [
              predicate(
                {
                  kind: "instance_eligible",
                  itemId: selected.item_id,
                  rule: "essence_ui",
                },
                "selected_instance",
              ),
            ],
            "normal_ui",
            "selected_instance",
          );
          add(
            [
              predicate(
                {
                  kind: "instance_eligible",
                  itemId: selected.item_id,
                  rule: "essence_server",
                },
                "selected_instance",
              ),
            ],
            "server",
            "selected_instance",
          );
        } else
          add(
            [
              predicate(
                { kind: "withheld", reason: "unpublished_target" },
                "selected_instance",
              ),
            ],
            "both",
            "selected_instance",
          );
        break;
      }
      case "creation":
        add([
          predicate({
            kind: "identity_is",
            identityKind: "class",
            id: text(detail, "class_id", id),
          }),
        ]);
        break;
      case "cap_xp": {
        const progression = rows.entities.progression_rules?.[0];
        if (!progression) dataError(id, "missing progression rules");
        integer(progression, "max_level", 1);
        add([
          predicate({
            kind: "metric_at_least",
            metric: "total_veteran_points",
            amount: CODE_DEFINED_RULES.capXp.minimumTotalVeteranPoints,
            unit: "points",
          }),
          predicate({
            kind: "metric_at_least",
            metric: "level",
            amount: Number(progression.max_level),
            unit: "levels",
          }),
        ]);
        break;
      }
      case "housing":
        add([predicate({ kind: "house_owned" })]);
        break;
      case "altar_activate": {
        const altar = get("altars", detail.altar_id);
        const parts: RequirementExpression[] = [];
        if (Number(altar?.min_level_required) > 0)
          parts.push(
            predicate({
              kind: "metric_at_least",
              metric: "level",
              amount: Number(altar?.min_level_required),
              unit: "levels",
            }),
          );
        if (altar)
          parts.push(
            predicate(
              { kind: "event_ready", triggerId: altar.id },
              "current_world",
            ),
          );
        add(parts);
        break;
      }
      case "vendor": {
        const item = get("items", detail.offered_item_id),
          npc = get("npcs", detail.npc_id),
          parts: RequirementExpression[] = [];
        if (Number(item?.faction_required_to_buy) > 0) {
          const faction = (rows.entities.factions ?? []).find(
            (f) => f.name === npc?.faction,
          );
          parts.push(
            faction
              ? predicate({
                  kind: "faction_at_least",
                  factionId: faction.id,
                  standing: Number(item?.faction_required_to_buy),
                })
              : predicate({ kind: "withheld", reason: "unpublished_target" }),
          );
        }
        if (Number(item?.adventuring_level_needed) > 0)
          parts.push(
            predicate({
              kind: "metric_at_least",
              metric: "adventuring_fraction",
              amount: Number(item?.adventuring_level_needed),
              unit: "fraction",
            }),
          );
        add(parts, "normal_ui");
        // Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor — a seasonal offer exists only while its season runs.
        if (detail.season !== null)
          add(
            [
              predicate(
                { kind: "season_active", season: detail.season as Season },
                "current_world",
              ),
            ],
            "server",
            "current_world",
          );
        break;
      }
      case "kill":
      case "portable_chest":
      case "pack_use":
      case "merge":
      case "fragment":
      case "blessing":
        break;
      default:
        dataError(id, "unsupported method");
    }
    const tierRoots: RequirementRoot[] = [];
    if (method.rule_id === "altar_final_loot") {
      const tierOutput = (outputsByMethod.get(id) ?? []).find(
        (output) => output.condition_slot !== null,
      );
      if (tierOutput) {
        const tier = tierOutput.condition_slot!;
        if (tier < 0 || tier > 3) dataError(id, "invalid altar tier");
        const altar = get("altars", detail.altar_id);
        if (!altar) dataError(id, "missing altar tier definition");
        const bounds = [
          "magic_reward_threshold",
          "epic_reward_threshold",
          "legendary_reward_threshold",
        ].map((field) => numeric(altar, field, id)!);
        if (!(bounds[0] <= bounds[1] && bounds[1] <= bounds[2]))
          dataError(id, "unordered altar tier thresholds");
        const root: RequirementRoot = {
          phase: "loot",
          subject: "player",
          enforcement: "both",
          expression: predicate({
            kind: "altar_tier",
            altarId: altar.id,
            tier: tier as 0 | 1 | 2 | 3,
            minimumScore: tier === 0 ? 0 : bounds[tier - 1],
            maximumScore: tier === 3 ? null : bounds[tier] - 1,
          }),
        };
        tierRoots.push(root);
        methodRequirements.push(root);
      }
    }
    const providerViews: ProviderView[] = [];
    for (const domain of Object.keys(PROVIDER_TABLES) as ProviderDomain[]) {
      for (const membership of providersByMethod.get(domain)?.get(id) ?? []) {
        const providerId = text(membership, PROVIDER_TABLES[domain], id);
        const table =
          domain === "resource_spawns" ? "gathering_resource_spawns" : domain;
        const entity = get(table, providerId);
        if (!entity) dataError(id, `missing ${domain} provider ${providerId}`);
        const ref: ProviderRef = { kind: domain, id: providerId };
        const parent =
          domain === "monster_spawns"
            ? get("monsters", entity.monster_id)
            : domain === "resource_spawns"
              ? get("gathering_resources", entity.resource_id)
              : undefined;
        const name =
          domain === "chests"
            ? "Chest"
            : domain === "treasure_locations"
              ? "Treasure site"
              : String(entity.name ?? parent?.name ?? providerId);
        const physical = !["items", "classes"].includes(domain);
        const placements =
          domain === "npcs" ? (npcSpawnsByNpc.get(providerId) ?? []) : [entity];
        // A definition without a configured spawn is inspectable, not a physical source.
        if (domain === "npcs" && !placements.length) {
          providerViews.push({
            ref,
            name,
            offerIndex: membership.offer_index as number | null,
            location: null,
            requirements: methodRequirements,
          });
          continue;
        }
        for (const placement of placements) {
          const x = placement.position_x,
            y = placement.position_y,
            z = placement.position_z;
          const incoming =
            (domain === "monster_spawns"
              ? monsterTriggers.get(placement.id)
              : domain === "npcs"
                ? npcTriggers.get(placement.id)
                : undefined) ?? [];
          const providerRequirements = [...methodRequirements];
          if (incoming.length) {
            const alternatives = incoming.map((trigger) => {
              const roots = requirements.get(`summon_trigger:${trigger.id}`);
              if (!roots?.length)
                dataError(trigger.id, "missing summon activation requirements");
              return combine(
                "all",
                roots.map((root) => root.expression),
              );
            });
            providerRequirements.push({
              phase: "activate",
              subject: "current_world",
              enforcement: "both",
              expression: combine("any", alternatives),
            });
          }
          // Source: server-scripts/Monster.cs:UpdateServer_DEAD; server-scripts/Npc.cs:UpdateServer_IDLE — a seasonal monster or NPC is present only while its season runs.
          const season = (domain === "monster_spawns" ? parent : entity)
            ?.season as Season | null | undefined;
          if (
            (domain === "monster_spawns" || domain === "npcs") &&
            season != null
          )
            providerRequirements.push({
              phase: "activate",
              subject: "current_world",
              enforcement: "server",
              expression: predicate(
                { kind: "season_active", season },
                "current_world",
              ),
            });
          const visible =
            typeof x === "number" &&
            typeof y === "number" &&
            typeof z === "number" &&
            [x, y, z].every(Number.isFinite);
          const location: DirectLocation | null = physical
            ? {
                provider: ref,
                name,
                zoneId:
                  typeof placement.zone_id === "string"
                    ? placement.zone_id
                    : null,
                subZoneId:
                  typeof placement.sub_zone_id === "string"
                    ? placement.sub_zone_id
                    : null,
                position: visible ? { x, y, z } : null,
                geometryVisibility: visible
                  ? "visible"
                  : placement.zone_id
                    ? "suppressed"
                    : "unavailable",
                purpose: "award",
                methodIds: [id],
                approximate: method.rule_id === "placeholder_loot",
              }
            : null;
          const offerIndex = membership.offer_index;
          if (
            offerIndex !== null &&
            (typeof offerIndex !== "number" ||
              !Number.isInteger(offerIndex) ||
              offerIndex < 0)
          )
            dataError(id, "invalid offer index");
          providerViews.push({
            ref,
            name,
            offerIndex: offerIndex as number | null,
            location,
            requirements: providerRequirements,
          });
        }
      }
    }
    const homeProviders: HomeProviderView[] = (homesByMethod.get(id) ?? []).map(
      (home) => {
        if (home.offer_index !== null) integer(home, "offer_index", 0);
        const structureItemId = text(home, "structure_item_id", id),
          componentPath = text(home, "component_path", id);
        if (!get("items", structureItemId))
          dataError(id, "missing home capability structure");
        return {
          ...home,
          structure_item_id: structureItemId,
          component_path: componentPath,
          offer_index:
            home.offer_index === null ? null : Number(home.offer_index),
          requirements: [
            {
              phase,
              subject: "player",
              enforcement: "both",
              expression: combine("all", [
                predicate({ kind: "house_owned" }),
                predicate({
                  kind: "home_station",
                  structureItemId,
                  componentPath,
                }),
              ]),
            },
          ],
        };
      },
    );
    for (const group of costsByMethod.get(id) ?? []) {
      if (
        group.selection_rule !== "always" ||
        group.quantity_rule === "quest_completion"
      )
        continue;
      const parts: RequirementExpression[] = [];
      for (const input of inputsByGroup.get(group.id) ?? []) {
        if (input.withheld)
          parts.push(
            predicate({ kind: "withheld", reason: "unpublished_target" }),
          );
        else if (input.item_id && input.role !== "selected_instance")
          parts.push(
            predicate({
              kind: "item_count",
              itemId: input.item_id,
              location: "inventory",
              amount: input.amount,
            }),
          );
      }
      add(parts);
    }
    let repeatability: Repeatability = { kind: "repeatable" };
    if (method.kind === "creation")
      repeatability = { kind: "once_per_character" };
    else if (method.kind === "quest_complete") {
      const quest = get("quests", detail.quest_id);
      repeatability =
        quest?.is_repeatable || quest?.is_adventurer_quest
          ? { kind: "state_dependent", basis: "quest_cycle" }
          : { kind: "once_per_character" };
    } else if (method.kind === "quest_accept")
      repeatability = { kind: "state_dependent", basis: "quest_cycle" };
    else if (
      method.kind === "altar_activate" ||
      method.rule_id === "altar_final_loot"
    )
      repeatability = { kind: "state_dependent", basis: "event_reset" };
    else if (
      ["kill", "gather", "world_chest", "treasure_dig"].includes(method.kind)
    )
      repeatability = { kind: "state_dependent", basis: "world_state" };
    else if (method.kind === "cap_xp")
      repeatability = { kind: "state_dependent", basis: "xp_cycle" };
    const outputViews = (outputsByMethod.get(id) ?? [])
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((output) => {
        const outputRequirements: RequirementRoot[] = [...tierRoots];
        if (output.condition_slot !== null) {
          if (method.kind === "quest_complete") {
            const slot = rewardSlotsByQuest
              .get(String(detail.quest_id))
              ?.find((row) => row.ordinal === output.condition_slot);
            if (!slot) dataError(id, "missing conditional reward slot");
            if (slot.slot_kind === "class")
              outputRequirements.push({
                phase: "complete",
                subject: "player",
                enforcement: "both",
                expression: slot.class_withheld
                  ? predicate({
                      kind: "withheld",
                      reason: "unpublished_target",
                    })
                  : predicate({
                      kind: "identity_is",
                      identityKind: "class",
                      id: text(slot, "class_id", id),
                    }),
              });
          } else if (method.rule_id !== "altar_final_loot")
            dataError(id, "unsupported conditional output");
        }
        return {
          ...output,
          quantity: evaluateOutputQuantity(output),
          requirements: outputRequirements,
        };
      });
    const view: MethodView = freeze({
      methodId: id,
      kind: method.kind,
      ruleId: method.rule_id,
      phase,
      setupMethod: method.setup_method_id
        ? build(method.setup_method_id)
        : null,
      providers: providerViews,
      homeProviders,
      outputs: outputViews,
      costGroups: (costsByMethod.get(id) ?? []).map((group) => ({
        ...group,
        inputs: (inputsByGroup.get(group.id) ?? [])
          .slice()
          .sort((a, b) => a.ordinal - b.ordinal),
      })),
      requirements: methodRequirements,
      effects: effectsByMethod.get(id) ?? [],
      repeatability,
      probabilityResults: calculateMethodProbabilities(rows, method, detail),
      probabilityFactors: methodProbabilityFactors(rows, method, detail),
      rooted: method.rooted === 1,
      sourceLevelHint: method.source_level_hint,
      detail,
    });
    methodViews.set(id, view);
    pending.delete(id);
    return view;
  }
  for (const method of rows.methods) build(method.id);
  return Object.freeze({
    rows,
    methods: readonlyMap(methods),
    outputsByMethod,
    inputsByGroup,
    costsByMethod,
    entriesByPool,
    entities: readonlyMap(entityMaps),
    methodViews: readonlyMap(methodViews),
    requirements: readonlyMap(new Map(requirements)),
  });
}
