import type {
  AcquisitionModel,
  DataRow,
  DirectLocation,
  FingerprintSelection,
  MethodView,
  RequirementExpression,
  RequirementRoot,
} from "./types";
import {
  projectDefinitionInspection,
  projectItemSources,
  projectItemUsages,
  projectMonsterLoot,
  projectProviderMethods,
  projectRecipeTeachers,
} from "./projections";
import { dataError } from "./queries";
import { CODE_DEFINED_RULES } from "./rules";

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Complete structural ordering without expanding shared public facts into strings. */
export function createSemanticComparator(): (
  left: unknown,
  right: unknown,
) => number {
  const keys = new WeakMap<object, readonly string[]>();
  const comparisons = new WeakMap<object, WeakMap<object, number>>();
  const immutability = new WeakMap<object, boolean>();
  function isImmutable(value: object): boolean {
    const cached = immutability.get(value);
    if (cached !== undefined) return cached;
    if (!Object.isFrozen(value)) return false;
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!Object.hasOwn(descriptor, "value"))
        return dataError("fingerprint", "semantic accessors are unsupported");
      const child: unknown = descriptor.value;
      if (child && typeof child === "object" && !isImmutable(child)) {
        immutability.set(value, false);
        return false;
      }
    }
    immutability.set(value, true);
    return true;
  }
  const priority = ["identity", "id", "provider", "ref", "kind"];
  function objectKeys(value: object): readonly string[] {
    const cached = keys.get(value);
    if (cached) return cached;
    const result = Object.keys(value).sort((a, b) => {
      const aPriority = priority.indexOf(a),
        bPriority = priority.indexOf(b);
      return (
        (aPriority < 0 ? priority.length : aPriority) -
          (bPriority < 0 ? priority.length : bPriority) ||
        (a < b ? -1 : a > b ? 1 : 0)
      );
    });
    for (const key of result)
      if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, "value"))
        dataError("fingerprint", "semantic accessors are unsupported");
    if (Object.isFrozen(value)) keys.set(value, result);
    return result;
  }
  function rank(value: unknown): number {
    return value === undefined
      ? 0
      : value === null
        ? 1
        : typeof value === "boolean"
          ? 2
          : typeof value === "number"
            ? 3
            : typeof value === "string"
              ? 4
              : Array.isArray(value)
                ? 5
                : 6;
  }
  function compare(left: unknown, right: unknown): number {
    if (left === right) return 0;
    const leftRank = rank(left),
      rightRank = rank(right);
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (leftRank < 5) {
      if (typeof left === "number" && typeof right === "number") {
        if (!Number.isFinite(left) || !Number.isFinite(right))
          return dataError("fingerprint", "nonfinite semantic number");
        return left < right ? -1 : 1;
      }
      if (typeof left === "string" && typeof right === "string")
        return left < right ? -1 : 1;
      return left ? 1 : -1;
    }
    const a = left as Record<string, unknown>,
      b = right as Record<string, unknown>;
    const cached = comparisons.get(a)?.get(b);
    if (cached !== undefined) return cached;
    let result = 0;
    if (Array.isArray(left) && Array.isArray(right)) {
      const length = Math.min(left.length, right.length);
      for (let index = 0; index < length && !result; index++) {
        const aDescriptor = Object.getOwnPropertyDescriptor(
            left,
            String(index),
          ),
          bDescriptor = Object.getOwnPropertyDescriptor(right, String(index));
        if (
          (aDescriptor && !Object.hasOwn(aDescriptor, "value")) ||
          (bDescriptor && !Object.hasOwn(bDescriptor, "value"))
        )
          dataError("fingerprint", "semantic accessors are unsupported");
        result = compare(left[index], right[index]);
      }
      if (!result) result = left.length - right.length;
    } else {
      const aKeys = objectKeys(a),
        bKeys = objectKeys(b),
        length = Math.min(aKeys.length, bKeys.length);
      for (let index = 0; index < length && !result; index++) {
        const aKey = aKeys[index],
          bKey = bKeys[index];
        result = aKey < bKey ? -1 : aKey > bKey ? 1 : compare(a[aKey], b[bKey]);
      }
      if (!result) result = aKeys.length - bKeys.length;
    }
    if (isImmutable(a) && isImmutable(b)) {
      let results = comparisons.get(a);
      if (!results) comparisons.set(a, (results = new WeakMap()));
      results.set(b, result);
    }
    return result;
  }
  return compare;
}

