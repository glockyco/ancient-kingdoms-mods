import type {
  AcquisitionModel,
  DataRow,
  DefinitionInspection,
  DirectLocation,
  InspectedOutcome,
  ItemSourceView,
  ItemUseView,
  MethodView,
  MonsterLootView,
  ProviderRef,
  RequirementRoot,
} from "./types";
import { dataError, text } from "./queries";
import type { RecipeTeachingItemRow } from "./queries";
import { CODE_DEFINED_RULES } from "./rules";
import { SEASON_ORDER, type Season } from "../data/seasonal-events";

const entityNames = new WeakMap<
  AcquisitionModel,
  Readonly<Record<string, string>>
>();

export function projectAcquisitionNames(
  model: AcquisitionModel,
): Readonly<Record<string, string>> {
  const cached = entityNames.get(model);
  if (cached) return cached;
  const names: Record<string, string> = Object.create(null);
  for (const [kind, entities] of model.entities)
    for (const row of entities.values())
      if (typeof row.name === "string") {
        names[row.id] = row.name;
        names[`${kind}:${row.id}`] = row.name;
      }
  for (const [kind, parentKind, parentKey] of [
    ["monster_spawns", "monsters", "monster_id"],
    ["npc_spawns", "npcs", "npc_id"],
  ] as const)
    for (const row of model.entities.get(kind)?.values() ?? []) {
      const parent = model.entities
        .get(parentKind)
        ?.get(String(row[parentKey]));
      if (typeof parent?.name === "string") {
        names[row.id] = parent.name;
        names[`${kind}:${row.id}`] = parent.name;
      }
    }
  for (const [table, targetTable, targetColumn] of [
    ["quest_objective_items", "items", "item_id"],
    ["quest_objective_brews", "items", "item_id"],
    ["quest_objective_monsters", "monsters", "monster_id"],
  ] as const)
    for (const row of model.rows.facts[table] ?? []) {
      const name = names[`${targetTable}:${row[targetColumn]}`];
      if (name) names[`quest_objective:${row.id}`] = name;
    }
  for (const row of model.rows.facts.quest_objective_locations ?? []) {
    const zone = names[`zones:${row.zone_id}`];
    const subZone = names[`zone_triggers:${row.sub_zone_id}`];
    const name =
      (typeof row.tracking_quest_location === "string" &&
        row.tracking_quest_location) ||
      (subZone && zone && subZone !== zone
        ? `${subZone} (${zone})`
        : subZone || zone) ||
      (typeof row.discovered_location === "string" && row.discovered_location);
    if (name) names[`quest_objective:${row.id}`] = name;
  }
  Object.freeze(names);
  entityNames.set(model, names);
  return names;
}

type RecipeTeachingItem = Pick<
  RecipeTeachingItemRow,
  "id" | "name" | "tooltip_html" | "icon_path"
>;

