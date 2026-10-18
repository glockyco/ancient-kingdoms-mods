export type SqlValue = string | number | null;
export type AcquisitionQuery = (
  sql: string,
  params: readonly SqlValue[],
) => Promise<readonly Record<string, unknown>[]>;
export const METHOD_KINDS = [
  "kill",
  "vendor",
  "quest_accept",
  "quest_complete",
  "altar_activate",
  "recipe",
  "gather",
  "world_chest",
  "portable_chest",
  "pack_use",
  "merge",
  "fragment",
  "treasure_dig",
  "blessing",
  "essence",
  "creation",
  "housing",
  "cap_xp",
] as const;
export type MethodKind = (typeof METHOD_KINDS)[number];
export const PROVIDER_TABLES = {
  monster_spawns: "monster_spawn_id",
  npcs: "npc_id",
  altars: "altar_id",
  resource_spawns: "resource_spawn_id",
  chests: "chest_id",
  crafting_stations: "crafting_station_id",
  alchemy_tables: "alchemy_table_id",
  scribing_tables: "scribing_table_id",
  items: "item_id",
  classes: "class_id",
  treasure_locations: "treasure_location_id",
} as const;
export type ProviderDomain = keyof typeof PROVIDER_TABLES;
export type ProviderRef = {
  [K in ProviderDomain]: { kind: K; id: string };
}[ProviderDomain];
export type LocationRef = ProviderRef | { kind: "portals"; id: string };
export type RequirementEntityRef = {
  kind: "item" | "skill" | "quest" | "portal" | "resource" | "summon_trigger";
  id: string;
};
export type AcquisitionRequest =
  | { kind: "items"; itemIds: readonly string[] }
  | { kind: "monsters"; monsterIds: readonly string[] }
  | { kind: "providers"; providers: readonly ProviderRef[] }
  | { kind: "recipes"; recipeIds: readonly string[] }
  | { kind: "requirements"; entities: readonly RequirementEntityRef[] };
export type DataRow = Readonly<Record<string, unknown> & { id: string }>;
export interface MethodRow {
  readonly id: string;
  readonly kind: MethodKind;
  readonly rule_id: string;
  readonly setup_method_id: string | null;
  readonly rooted: number;
  readonly source_level_hint: number | null;
}
export type Delivery =
  | "inventory"
  | "keyring"
  | "equipment"
  | "corpse"
  | "placed_structure"
  | "quest_progress";