const projectors = new WeakMap<
  AcquisitionModel,
  (selection: FingerprintSelection) => unknown
>();

/** Public semantics only. Opaque storage keys never enter this projection. */
export function publicAcquisitionFingerprint(
  model: AcquisitionModel,
  selection: FingerprintSelection,
): unknown {
  let project = projectors.get(model);
  if (!project) {
    project = createProjector(model);
    projectors.set(model, project);
  }
  return project(selection);
}

function createProjector(
  model: AcquisitionModel,
): (selection: FingerprintSelection) => unknown {
  const compare = createSemanticComparator();
  function sorted<T>(values: readonly T[]): T[] {
    return [...values].sort(compare);
  }
  const objectiveOrdinals = new Map<string, number>();
  const objectivePositions = new Map<string, number>();
  for (const row of [...(model.rows.facts.quest_objectives ?? [])].sort(
    (a, b) => Number(a.ordinal) - Number(b.ordinal),
  )) {
    const questId = String(row.quest_id),
      position = objectivePositions.get(questId) ?? 0;
    objectiveOrdinals.set(row.id, position);
    objectivePositions.set(questId, position + 1);
  }
  const methodValues = new Map<MethodView, unknown>();
  const poolValues = new Map<string, unknown>();
  const poolsById = new Map(model.rows.pools.map((row) => [row.id, row]));
  const methodPoolsByMethod = new Map<string, DataRow[]>();
  for (const binding of model.rows.methodPools) {
    const bindings = methodPoolsByMethod.get(String(binding.method_id)) ?? [];
    bindings.push(binding);
    methodPoolsByMethod.set(String(binding.method_id), bindings);
  }
  const chestRulesByPool = new Map(
    (model.rows.facts.loot_chest_rules ?? []).map((row) => [
      String(row.pool_id),
      row,
    ]),
  );
  const fishingBindingsByMethod = new Map(
    (model.rows.facts.acquisition_method_fishing_rules ?? []).map((row) => [
      String(row.method_id),
      row,
    ]),
  );
  const fishingRulesById = new Map(
    (model.rows.facts.loot_fishing_rules ?? []).map((row) => [row.id, row]),
  );
  function expression(e: RequirementExpression): unknown {
    if (e.kind !== "predicate")
      return { kind: e.kind, operands: sorted(e.operands.map(expression)) };
    const p = e.predicate;
    if (p.kind === "quest_progress") {
      const { objectiveId, ...publicPredicate } = p;
      return {
        ...publicPredicate,
        quest: identity("quests", p.questId),
        objectiveOrdinal:
          objectiveOrdinals.get(objectiveId) ??
          dataError(p.questId, "missing objective ordinal"),
      };
    }
    const target =
      p.kind === "item_count" ||
      p.kind === "party_key" ||
      p.kind === "instance_eligible"
        ? identity("items", p.itemId)
        : p.kind === "identity_is"
          ? identity(
              p.identityKind === "class" ? "classes" : "race_progression",
              p.id,
            )
          : p.kind === "skill_base_rank" || p.kind === "skill_tier_choice"
            ? identity("skills", p.skillId)
            : p.kind === "quest_state" || p.kind === "quest_cycle"
              ? identity("quests", p.questId)
              : p.kind === "recipe_known"
                ? identity("items", p.resultItemId)
                : p.kind === "faction_at_least"
                  ? identity("factions", p.factionId)
                  : p.kind === "altar_tier"
                    ? identity("altars", p.altarId)
                    : p.kind === "home_station"
                      ? identity("items", p.structureItemId)
                      : null;
    return { predicate: p, target };
  }
  function requirement(root: RequirementRoot): unknown {
    return {
      phase: root.phase,
      subject: root.subject,
      enforcement: root.enforcement,
      expression: expression(root.expression),
    };
  }
  function geometry(location: DirectLocation): unknown {
    return {
      provider: location.provider,
      name: location.name,
      zoneId: location.zoneId,
      subZoneId: location.subZoneId,
      zone: location.zoneId ? identity("zones", location.zoneId) : null,
      subZone: location.subZoneId
        ? identity("zone_triggers", location.subZoneId)
        : null,
      position: location.position,
      geometryVisibility: location.geometryVisibility,
      purpose: location.purpose,
      approximate: location.approximate,
    };
  }
  function pool(
    poolId: string,
    path: ReadonlySet<string> = new Set(),
  ): unknown {
    if (path.has(poolId)) dataError(poolId, "cyclic fingerprint pool");
    if (poolValues.has(poolId)) return poolValues.get(poolId);
    const definition = poolsById.get(poolId);
    if (!definition) dataError(poolId, "missing fingerprint pool");
    const next = new Set(path);
    next.add(poolId);
    const groups = new Map<number, number>();
    const entries = (model.entriesByPool.get(poolId) ?? []).map((entry) => {
      if (!groups.has(entry.duplicate_group))
        groups.set(entry.duplicate_group, groups.size);
      return {
        itemId: entry.item_id,
        item: entry.item_id ? identity("items", entry.item_id) : null,
        withheld: entry.withheld,
        resolution: entry.resolution,
        child: entry.child_pool_id ? pool(entry.child_pool_id, next) : null,
        probability: entry.probability,
        duplicateGroup: groups.get(entry.duplicate_group),
        cap: entry.cap,
        countsEquipment: entry.counts_equipment,
        guaranteedEquipmentCandidate: entry.guaranteed_equipment_candidate,
        questGate: entry.quest_gate,
        scalesWithTreasureHunter: entry.scales_with_treasure_hunter,
        quality: entry.quality,
      };
    });
    const chest = chestRulesByPool.get(poolId);
    const value = {
      kind: definition.kind,
      entries,
      numItems: chest?.num_items ?? null,
    };
    freeze(value);
    poolValues.set(poolId, value);
    return value;
  }
  const DETAIL_FIELDS = [
    "monster_id",
    "loot_zone_number",
    "loot_zone_id",
    "loot_zone_withheld",
    "respawn",
    "exp_multiplier",
    "is_boss",
    "is_elite",
    "is_hunt",
    "is_summoned_pet",
    "altar_id",
    "wave_number",
    "parent_monster_spawn_id",
    "event_kind",
    "gold_min",
    "gold_max",
    "gold_probability",
    "npc_id",
    "offered_item_id",
    "season",
    "quest_id",
    "phase",
    "crafting_recipe_id",
    "alchemy_recipe_id",
    "scribing_recipe_id",
    "declared_result_item_id",
    "result_amount",
    "tier",
    "display_kind",
    "experience",
    "resource_id",
    "resource_kind",
    "outer_success",
    "chest_id",
    "key_item_id",
    "key_item_withheld",
    "item_id",
    "treasure_location_id",
    "map_item_id",
    "map_item_withheld",
    "service_role",
    "class_id",
    "structure_item_id",
    "reward_item_id",
  ] as const;
  function method(view: MethodView): unknown {
    if (methodValues.has(view)) return methodValues.get(view);
    const detail: Record<string, unknown> = {};
    for (const field of DETAIL_FIELDS)
      if (Object.hasOwn(view.detail, field)) detail[field] = view.detail[field];
    if (
      view.detail.wave_member_index !== null &&
      view.detail.wave_member_index !== undefined
    ) {
      const altar = model.entities
        .get("altars")
        ?.get(String(view.detail.altar_id));
      if (typeof altar?.waves === "string") {
        let waves: unknown;
        try {
          waves = JSON.parse(altar.waves);
        } catch {
          dataError(altar.id, "invalid public wave definitions");
        }
        if (Array.isArray(waves)) {
          const wave: unknown = waves[Number(view.detail.wave_number)];
          if (
            wave &&
            typeof wave === "object" &&
            "monsters" in wave &&
            Array.isArray(wave.monsters)
          ) {
            const member: unknown =
              wave.monsters[Number(view.detail.wave_member_index)];
            if (member && typeof member === "object" && "base_level" in member)
              detail.waveMemberBaseLevel = member.base_level;
          }
        }
      }
    }
    const bindings = methodPoolsByMethod.get(view.methodId) ?? [];
    const methodPools = [...bindings]
      .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
      .map((row) => ({ event: row.event, pool: pool(String(row.pool_id)) }));
    if (
      typeof view.detail.loot_pool_id === "string" &&
      !bindings.some((row) => row.pool_id === view.detail.loot_pool_id)
    )
      methodPools.push({
        event: "corpse_generation",
        pool: pool(view.detail.loot_pool_id),
      });
    const fishingBinding = fishingBindingsByMethod.get(view.methodId);
    const fishing = fishingRulesById.get(
      String(fishingBinding?.fishing_rule_id),
    );
    const definitionKinds: Record<string, string> = {
      monster_id: "monsters",
      npc_id: "npcs",
      offered_item_id: "items",
      quest_id: "quests",
      declared_result_item_id: "items",
      resource_id: "gathering_resources",
      chest_id: "chests",
      item_id: "items",
      treasure_location_id: "treasure_locations",
      map_item_id: "items",
      key_item_id: "items",
      class_id: "classes",
      structure_item_id: "items",
      reward_item_id: "items",
      altar_id: "altars",
      loot_zone_id: "zones",
      parent_monster_spawn_id: "monster_spawns",
    };
    const definitions = Object.entries(definitionKinds)
      .filter(([field]) => typeof view.detail[field] === "string")
      .map(([field, kind]) => ({
        field,
        entity: identity(kind, String(view.detail[field])),
      }));
    const ruleInputs =
      view.kind === "cap_xp"
        ? CODE_DEFINED_RULES.capXp
        : view.kind === "creation"
          ? {
              starterEquipmentDurability:
                CODE_DEFINED_RULES.creation.durability,
            }
          : view.kind === "blessing"
            ? CODE_DEFINED_RULES.blessing
            : view.kind === "world_chest"
              ? CODE_DEFINED_RULES.worldChest
              : view.ruleId === "altar_final_loot"
                ? CODE_DEFINED_RULES.altar
                : null;
    const value = {
      kind: view.kind,
      ruleId: view.ruleId,
      phase: view.phase,
      detail,
      definitions,
      ruleInputs,
      rooted: view.rooted,
      sourceLevelHint: view.sourceLevelHint,
      setupMethod: view.setupMethod ? method(view.setupMethod) : null,
      providers: sorted(
        view.providers.map((provider) => ({
          ref: provider.ref,
          name: provider.name,
          location: provider.location ? geometry(provider.location) : null,
          requirements: provider.requirements.map(requirement),
        })),
      ),
      homeProviders: sorted(
        view.homeProviders.map((row) => ({
          structure: identity("items", String(row.structure_item_id)),
          structureItemId: row.structure_item_id,
          componentPath: row.component_path,
          requirements: row.requirements.map(requirement),
        })),
      ),
      outputs: view.outputs.map((output) => ({
        resourceKind: output.resource_kind,
        itemId: output.item_id,
        item: output.item_id ? identity("items", output.item_id) : null,
        amountMin: output.amount_min,
        amountMax: output.amount_max,
        yieldRule: output.yield_rule,
        delivery: output.delivery,
        slot: output.slot,
        withheld: output.withheld,
        quantity: output.quantity,
        requirements: output.requirements.map(requirement),
      })),
      costGroups: sorted(
        view.costGroups.map((group) => ({
          phase: group.phase,
          quantityRule: group.quantity_rule,
          consumptionRule: group.consumption_rule,
          selectionRule: group.selection_rule,
          inputs: group.inputs.map((input) => ({
            resourceKind: input.resource_kind,
            itemId: input.item_id,
            item: input.item_id ? identity("items", input.item_id) : null,
            amount: input.amount,
            withheld: input.withheld,
            role: input.role,
          })),
        })),
      ),
      requirements: view.requirements.map(requirement),
      effects: sorted(
        view.effects.map((effect) => ({
          event: effect.event,
          faction:
            typeof effect.faction_id === "string"
              ? identity("factions", effect.faction_id)
              : null,
          withheld: effect.withheld,
          delta: effect.delta,
        })),
      ),
      repeatability: view.repeatability,
      pools: methodPools,
      probabilityFactors: view.probabilityFactors,
      fishing: fishing
        ? {
            spotTier: fishing.spot_tier,
            primary: pool(String(fishing.primary_pool_id)),
            trash: pool(String(fishing.trash_pool_id)),
            fallback: pool(String(fishing.fallback_pool_id)),
          }
        : null,
      probabilityResults: sorted(
        view.probabilityResults.map((result) => ({
          target: result.target,
          event: result.event,
          quantityMeaning: result.quantityMeaning,
          probability: result.probability,
          expectedQuantity: result.expectedQuantity,
          assumptions: result.assumptions,
        })),
      ),
    };
    freeze(value);
    methodValues.set(view, value);
    return value;
  }
  const identities = new Map<string, unknown>();
  function identity(table: string, id: string): unknown {
    const key = `${table}:${id}`;
    if (identities.has(key)) return identities.get(key);
    const row = model.entities.get(table)?.get(id);
    if (!row) {
      const missing = freeze({ id, missing: true });
      identities.set(key, missing);
      return missing;
    }
    const result: Record<string, unknown> = {
      id: row.id,
      name: row.name ?? null,
    };
    for (const field of [
      "quality",
      "item_type",
      "slot",
      "weapon_category",
      "icon_path",
    ])
      if (Object.hasOwn(row, field)) result[field] = row[field];
    freeze(result);
    identities.set(key, result);
    return result;
  }
  function inspection(itemId: string): unknown {
    const inspected = projectDefinitionInspection(model, itemId);
    const outcomes = (values: typeof inspected.randomOutcomes) =>
      values.map((value) => ({
        itemId: value.itemId,
        item: value.itemId ? identity("items", value.itemId) : null,
        withheld: value.withheld,
        amount: value.amount,
        probability: value.probability,
      }));
    return {
      offeredAssets: sorted(inspected.offeredAssets.map(method)),
      initiatingMemberships: sorted(
        inspected.initiatingMemberships.map(method),
      ),
      fixedContents: outcomes(inspected.fixedContents),
      randomOutcomes: outcomes(inspected.randomOutcomes),
      portableChestOutcomes: outcomes(inspected.portableChestOutcomes),
      parentAwards: sorted(inspected.parentAwards.map(method)),
      definitionPools: sorted(
        (model.rows.facts.item_pool_definitions ?? [])
          .filter((row) => row.item_id === itemId)
          .map((row) => ({ role: row.role, pool: pool(String(row.pool_id)) })),
      ),
      offerLocations: sorted(inspected.offerLocations.map(geometry)),
    };
  }
  const selections = new Map<string, unknown>();
  function project(selection: FingerprintSelection): unknown {
    const key = JSON.stringify(selection);
    if (selections.has(key)) return selections.get(key);
    // Provider and requirement references are caller-owned mutable inputs.
    const copied = structuredClone(selection);
    const members =
      copied.kind === "items"
        ? [...new Set(copied.itemIds)]
        : copied.kind === "monsters"
          ? [...new Set(copied.monsterIds)]
          : copied.kind === "recipes"
            ? [...new Set(copied.recipeIds)]
            : copied.kind === "providers"
              ? copied.providers
              : copied.kind === "requirements"
                ? copied.entities
                : dataError("fingerprint", "unsupported selection");
    const field = copied.kind === "requirements" ? "entities" : copied.kind;
    const value = freeze(
      members.length > 1
        ? {
            kind: copied.kind,
            [field]: sorted(
              members.map((member) => {
                const single =
                  copied.kind === "items"
                    ? { kind: "items" as const, itemIds: [member as string] }
                    : copied.kind === "monsters"
                      ? {
                          kind: "monsters" as const,
                          monsterIds: [member as string],
                        }
                      : copied.kind === "recipes"
                        ? {
                            kind: "recipes" as const,
                            recipeIds: [member as string],
                          }
                        : copied.kind === "providers"
                          ? {
                              kind: "providers" as const,
                              providers: [
                                member as (typeof copied.providers)[number],
                              ],
                            }
                          : {
                              kind: "requirements" as const,
                              entities: [
                                member as (typeof copied.entities)[number],
                              ],
                            };
                // The singleton projection uses the same discriminant and array field.
                const projected = project(single) as Record<string, unknown[]>;
                return projected[field][0];
              }),
            ),
          }
        : select(copied),
    );
    selections.set(key, value);
    return value;
  }
  function select(selection: FingerprintSelection): unknown {
    switch (selection.kind) {
      case "items":
        return {
          kind: "items",
          items: sorted(
            [...new Set(selection.itemIds)].map((itemId) => {
              const source = projectItemSources(model, itemId);
              return {
                identity: identity("items", itemId),
                methods: sorted(source.methods.map(method)),
                hasKnownSource: source.hasKnownSource,
                sourceLevelHint: source.sourceLevelHint,
                inspection: inspection(itemId),
                requirements: (
                  model.requirements.get(`item:${itemId}`) ?? []
                ).map(requirement),
                uses: sorted(
                  projectItemUsages(model, itemId).map((use) => ({
                    kind: use.kind,
                    method: use.method ? method(use.method) : null,
                    phase: use.phase,
                    role: use.role,
                    amount: use.amount,
                    consumed: use.consumed,
                    requirements: use.requirements.map(requirement),
                    useLocations: sorted(use.useLocations.map(geometry)),
                    entity: use.entity,
                    compatibility: use.compatibility ?? null,
                  })),
                ),
              };
            }),
          ),
        };
      case "monsters":
        return {
          kind: "monsters",
          monsters: sorted(
            [...new Set(selection.monsterIds)].map((id) => {
              const loot = projectMonsterLoot(model, id);
              return {
                identity: identity("monsters", id),
                definitionPool: loot.definitionPool
                  ? pool(loot.definitionPool.pool.id)
                  : null,
                contexts: sorted(loot.contexts.map(method)),
              };
            }),
          ),
        };
      case "providers":
        return {
          kind: "providers",
          providers: sorted(
            selection.providers.map((provider) => ({
              provider,
              identity: identity(
                provider.kind === "resource_spawns"
                  ? "gathering_resource_spawns"
                  : provider.kind,
                provider.id,
              ),
              methods: sorted(
                projectProviderMethods(model, provider).map(method),
              ),
              skills:
                provider.kind === "npcs"
                  ? (model.rows.facts.npc_skills ?? [])
                      .filter((row) => row.npc_id === provider.id)
                      .sort(
                        (a, b) => Number(a.skill_index) - Number(b.skill_index),
                      )
                      .map((row) => identity("skills", String(row.skill_id)))
                  : [],
            })),
          ),
        };
      case "recipes":
        return {
          kind: "recipes",
          recipes: sorted(
            [...new Set(selection.recipeIds)].map((id) => {
              const variants = [...model.methodViews.values()].filter(
                (view) =>
                  view.kind === "recipe" &&
                  [
                    view.detail.crafting_recipe_id,
                    view.detail.alchemy_recipe_id,
                    view.detail.scribing_recipe_id,
                  ].includes(id),
              );
              const resultIds = [
                ...new Set(
                  variants.map((view) =>
                    String(view.detail.declared_result_item_id),
                  ),
                ),
              ];
              return {
                id,
                variants: sorted(variants.map(method)),
                teachers: sorted(
                  resultIds.map((resultItemId) => ({
                    resultItemId,
                    items: projectRecipeTeachers(model, resultItemId),
                  })),
                ),
              };
            }),
          ),
        };
      case "requirements":
        return {
          kind: "requirements",
          entities: sorted(
            selection.entities.map((entity) => {
              const table = {
                item: "items",
                skill: "skills",
                quest: "quests",
                portal: "portals",
                resource: "gathering_resources",
                summon_trigger: "summon_triggers",
              }[entity.kind];
              const row = model.entities.get(table)?.get(entity.id);
              const curve = (value: unknown): unknown => {
                if (typeof value !== "string") return value ?? null;
                try {
                  return JSON.parse(value);
                } catch {
                  return dataError(entity.id, "invalid fingerprint curve");
                }
              };
              const methods =
                entity.kind === "quest"
                  ? [...model.methodViews.values()].filter(
                      (view) => view.detail.quest_id === entity.id,
                    )
                  : entity.kind === "resource"
                    ? [...model.methodViews.values()].filter(
                        (view) => view.detail.resource_id === entity.id,
                      )
                    : [];
              const classMembership =
                entity.kind === "skill" && row
                  ? curve(row.player_classes)
                  : null;
              if (classMembership !== null && !Array.isArray(classMembership))
                dataError(entity.id, "invalid player class membership");
              const playerClasses = Array.isArray(classMembership)
                ? classMembership
                    .map((value) => {
                      if (typeof value !== "string")
                        return dataError(
                          entity.id,
                          "invalid player class membership",
                        );
                      return value;
                    })
                    .sort()
                : [];
              return {
                entity,
                identity: identity(table, entity.id),
                roots: (
                  model.requirements.get(`${entity.kind}:${entity.id}`) ?? []
                ).map(requirement),
                methods: sorted(methods.map(method)),
                skillDefinition:
                  entity.kind === "skill" && row
                    ? {
                        maxRank: row.max_level,
                        initialRank: row.learn_default ? 1 : 0,
                        tier: row.tier,
                        isVeteran: row.is_veteran,
                        playerClasses,
                      }
                    : null,
                learning:
                  entity.kind === "skill" &&
                  row &&
                  model.requirements.has(`skill:${entity.id}`)
                    ? {
                        levelRequirement: curve(row.level_requirement),
                        skillPointCost: curve(row.skill_point_cost),
                        maxRank: row.max_level,
                        tier: row.tier,
                        learnDefault: row.learn_default,
                        isVeteran: row.is_veteran,
                        requiredSpentPoints: row.required_spent_points,
                        predecessors: (
                          model.rows.facts.skill_predecessors ?? []
                        )
                          .filter(
                            (predecessor) => predecessor.skill_id === entity.id,
                          )
                          .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
                          .map((predecessor) => ({
                            skillId: predecessor.predecessor_skill_id,
                            rank: predecessor.rank,
                            withheld: predecessor.withheld,
                          })),
                      }
                    : null,
                npcCasters:
                  entity.kind === "skill"
                    ? sorted(
                        [
                          ...new Set(
                            (model.rows.facts.npc_skills ?? [])
                              .filter((row) => row.skill_id === entity.id)
                              .map((row) => String(row.npc_id)),
                          ),
                        ].map((id) => identity("npcs", id)),
                      )
                    : [],
              };
            }),
          ),
        };
      default:
        return dataError("fingerprint", "unsupported selection");
    }
  }
  return project;
}