interface ProjectionIndex {
  awards: Map<string, MethodView[]>;
  offers: Map<string, MethodView[]>;
  initiators: Map<string, MethodView[]>;
  providers: Map<string, MethodView[]>;
  uses: Map<string, MethodView[]>;
  parentAwards: Map<string, MethodView[]>;
  monsters: Map<string, MethodView[]>;
  sources: Map<string, ItemSourceView>;
  inspections: Map<string, DefinitionInspection>;
  geometry: Map<string, readonly DirectLocation[]>;
  itemUsages: Map<string, readonly ItemUseView[]>;
  requirementUses: Map<
    string,
    { kind: string; id: string; root: RequirementRoot }[]
  >;
  objectives: Map<string, DataRow>;
  itemObjectives: Map<string, DataRow[]>;
  brewObjectives: Map<string, DataRow[]>;
  recipeTeachers: Map<string, readonly RecipeTeachingItem[]>;
}
const indexes = new WeakMap<AcquisitionModel, ProjectionIndex>();
function projectionIndex(model: AcquisitionModel): ProjectionIndex {
  const cached = indexes.get(model);
  if (cached) return cached;
  const index: ProjectionIndex = {
    awards: new Map(),
    offers: new Map(),
    initiators: new Map(),
    providers: new Map(),
    uses: new Map(),
    parentAwards: new Map(),
    monsters: new Map(),
    sources: new Map(),
    inspections: new Map(),
    geometry: new Map(),
    itemUsages: new Map(),
    requirementUses: new Map(),
    objectives: new Map(
      (model.rows.facts.quest_objectives ?? []).map((row) => [row.id, row]),
    ),
    itemObjectives: new Map(),
    brewObjectives: new Map(),
    recipeTeachers: new Map(),
  };
  function add(
    map: Map<string, MethodView[]>,
    key: string,
    method: MethodView,
  ) {
    const values = map.get(key) ?? [];
    if (!values.includes(method)) values.push(method);
    map.set(key, values);
  }
  for (const method of model.methodViews.values()) {
    for (const output of method.outputs)
      if (method.rooted && output.item_id && !output.withheld)
        add(index.awards, output.item_id, method);
    for (const result of method.probabilityResults)
      if (method.rooted && result.target.kind === "item")
        add(index.awards, result.target.itemId, method);
    if (method.kind === "vendor")
      add(index.offers, String(method.detail.offered_item_id), method);
    if (method.kind === "recipe")
      add(index.offers, String(method.detail.declared_result_item_id), method);
    if (
      ["portable_chest", "pack_use", "merge", "fragment"].includes(method.kind)
    ) {
      add(index.initiators, String(method.detail.item_id), method);
      add(index.uses, String(method.detail.item_id), method);
    }
    if (
      method.kind === "treasure_dig" &&
      typeof method.detail.map_item_id === "string"
    )
      add(index.uses, method.detail.map_item_id, method);
    if (method.kind === "kill")
      add(index.monsters, String(method.detail.monster_id), method);
    for (const provider of method.providers)
      add(index.providers, `${provider.ref.kind}:${provider.ref.id}`, method);
    for (const group of method.costGroups)
      for (const input of group.inputs)
        if (input.item_id) add(index.uses, input.item_id, method);
    for (const root of method.requirements) {
      const pending = [root.expression];
      while (pending.length) {
        const e = pending.pop()!;
        if (e.kind !== "predicate") pending.push(...e.operands);
        else if (
          e.predicate.kind === "item_count" ||
          e.predicate.kind === "party_key"
        )
          add(index.uses, e.predicate.itemId, method);
      }
    }
  }
  for (const binding of model.rows.methodPools) {
    const method = model.methodViews.get(String(binding.method_id));
    if (!method?.rooted) continue;
    for (const entry of model.entriesByPool.get(String(binding.pool_id)) ?? [])
      if (entry.resolution === "uniform_child" && entry.item_id)
        add(index.parentAwards, entry.item_id, method);
  }
  for (const [key, roots] of model.requirements) {
    const split = key.indexOf(":"),
      kind = key.slice(0, split),
      id = key.slice(split + 1);
    if (
      ![
        "item",
        "skill",
        "quest",
        "portal",
        "resource",
        "summon_trigger",
      ].includes(kind)
    )
      dataError(key, "unsupported requirement entity");
    for (const root of roots) {
      const itemIds = new Set<string>(),
        pending = [root.expression];
      while (pending.length) {
        const expression = pending.pop()!;
        if (expression.kind !== "predicate")
          pending.push(...expression.operands);
        else if (
          expression.predicate.kind === "item_count" ||
          expression.predicate.kind === "party_key"
        )
          itemIds.add(expression.predicate.itemId);
      }
      for (const itemId of itemIds) {
        const uses = index.requirementUses.get(itemId) ?? [];
        uses.push({ kind, id, root });
        index.requirementUses.set(itemId, uses);
      }
    }
  }
  for (const [table, target] of [
    ["quest_objective_items", index.itemObjectives],
    ["quest_objective_brews", index.brewObjectives],
  ] as const)
    for (const child of model.rows.facts[table] ?? []) {
      if (typeof child.item_id !== "string") continue;
      const children = target.get(child.item_id) ?? [];
      children.push(child);
      target.set(child.item_id, children);
    }
  indexes.set(model, index);
  return index;
}