export interface OutputRow {
  readonly id: string;
  readonly method_id: string;
  readonly ordinal: number;
  readonly resource_kind: "item" | "gold";
  readonly item_id: string | null;
  readonly amount_min: number | null;
  readonly amount_max: number | null;
  readonly yield_rule:
    | "fixed"
    | "uniform_inclusive"
    | "uniform_upper_exclusive"
    | "all_carried"
    | "extra_gather"
    | "radiant"
    | "pool";
  readonly delivery: Delivery;
  readonly slot: number | null;
  readonly condition_slot: number | null;
  readonly withheld: number;
}
export interface InputRow {
  readonly id: string;
  readonly cost_group_id: string;
  readonly ordinal: number;
  readonly resource_kind: "item" | "gold";
  readonly item_id: string | null;
  readonly amount: number;
  readonly withheld: number;
  readonly role:
    | "material"
    | "currency"
    | "activation"
    | "key"
    | "lockpick"
    | "component"
    | "fragment"
    | "selected_instance"
    | "quest_primary"
    | "quest_secondary";
}
export interface CostGroupRow {
  readonly id: string;
  readonly method_id: string;
  readonly phase:
    | "activate"
    | "purchase"
    | "accept"
    | "complete"
    | "attempt"
    | "use"
    | "exchange";
  readonly quantity_rule: "fixed" | "all_carried" | "quest_completion";
  readonly consumption_rule:
    | "on_success"
    | "before_roll"
    | "after_outer_success"
    | "quest_inventory_then_equipped"
    | "replace_carried_stack";
  readonly selection_rule:
    "always" | "chest_key_first" | "chest_lockpick_fallback";
}
export interface PoolEntry {
  readonly id: string;
  readonly pool_id: string;
  readonly ordinal: number;
  readonly item_id: string | null;
  readonly child_pool_id: string | null;
  readonly resolution: "direct" | "uniform_child";
  readonly probability: number;
  readonly duplicate_group: number;
  readonly cap: number | null;
  readonly counts_equipment: number;
  readonly guaranteed_equipment_candidate: number;
  readonly quest_gate: "none" | "public_need" | "withheld_need";
  readonly scales_with_treasure_hunter: number;
  readonly quality: number | null;
  readonly withheld: number;
}
export interface KillDetailRow extends DataRow {
  readonly monster_id: string;
  readonly loot_pool_id: string;
  readonly loot_zone_number: number | null;
  readonly loot_zone_id: string | null;
  readonly loot_zone_withheld: number;
  readonly respawn: number;
  readonly exp_multiplier: number;
  readonly is_boss: number;
  readonly is_elite: number;
  readonly is_hunt: number;
  readonly is_summoned_pet: number;
  readonly altar_id: string | null;
  readonly wave_number: number | null;
  readonly wave_member_index: number | null;
  readonly parent_monster_spawn_id: string | null;
  readonly event_kind: "authored" | "altar_final" | "placeholder" | "lootless";
  readonly gold_min: number;
  readonly gold_max: number;
  readonly gold_probability: number;
}
export interface VendorDetailRow extends DataRow {
  readonly npc_id: string;
  readonly offered_item_id: string;
  readonly season: "none" | "halloween" | "christmas";
}
export interface QuestDetailRow extends DataRow {
  readonly quest_id: string;
  readonly phase: "accept" | "complete";
}
export interface RecipeDetailRow extends DataRow {
  readonly crafting_recipe_id: string | null;
  readonly alchemy_recipe_id: string | null;
  readonly scribing_recipe_id: string | null;
  readonly declared_result_item_id: string;
  readonly result_amount: number;
  readonly tier: number;
  readonly display_kind: "crafting" | "cooking" | "alchemy" | "scribing";
  readonly experience: number | null;
}
export interface ResourceDetailRow extends DataRow {
  readonly resource_id: string;
  readonly resource_kind: "plant" | "mineral" | "fishing" | "radiant" | "other";
  readonly outer_success: number;
  readonly gold_min: number;
  readonly gold_max: number;
}
export interface WorldChestDetailRow extends DataRow {
  readonly chest_id: string;
  readonly key_item_id: string | null;
  readonly key_item_withheld: number;
  readonly outer_success: number;
  readonly gold_min: number;
  readonly gold_max: number;
}
export interface ItemDetailRow extends DataRow {
  readonly item_id: string;
}
export interface TreasureDetailRow extends DataRow {
  readonly treasure_location_id: string;
  readonly map_item_id: string | null;
  readonly map_item_withheld: number;
}
export interface ServiceDetailRow extends DataRow {
  readonly service_role: "blessing" | "essence";
}
export interface CreationDetailRow extends DataRow {
  readonly class_id: string;
}
export interface HousingDetailRow extends DataRow {
  readonly structure_item_id: string;
}
export interface CapXpDetailRow extends DataRow {
  readonly reward_item_id: string;
}
export interface AltarDetailRow extends DataRow {
  readonly altar_id: string;
}
export interface DetailRowMap {
  readonly kill: KillDetailRow;
  readonly vendor: VendorDetailRow;
  readonly quest: QuestDetailRow;
  readonly recipe: RecipeDetailRow;
  readonly resource: ResourceDetailRow;
  readonly world_chest: WorldChestDetailRow;
  readonly item: ItemDetailRow;
  readonly treasure: TreasureDetailRow;
  readonly service: ServiceDetailRow;
  readonly creation: CreationDetailRow;
  readonly housing: HousingDetailRow;
  readonly cap_xp: CapXpDetailRow;
  readonly altar: AltarDetailRow;
}
export type AcquisitionDetails = Readonly<{
  [K in keyof DetailRowMap]: readonly DetailRowMap[K][];
}>;
export type ProviderMembership<K extends ProviderDomain> = DataRow & {
  readonly method_id: string;
  readonly offer_index: number | null;
} & Readonly<Record<(typeof PROVIDER_TABLES)[K], string>>;
export type AcquisitionProviders = Readonly<{
  [K in ProviderDomain]: readonly ProviderMembership<K>[];
}>;
export interface HomeProviderRow extends DataRow {
  readonly method_id: string;
  readonly structure_item_id: string;
  readonly component_path: string;
  readonly offer_index: number | null;
}
export interface AcquisitionRows {
  readonly methods: readonly MethodRow[];
  readonly costGroups: readonly CostGroupRow[];
  readonly inputs: readonly InputRow[];
  readonly outputs: readonly OutputRow[];
  readonly effects: readonly DataRow[];
  readonly methodPools: readonly DataRow[];
  readonly pools: readonly DataRow[];
  readonly poolEntries: readonly PoolEntry[];
  readonly details: AcquisitionDetails;
  readonly providers: AcquisitionProviders;
  readonly homeProviders: readonly HomeProviderRow[];
  readonly entities: Readonly<Record<string, readonly DataRow[]>>;
  readonly facts: Readonly<Record<string, readonly DataRow[]>>;
  readonly request: AcquisitionRequest;
}
export type Phase =
  | "offer"
  | "purchase"
  | "accept"
  | "fulfill"
  | "complete"
  | "activate"
  | "attempt"
  | "exchange"
  | "learn"
  | "equip"
  | "use"
  | "cast"
  | "enter"
  | "loot";
export type Subject =
  | "player"
  | "wearer"
  | "selected_instance"
  | "permitted_party"
  | "current_world";
export type Metric =
  | "level"
  | "total_veteran_points"
  | "available_skill_points"
  | "available_veteran_points"
  | "spent_skill_points"
  | "spent_veteran_points"
  | "equipped_item_level"
  | "adventuring_fraction";
export type ItemLocation =
  | "inventory"
  | "base_inventory"
  | "equipment"
  | "keyring"
  | "bank"
  | "house"
  | "mercenary";
export type Profession =
  "alchemy" | "cooking" | "herbalism" | "mining" | "fishing";
export type PredicatePayload =
  | { kind: "metric_at_least"; metric: Metric; amount: number; unit: string }
  | { kind: "identity_is"; identityKind: "class" | "race"; id: string }
  | {
      kind: "item_count";
      itemId: string;
      location: ItemLocation;
      amount: number;
    }
  | { kind: "faction_at_least"; factionId: string; standing: number }
  | {
      kind: "quest_state";
      questId: string;
      state: "active" | "completed" | "not_active" | "not_completed";
    }
  | {
      kind: "quest_progress";
      questId: string;
      objectiveId: string;
      counterKind: "kill" | "gather" | "brew" | "location";
      amount: number;
    }
  | { kind: "recipe_known"; resultItemId: string }
  | { kind: "skill_base_rank"; skillId: string; rank: number }
  | {
      kind: "skill_tier_choice";
      skillId: string;
      tier: number;
      defaultRank: number;
    }
  | { kind: "profession_floor"; profession: Profession; tier: number }
  | {
      kind: "usable_tool";
      category: "Pickaxe" | "Fishing Rod" | "Shovel";
      requiresDurability: boolean;
    }
  | { kind: "party_key"; itemId: string; onlineOnly: true }
  | { kind: "current_monster_dead"; monsterSpawnId: string }
  | { kind: "event_ready"; triggerId: string }
  | {
      kind: "quest_cycle";
      questId: string;
      cycle: "repeat_8h" | "daily_24h" | "currently_offered";
    }
  | {
      kind: "game_clock_window";
      startHour: number;
      endHour: number;
      includeStart: boolean;
      includeEnd: boolean;
    }
  | {
      kind: "altar_tier";
      altarId: string;
      tier: 0 | 1 | 2 | 3;
      minimumScore: number;
      maximumScore: number | null;
    }
  | { kind: "house_owned" }
  | { kind: "home_station"; structureItemId: string; componentPath: string }
  | {
      kind: "instance_eligible";
      itemId: string;
      rule: "essence_ui" | "essence_server";
    }
  | { kind: "withheld"; reason: "unpublished_target" };