export function projectRecipeTeachers(
  model: AcquisitionModel,
  resultItemId: string,
): readonly RecipeTeachingItem[] {
  const index = projectionIndex(model);
  const cached = index.recipeTeachers.get(resultItemId);
  if (cached) return cached;
  const teachers = (model.rows.facts.recipe_teaching_items ?? [])
    .filter((row) => row.result_item_id === resultItemId)
    .map((row) => {
      const nullableText = (
        field: "tooltip_html" | "icon_path",
      ): string | null => {
        const value = row[field];
        if (value !== null && typeof value !== "string")
          return dataError(row.id, `invalid ${field}`);
        return value;
      };
      return Object.freeze({
        id: text(row, "id", "recipe teacher"),
        name: text(row, "name", row.id),
        tooltip_html: nullableText("tooltip_html"),
        icon_path: nullableText("icon_path"),
      });
    })
    .sort((a, b) =>
      a.name < b.name
        ? -1
        : a.name > b.name
          ? 1
          : a.id < b.id
            ? -1
            : a.id > b.id
              ? 1
              : 0,
    );
  const result = Object.freeze(teachers);
  index.recipeTeachers.set(resultItemId, result);
  return result;
}

function locations(
  methods: readonly MethodView[],
  purpose: DirectLocation["purpose"],
): readonly DirectLocation[] {
  const byProvider = new Map<string, DirectLocation>();
  for (const method of methods) {
    for (const provider of method.providers) {
      if (!provider.location) continue;
      const key = JSON.stringify([
        provider.ref,
        provider.location.zoneId,
        provider.location.subZoneId,
        provider.location.position,
        provider.location.geometryVisibility,
        provider.location.approximate,
      ]);
      const previous = byProvider.get(key);
      byProvider.set(
        key,
        Object.freeze({
          ...provider.location,
          purpose,
          methodIds: Object.freeze([
            ...new Set([...(previous?.methodIds ?? []), method.methodId]),
          ]),
        }),
      );
    }
  }
  return Object.freeze([...byProvider.values()]);
}

export function projectItemSources(
  model: AcquisitionModel,
  itemId: string,
): ItemSourceView {
  const index = projectionIndex(model);
  const cached = index.sources.get(itemId);
  if (cached) return cached;
  const inspection = projectDefinitionInspection(model, itemId);
  const methods = index.awards.get(itemId) ?? [];
  const hints = methods.flatMap((method) =>
    method.sourceLevelHint === null ? [] : [method.sourceLevelHint],
  );
  const source = Object.freeze({
    itemId,
    methods: Object.freeze(methods),
    inspection,
    hasKnownSource: methods.length > 0,
    sourceLevelHint: hints.length ? Math.min(...hints) : null,
  });
  index.sources.set(itemId, source);
  return source;
}