export type RequirementPredicate = PredicatePayload & { subject: Subject };
export type RequirementExpression =
  | { kind: "all" | "any"; operands: readonly RequirementExpression[] }
  | { kind: "predicate"; predicate: RequirementPredicate };
export interface RequirementRoot {
  readonly phase: Phase;
  readonly subject: Subject;
  readonly enforcement: "normal_ui" | "server" | "both";
  readonly expression: RequirementExpression;
}
export type Known<T> =
  | { readonly known: false }
  | {
      readonly known: true;
      readonly value: T;
      readonly provenance: "entered" | "imported" | "derived";
    };
export interface FactCollection<T> {
  readonly entries: readonly T[];
  readonly complete: boolean;
}
export interface SubjectFacts {
  readonly metrics?: Partial<Record<Metric, Known<number>>>;
  readonly identities?: Partial<Record<"class" | "race", Known<string>>>;
  readonly items?: Partial<
    Record<ItemLocation, FactCollection<{ itemId: string; amount: number }>>
  >;
  readonly factions?: FactCollection<{ factionId: string; standing: number }>;
  readonly quests?: FactCollection<{
    questId: string;
    active: boolean;
    completed: boolean;
    completedAt?: string;
  }>;
  readonly questProgress?: FactCollection<{
    questId: string;
    objectiveId: string;
    amount: number;
  }>;
  readonly recipes?: FactCollection<string>;
  readonly skills?: FactCollection<{
    skillId: string;
    baseRank: number;
    tier: number;
    defaultRank: number;
  }>;
  readonly professions?: Partial<Record<Profession, Known<number>>>;
  readonly tools?: FactCollection<{
    category: string;
    quality: number;
    durability: number;
  }>;
  readonly houseOwned?: Known<boolean>;
  readonly homeStations?: FactCollection<{
    structureItemId: string;
    componentPath: string;
  }>;
  readonly instances?: FactCollection<{
    itemId: string;
    definitionEligible: boolean;
    durability: number;
  }>;
}
export interface RequirementFacts {
  readonly subjects?: Partial<Record<Subject, SubjectFacts>>;
  readonly party?: FactCollection<{
    online: boolean;
    items: FactCollection<{ itemId: string; amount: number }>;
  }>;
  readonly world?: {
    readonly instanceToken: string;
    readonly monsters?: FactCollection<{
      monsterSpawnId: string;
      instanceToken: string;
      dead: boolean;
    }>;
    readonly events?: FactCollection<{
      triggerId: string;
      instanceToken: string;
      ready: boolean;
    }>;
  };
  readonly gameHour?: Known<number>;
  readonly nowUtc?: Known<string>;
  readonly offeredQuests?: FactCollection<string>;
}
export interface RequirementResult {
  readonly status: "met" | "unmet" | "unknown";
  readonly children: readonly RequirementResult[];
  readonly evidence: readonly string[];
}
export interface RequirementDescription {
  readonly phase: Phase;
  readonly subject: Subject;
  readonly enforcement: RequirementRoot["enforcement"];
  readonly text: string;
  readonly expression: RequirementExpression;
}
export type EvaluatedQuantity =
  | { kind: "exact"; value: number }
  | { kind: "range"; min: number; max: number | null }
  | { kind: "unknown" };
export type Repeatability =
  | { kind: "repeatable" }
  | { kind: "once_per_character" }
  | {
      kind: "state_dependent";
      basis: "quest_cycle" | "world_state" | "event_reset" | "xp_cycle";
    };
export type ProbabilityTarget =
  | { kind: "item"; itemId: string; delivery: Delivery }
  | { kind: "gold"; delivery: "inventory" | "corpse" };
export interface ProbabilityAssumptions {
  readonly scenario: "baseline" | "entered";
  readonly questNeed: "none" | "unknown" | "specified";
  readonly fatecharm: boolean;
  readonly treasureHunter: number;
  readonly professionFraction: number | null;
  readonly toolQuality: number | null;
  readonly costumePieces: number;
  readonly huntingFraction?: number;
  readonly extraGatherChance?: number;
  readonly altarTier?: 0 | 1 | 2 | 3 | null;
  readonly activatorLevel?: number | null;
  readonly totalVeteranPoints?: number | null;
  readonly chestAccess?: "key" | "lockpick" | "unknown";
}
export interface ProbabilityResult {
  readonly methodId: string;
  readonly outcomeKey: string;
  readonly target: ProbabilityTarget;
  readonly event:
    | "corpse_generation"
    | "eligible_kill"
    | "successful_hook"
    | "cast"
    | "attempt"
    | "successful_opening"
    | "opening"
    | "parent_award";
  readonly quantityMeaning:
    "at_least_one" | "expected_units" | "fixed_units" | "range";
  readonly probability: number | null;
  readonly expectedQuantity: number | null;
  readonly assumptions: ProbabilityAssumptions;
}
export interface DirectLocation {
  readonly provider: LocationRef;
  readonly name: string;
  readonly zoneId: string | null;
  readonly subZoneId: string | null;
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  } | null;
  readonly geometryVisibility: "visible" | "suppressed" | "unavailable";
  readonly purpose: "award" | "offer" | "use";
  readonly methodIds: readonly string[];
  readonly approximate: boolean;
}
export interface ProviderView {
  readonly ref: ProviderRef;
  readonly name: string;
  readonly offerIndex: number | null;
  readonly location: DirectLocation | null;
  readonly requirements: readonly RequirementRoot[];
}
export interface CostGroupView extends CostGroupRow {
  readonly inputs: readonly InputRow[];
}
export interface OutputView extends OutputRow {
  readonly quantity: EvaluatedQuantity;
  readonly requirements: readonly RequirementRoot[];
}
export interface HomeProviderView extends DataRow {
  readonly structure_item_id: string;
  readonly component_path: string;
  readonly offer_index: number | null;
  readonly requirements: readonly RequirementRoot[];
}
export type ProbabilityFactor =
  | "fatecharm"
  | "treasure_hunter"
  | "quest_need"
  | "hunting"
  | "profession"
  | "tool"
  | "costume"
  | "extra_gather"
  | "altar_tier"
  | "chest_access";