export function projectDefinitionInspection(
  model: AcquisitionModel,
  itemId: string,
): DefinitionInspection {
  const index = projectionIndex(model);
  const cached = index.inspections.get(itemId);
  if (cached) return cached;
  const offeredAssets = index.offers.get(itemId) ?? [];
  const initiatingMemberships = index.initiators.get(itemId) ?? [];
  const fixedContents: InspectedOutcome[] = [];
  const randomOutcomes: InspectedOutcome[] = [];
  const portableChestOutcomes: InspectedOutcome[] = [];
  const seen = new Set<string>();
  for (const method of initiatingMemberships) {
    if (method.kind !== "pack_use") continue;
    for (const output of method.outputs) {
      const key = JSON.stringify([
        output.item_id,
        output.withheld,
        output.quantity,
        output.ordinal,
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      fixedContents.push({
        itemId: output.item_id,
        withheld: !!output.withheld,
        amount: output.quantity,
        poolId: null,
        ordinal: output.ordinal,
        probability: output.yield_rule === "fixed" ? 1 : null,
      });
    }
  }
  for (const binding of model.rows.facts.item_pool_definitions ?? []) {
    if (binding.item_id !== itemId) continue;
    const poolId = String(binding.pool_id);
    const entries = model.entriesByPool.get(poolId);
    if (!entries) dataError(itemId, `missing inspection pool ${poolId}`);
    if (binding.role === "portable_chest") {
      const chestMethod = initiatingMemberships.find(
        (method) =>
          method.kind === "portable_chest" &&
          model.rows.methodPools.some(
            (pool) =>
              pool.method_id === method.methodId && pool.pool_id === poolId,
          ),
      );
      const publicIds = [
        ...new Set(
          entries.flatMap((entry) => (entry.item_id ? [entry.item_id] : [])),
        ),
      ];
      for (const publicId of publicIds) {
        const result = chestMethod?.probabilityResults.find(
          (result) =>
            result.target.kind === "item" &&
            result.target.itemId === publicId &&
            result.event === "opening",
        );
        portableChestOutcomes.push({
          itemId: publicId,
          withheld: false,
          amount: { kind: "exact", value: 1 },
          poolId,
          ordinal: entries.find((entry) => entry.item_id === publicId)!.ordinal,
          probability: result?.probability ?? null,
        });
      }
    } else {
      const grouped = new Map<string, InspectedOutcome>();
      for (const entry of entries) {
        if (!entry.item_id) continue;
        const previous = grouped.get(entry.item_id);
        grouped.set(entry.item_id, {
          itemId: entry.item_id,
          withheld: false,
          amount: { kind: "exact", value: 1 },
          poolId,
          ordinal: previous?.ordinal ?? entry.ordinal,
          probability: (previous?.probability ?? 0) + 1 / entries.length,
        });
      }
      randomOutcomes.push(...grouped.values());
    }
  }
  const inspection = Object.freeze({
    offeredAssets: Object.freeze(offeredAssets),
    initiatingMemberships: Object.freeze(initiatingMemberships),
    fixedContents: Object.freeze(fixedContents),
    randomOutcomes: Object.freeze(randomOutcomes),
    portableChestOutcomes: Object.freeze(portableChestOutcomes),
    parentAwards: Object.freeze(index.parentAwards.get(itemId) ?? []),
    offerLocations: locations(offeredAssets, "offer"),
  });
  index.inspections.set(itemId, inspection);
  return inspection;
}

export function projectProviderMethods(
  model: AcquisitionModel,
  provider: ProviderRef,
): readonly MethodView[] {
  return Object.freeze(
    projectionIndex(model).providers.get(`${provider.kind}:${provider.id}`) ??
      [],
  );
}

export function projectDirectGeometry(
  model: AcquisitionModel,
  itemId: string,
): readonly DirectLocation[] {
  const index = projectionIndex(model);
  const cached = index.geometry.get(itemId);
  if (cached) return cached;
  const geometry = locations(
    [
      ...(index.awards.get(itemId) ?? []).filter(
        (method) =>
          ![
            "portable_chest",
            "pack_use",
            "merge",
            "fragment",
            "blessing",
            "essence",
          ].includes(method.kind),
      ),
      // A distribution item is rolled where its parent award happens.
      ...(index.parentAwards.get(itemId) ?? []),
    ],
    "award",
  );
  index.geometry.set(itemId, geometry);
  return geometry;
}

export function projectMonsterLoot(
  model: AcquisitionModel,
  monsterId: string,
): MonsterLootView {
  const monster = model.entities.get("monsters")?.get(monsterId);
  const pool = model.rows.pools.find((p) => p.id === monster?.loot_pool_id);
  return Object.freeze({
    monsterId,
    definitionPool: pool
      ? Object.freeze({ pool, entries: model.entriesByPool.get(pool.id) ?? [] })
      : null,
    contexts: Object.freeze(
      projectionIndex(model).monsters.get(monsterId) ?? [],
    ),
  });
}

function expressionUses(root: RequirementRoot, itemId: string): boolean {
  const pending = [root.expression];
  while (pending.length) {
    const expression = pending.pop()!;
    if (expression.kind === "predicate") {
      const p = expression.predicate;
      if (
        (p.kind === "item_count" || p.kind === "party_key") &&
        p.itemId === itemId
      )
        return true;
    } else pending.push(...expression.operands);
  }
  return false;
}

export function projectItemUsages(
  model: AcquisitionModel,
  itemId: string,
): readonly ItemUseView[] {
  const index = projectionIndex(model);
  const cached = index.itemUsages.get(itemId);
  if (cached) return cached;
  const uses: ItemUseView[] = [];
  const item = model.entities.get("items")?.get(itemId);
  if (item?.item_type === "augment" && !item.augment_armor_set_name) {
    const recoveryPrices: Record<string, number> =
      CODE_DEFINED_RULES.augment.recoveryGoldByQuality;
    uses.push({
      itemId,
      kind: "augment",
      method: null,
      phase: "use",
      role: "attachment",
      amount: { kind: "exact", value: 1 },
      consumed: true,
      requirements: [],
      useLocations: [],
      entity: null,
      compatibility: {
        categoryRule: item.augment_is_defensive ? "in" : "not_in",
        categories: [...CODE_DEFINED_RULES.augment.defensiveCategories],
        excludedItemTypes: [...CODE_DEFINED_RULES.augment.excludedItemTypes],
        recoverable: true,
        normalRecoveryGold:
          recoveryPrices[String(item.quality)] ??
          CODE_DEFINED_RULES.augment.defaultRecoveryGold,
      },
    });
  }
  for (const method of index.uses.get(itemId) ?? []) {
    // The map shows where a treasure map is dug, where a key opens a placed chest and
    // where an activation item starts a placed altar.
    const useLocations =
      (method.kind === "treasure_dig" &&
        method.detail.map_item_id === itemId) ||
      method.kind === "world_chest" ||
      method.kind === "altar_activate"
        ? locations([method], "use")
        : [];
    let hasCost = false;
    for (const group of method.costGroups) {
      for (const input of group.inputs) {
        if (input.item_id !== itemId) continue;
        hasCost = true;
        uses.push({
          itemId,
          kind: "cost",
          method,
          phase: group.phase,
          role: input.role,
          amount:
            group.quantity_rule === "all_carried"
              ? { kind: "unknown" }
              : { kind: "exact", value: input.amount },
          consumed: true,
          requirements: method.requirements,
          // Lockpicks are not listed as opening chests, so the map leaves those chests out.
          useLocations: input.role === "lockpick" ? [] : useLocations,
          entity: null,
        });
      }
    }
    const roots = hasCost
      ? []
      : method.requirements.filter((root) => expressionUses(root, itemId));
    if (roots.length)
      uses.push({
        itemId,
        kind: "requirement",
        method,
        phase: method.phase,
        role: "retained",
        amount: { kind: "unknown" },
        consumed: false,
        requirements: roots,
        useLocations,
        entity: null,
      });
    if (
      ["portable_chest", "pack_use", "merge", "fragment"].includes(
        method.kind,
      ) &&
      method.detail.item_id === itemId &&
      !hasCost
    ) {
      uses.push({
        itemId,
        kind: "initiator",
        method,
        phase: "use",
        role: method.kind,
        amount: { kind: "exact", value: 1 },
        consumed: false,
        requirements: method.requirements,
        useLocations,
        entity: null,
      });
    }
    if (
      method.kind === "treasure_dig" &&
      method.detail.map_item_id === itemId &&
      !uses.some((use) => use.method === method)
    ) {
      uses.push({
        itemId,
        kind: "requirement",
        method,
        phase: "use",
        role: "treasure_map",
        amount: { kind: "exact", value: 1 },
        consumed: true,
        requirements: method.requirements,
        useLocations,
        entity: null,
      });
    }
  }
  for (const child of index.itemObjectives.get(itemId) ?? []) {
    const objective = index.objectives.get(child.id);
    if (!objective) dataError(child.id, "missing objective");
    const questId = String(objective.quest_id);
    uses.push({
      itemId,
      kind: "objective",
      method: null,
      phase: "fulfill",
      role: String(objective.role),
      amount: { kind: "exact", value: Number(objective.amount) },
      consumed: false,
      requirements: (model.requirements.get(`quest:${questId}`) ?? []).filter(
        (root) => root.phase === "fulfill",
      ),
      useLocations: [],
      entity: { kind: "quest", id: questId },
    });
  }
  for (const child of index.brewObjectives.get(itemId) ?? []) {
    const objective = index.objectives.get(child.id);
    if (!objective) dataError(child.id, "missing brew objective");
    const questId = String(objective.quest_id);
    uses.push({
      itemId,
      kind: "objective",
      method: null,
      phase: "fulfill",
      role: "brew_counter",
      amount: { kind: "exact", value: Number(objective.amount) },
      consumed: false,
      requirements: (model.requirements.get(`quest:${questId}`) ?? []).filter(
        (root) => root.phase === "fulfill",
      ),
      useLocations: [],
      entity: { kind: "quest", id: questId },
    });
  }
  for (const { kind, id, root } of index.requirementUses.get(itemId) ?? []) {
    if (
      kind === "quest" &&
      uses.some(
        (use) =>
          use.phase === root.phase &&
          (use.method?.detail.quest_id === id ||
            (use.entity?.kind === "quest" && use.entity.id === id)),
      )
    )
      continue;
    const useLocations: DirectLocation[] = [];
    if (kind === "portal") {
      const portal = model.entities.get("portals")?.get(id);
      if (!portal) dataError(id, "missing portal use definition");
      const zoneId =
        typeof portal.from_zone_id === "string" ? portal.from_zone_id : null;
      const subZoneId =
        typeof portal.from_sub_zone_id === "string"
          ? portal.from_sub_zone_id
          : null;
      const zoneName = zoneId
        ? model.entities.get("zones")?.get(zoneId)?.name
        : null;
      const x = portal.position_x,
        y = portal.position_y,
        z = portal.position_z;
      const visible =
        typeof x === "number" &&
        typeof y === "number" &&
        typeof z === "number" &&
        [x, y, z].every(Number.isFinite);
      useLocations.push({
        provider: { kind: "portals", id },
        name: zoneName ? `Portal in ${zoneName}` : "Portal",
        zoneId,
        subZoneId,
        position: visible ? { x, y, z } : null,
        geometryVisibility: visible
          ? "visible"
          : zoneId
            ? "suppressed"
            : "unavailable",
        purpose: "use",
        methodIds: [],
        approximate: false,
      });
    }
    uses.push({
      itemId,
      kind: "requirement",
      method: null,
      phase: root.phase,
      role: "retained",
      amount: { kind: "unknown" },
      consumed: false,
      requirements: [root],
      useLocations,
      entity: {
        kind: kind as
          "item" | "skill" | "quest" | "portal" | "resource" | "summon_trigger",
        id,
      },
    });
  }
  function freeze(value: unknown): void {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  freeze(uses);
  index.itemUsages.set(itemId, uses);
  return uses;
}

/** Season conditions a root demands, read through its required (all) branches. */
function rootSeasons(root: RequirementRoot): Season[] {
  const seasons: Season[] = [];
  const pending = [root.expression];
  while (pending.length) {
    const expression = pending.pop()!;
    if (expression.kind === "predicate") {
      if (expression.predicate.kind === "season_active")
        seasons.push(expression.predicate.season);
    } else if (expression.kind === "all") pending.push(...expression.operands);
  }
  return seasons;
}

const bySeasonOrder = (seasons: Iterable<Season>): readonly Season[] =>
  Object.freeze(
    [...new Set(seasons)].sort((a, b) => SEASON_ORDER[a] - SEASON_ORDER[b]),
  );

/** Seasons required to accept a quest, empty when any offering NPC is present all year. */
export function projectQuestSeasons(
  model: AcquisitionModel,
  questId: string,
): readonly Season[] {
  const seasons = (model.rows.facts.npc_quest_memberships ?? [])
    .filter((row) => row.quest_id === questId && row.role === "offer")
    .map(
      (row) =>
        model.entities.get("npcs")?.get(String(row.npc_id))?.season as
          Season | null | undefined,
    );
  return seasons.length && seasons.every((season) => season != null)
    ? bySeasonOrder(seasons as Season[])
    : [];
}

/**
 * The seasons a method needs, empty when it is available all year: its own season
 * conditions, a season every provider needs, and for a quest completion the
 * seasons of the NPCs that offer the quest, when every one of them is seasonal.
 */
export function projectMethodSeasons(
  model: AcquisitionModel,
  method: MethodView,
): readonly Season[] {
  const seasons = method.requirements.flatMap(rootSeasons);
  const providerSeasons = method.providers.map((provider) =>
    provider.requirements.flatMap(rootSeasons),
  );
  if (providerSeasons.length && providerSeasons.every((list) => list.length))
    seasons.push(...providerSeasons.flat());
  if (method.kind === "quest_complete")
    seasons.push(...projectQuestSeasons(model, String(method.detail.quest_id)));
  return bySeasonOrder(seasons);
}

/** The seasons an item can only be obtained in, empty when it can be obtained all year. */
export function projectItemSeasons(
  model: AcquisitionModel,
  itemId: string,
): readonly Season[] {
  return bySeasonOrder(
    (model.rows.facts.item_seasons ?? [])
      .filter((row) => row.item_id === itemId)
      .map((row) => row.season_id as Season),
  );
}