export interface MethodView {
  readonly methodId: string;
  readonly kind: MethodKind;
  readonly ruleId: string;
  readonly phase: Phase;
  readonly setupMethod: MethodView | null;
  readonly providers: readonly ProviderView[];
  readonly homeProviders: readonly HomeProviderView[];
  readonly outputs: readonly OutputView[];
  readonly costGroups: readonly CostGroupView[];
  readonly requirements: readonly RequirementRoot[];
  readonly effects: readonly DataRow[];
  readonly repeatability: Repeatability;
  readonly probabilityResults: readonly ProbabilityResult[];
  readonly probabilityFactors: readonly ProbabilityFactor[];
  readonly rooted: boolean;
  readonly sourceLevelHint: number | null;
  readonly detail: DataRow;
}
export interface InspectedOutcome {
  readonly itemId: string | null;
  readonly withheld: boolean;
  readonly amount: EvaluatedQuantity;
  readonly poolId: string | null;
  readonly ordinal: number;
  readonly probability: number | null;
}
export interface DefinitionInspection {
  readonly offeredAssets: readonly MethodView[];
  readonly initiatingMemberships: readonly MethodView[];
  readonly fixedContents: readonly InspectedOutcome[];
  readonly randomOutcomes: readonly InspectedOutcome[];
  readonly portableChestOutcomes: readonly InspectedOutcome[];
  readonly offerLocations: readonly DirectLocation[];
}
export interface ItemSourceView {
  readonly itemId: string;
  readonly methods: readonly MethodView[];
  readonly inspection: DefinitionInspection;
  readonly hasKnownSource: boolean;
  readonly sourceLevelHint: number | null;
}
export interface ItemUseView {
  readonly itemId: string;
  readonly kind: "cost" | "requirement" | "objective" | "initiator" | "augment";
  readonly method: MethodView | null;
  readonly phase: Phase;
  readonly role: string;
  readonly amount: EvaluatedQuantity;
  readonly consumed: boolean;
  readonly requirements: readonly RequirementRoot[];
  readonly useLocations: readonly DirectLocation[];
  readonly entity: RequirementEntityRef | null;
  readonly compatibility?: {
    readonly categoryRule: "in" | "not_in";
    readonly categories: readonly string[];
    readonly excludedItemTypes: readonly string[];
    readonly recoverable: boolean;
    readonly normalRecoveryGold: number;
  };
}
export interface MonsterLootView {
  readonly monsterId: string;
  readonly definitionPool: {
    readonly pool: DataRow;
    readonly entries: readonly PoolEntry[];
  } | null;
  readonly contexts: readonly MethodView[];
}
export interface AcquisitionModel {
  readonly rows: AcquisitionRows;
  readonly methods: ReadonlyMap<string, MethodRow>;
  readonly outputsByMethod: ReadonlyMap<string, readonly OutputRow[]>;
  readonly inputsByGroup: ReadonlyMap<string, readonly InputRow[]>;
  readonly costsByMethod: ReadonlyMap<string, readonly CostGroupRow[]>;
  readonly entriesByPool: ReadonlyMap<string, readonly PoolEntry[]>;
  readonly entities: ReadonlyMap<string, ReadonlyMap<string, DataRow>>;
  readonly methodViews: ReadonlyMap<string, MethodView>;
  readonly requirements: ReadonlyMap<string, readonly RequirementRoot[]>;
}
export interface SkillLearningDefinition {
  readonly maxRank: number;
  readonly levelRequirement: { base_value: number; bonus_per_level: number };
  readonly skillPointCost: { base_value: number; bonus_per_level: number };
}
export interface AcquisitionTree {
  readonly itemId: string;
  readonly amount: number;
  readonly names: Readonly<Record<string, string>>;
  readonly sources: ItemSourceView;
  readonly branches: readonly AcquisitionBranch[];
  readonly reason?: "depth_limit" | "node_limit" | "cycle";
  readonly inspectionLink: string;
}
export interface AcquisitionBranch {
  readonly method: MethodView;
  readonly requestedAmount: number;
  readonly yieldedAmount: EvaluatedQuantity;
  readonly batches: number | null;
  readonly repeatability: Repeatability;
  readonly requiredExecutions: number | null;
  readonly plannedExecutions: number | null;
  readonly uncoveredAmount: number | null;
  readonly availability: "not_evaluated";
  readonly ingredients: readonly {
    readonly input: InputRow;
    readonly amount: EvaluatedQuantity;
    readonly acquisition: AcquisitionTree | null;
  }[];
  readonly reason?: "cycle";
}
export type FingerprintSelection =
  | { kind: "items"; itemIds: readonly string[] }
  | { kind: "monsters"; monsterIds: readonly string[] }
  | { kind: "providers"; providers: readonly ProviderRef[] }
  | { kind: "recipes"; recipeIds: readonly string[] }
  | { kind: "requirements"; entities: readonly RequirementEntityRef[] };
