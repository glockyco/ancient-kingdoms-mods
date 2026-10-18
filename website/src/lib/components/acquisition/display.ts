import type {
  AcquisitionBranch,
  DefinitionInspection,
  ItemSourceView,
  EvaluatedQuantity,
  ItemUseView,
  MethodKind,
  MethodView,
  OutputView,
  Phase,
  ProbabilityFactor,
  ProbabilityResult,
  ProviderRef,
  Repeatability,
  Subject,
  RequirementExpression,
  RequirementPredicate,
  RequirementRoot,
  RequirementEntityRef,
} from "../../acquisition/types";

export interface DisplayItem {
  name: string;
  quality?: number;
  icon_path?: string | null;
}
export type DisplayItems = Record<string, DisplayItem>;

export function costLabel(
  group: MethodView["costGroups"][number],
  method: MethodView,
): string {
  const label =
    group.quantity_rule === "all_carried"
      ? method.kind === "blessing"
        ? "Cost per rune"
        : "Cost per unit"
      : group.phase === "purchase"
        ? "Price"
        : group.phase === "activate"
          ? "Activation cost"
          : group.phase === "accept"
            ? "On acceptance"
            : group.phase === "complete"
              ? "On completion"
              : group.phase === "attempt"
                ? "Cost per attempt"
                : group.phase === "exchange"
                  ? "Exchange cost"
                  : "Cost per use";
  return `${label}${
    group.selection_rule === "chest_key_first"
      ? " (matching key first)"
      : group.selection_rule === "chest_lockpick_fallback"
        ? " (without a matching key)"
        : ""
  }`;
}

export interface MethodOutcomeView {
  readonly key: string;
  readonly resourceKind: "item" | "gold";
  readonly itemId: string | null;
  readonly delivery: OutputView["delivery"];
  readonly outputs: readonly OutputView[];
  readonly probabilities: readonly ProbabilityResult[];
}
interface MutableMethodOutcome extends MethodOutcomeView {
  outputs: OutputView[];
  probabilities: ProbabilityResult[];
}
const outcomeViews = new WeakMap<MethodView, readonly MethodOutcomeView[]>();

export function methodOutcomes(
  method: MethodView,
): readonly MethodOutcomeView[] {
  const cached = outcomeViews.get(method);
  if (cached) return cached;
  const groups = new Map<string, MutableMethodOutcome>();
  for (const output of method.outputs) {
    const key =
      output.resource_kind === "item" && !output.item_id
        ? output.id
        : `${output.resource_kind}:${output.item_id ?? ""}:${output.delivery}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        resourceKind: output.resource_kind,
        itemId: output.item_id,
        delivery: output.delivery,
        outputs: [],
        probabilities: [],
      };
      groups.set(key, group);
    }
    group.outputs.push(output);
  }
  for (const result of method.probabilityResults) {
    const itemId = result.target.kind === "item" ? result.target.itemId : null;
    const key = `${result.target.kind}:${itemId ?? ""}:${result.target.delivery}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        resourceKind: result.target.kind,
        itemId,
        delivery: result.target.delivery,
        outputs: [],
        probabilities: [],
      };
      groups.set(key, group);
    }
    group.probabilities.push(result);
  }
  const result = [...groups.values()];
  outcomeViews.set(method, result);
  return result;
}

function withoutShownConjuncts(
  expression: RequirementExpression,
  root: RequirementRoot,
  shown: (predicate: RequirementPredicate, root: RequirementRoot) => boolean,
): RequirementExpression | null {
  if (expression.kind === "predicate")
    return shown(expression.predicate, root) ? null : expression;
  // A displayed cost cannot replace just one alternative of an OR requirement.
  if (expression.kind === "any") return expression;
  const operands: RequirementExpression[] = [];
  let changed = false;
  for (const operand of expression.operands) {
    const remaining = withoutShownConjuncts(operand, root, shown);
    if (remaining !== operand) changed = true;
    if (remaining) operands.push(remaining);
  }
  if (!changed) return expression;
  if (!operands.length) return null;
  return operands.length === 1 ? operands[0] : { kind: "all", operands };
}

function requirementsWithoutShownConjuncts(
  roots: readonly RequirementRoot[],
  shown: (predicate: RequirementPredicate, root: RequirementRoot) => boolean,
): readonly RequirementRoot[] {
  const result: RequirementRoot[] = [];
  const seen = new Set<RequirementRoot>();
  for (const root of roots) {
    if (seen.has(root)) continue;
    seen.add(root);
    const expression = withoutShownConjuncts(root.expression, root, shown);
    if (expression)
      result.push(
        expression === root.expression ? root : { ...root, expression },
      );
  }
  return result;
}

export function itemPresentationRequirements(
  roots: readonly RequirementRoot[],
  requiredLevel: number,
): readonly RequirementRoot[] {
  return requirementsWithoutShownConjuncts(
    roots,
    (predicate, root) =>
      (root.phase === "equip" || root.phase === "use") &&
      predicate.kind === "metric_at_least" &&
      predicate.metric === "level" &&
      predicate.amount === requiredLevel,
  );
}

function isQuestSelfState(
  predicate: RequirementPredicate,
  root: RequirementRoot,
  questId: string,
): boolean {
  return (
    predicate.kind === "quest_state" &&
    predicate.subject === "player" &&
    predicate.questId === questId &&
    ((root.phase === "accept" &&
      (predicate.state === "not_active" ||
        predicate.state === "not_completed")) ||
      (root.phase === "complete" && predicate.state === "active"))
  );
}

export function questPresentationRequirements(
  roots: readonly RequirementRoot[],
  questId: string,
  shown: { requiredLevel?: number; restrictions?: boolean },
): readonly RequirementRoot[] {
  const result = requirementsWithoutShownConjuncts(roots, (predicate, root) => {
    if (root.subject !== "player") return false;
    if (isQuestSelfState(predicate, root, questId)) return true;
    if (root.phase === "fulfill" || root.phase === "complete")
      return (
        predicate.kind === "quest_progress" && predicate.questId === questId
      );
    return (
      root.phase === "accept" &&
      ((predicate.kind === "metric_at_least" &&
        predicate.metric === "level" &&
        predicate.amount === shown.requiredLevel) ||
        (shown.restrictions === true &&
          ((predicate.kind === "identity_is" &&
            (predicate.identityKind === "class" ||
              predicate.identityKind === "race")) ||
            predicate.kind === "faction_at_least")))
    );
  });
  const fulfillment = new Set(
    result
      .filter((root) => root.phase === "fulfill")
      .map((root) => JSON.stringify(root)),
  );
  return result.filter(
    (root) =>
      root.phase !== "complete" ||
      !fulfillment.has(JSON.stringify({ ...root, phase: "fulfill" })),
  );
}

export function methodPresentationRequirements(
  method: MethodView,
): readonly RequirementRoot[] {
  return requirementsWithoutShownConjuncts(
    method.requirements,
    (predicate, root) =>
      ((method.kind === "quest_accept" || method.kind === "quest_complete") &&
        typeof method.detail.quest_id === "string" &&
        isQuestSelfState(predicate, root, method.detail.quest_id)) ||
      (predicate.kind === "instance_eligible" &&
        predicate.rule === "essence_server" &&
        method.kind === "essence" &&
        method.costGroups.some((group) =>
          group.inputs.some(
            (input) => !input.withheld && input.item_id === predicate.itemId,
          ),
        )) ||
      (predicate.kind === "item_count" &&
        predicate.subject === "player" &&
        predicate.location === "inventory" &&
        method.costGroups.some(
          (group) =>
            group.phase === root.phase &&
            (group.quantity_rule === "fixed" ||
              (method.kind === "blessing" &&
                group.quantity_rule === "all_carried")) &&
            group.selection_rule === "always" &&
            group.consumption_rule !== "quest_inventory_then_equipped" &&
            group.inputs.some(
              (input) =>
                !input.withheld &&
                input.item_id === predicate.itemId &&
                input.amount >= predicate.amount,
            ),
        )),
  );
}

export function costTimingText(
  group: MethodView["costGroups"][number],
  method: MethodView,
): string | null {
  switch (group.consumption_rule) {
    case "on_success":
      return method.kind === "treasure_dig"
        ? "Failed digs do not use up the map."
        : null;
    case "before_roll":
      if (
        method.kind !== "recipe" ||
        method.ruleId === "crafting" ||
        Number(method.detail.tier) === 0
      )
        return null;
      if (
        method.ruleId === "cooking" &&
        !method.probabilityResults.some(
          (result) =>
            result.target.kind === "item" &&
            result.target.itemId === method.detail.declared_result_item_id &&
            result.probability !== null &&
            result.probability > 0 &&
            result.probability < 1,
        )
      )
        return null;
      return "Materials are lost if the attempt fails.";
    case "after_outer_success":
      if (group.selection_rule === "chest_lockpick_fallback")
        return "A failed lockpick attempt still uses a lockpick.";
      return Number(method.detail.outer_success) === 1
        ? null
        : "The key is used only if the chest opens.";
    case "quest_inventory_then_equipped":
      return group.inputs.some((input) => input.role === "quest_secondary")
        ? "Inventory items are spent first. Otherwise, one eligible equipped item is used. Keys on the key ring are kept."
        : "Required inventory items are consumed. Keys on the key ring are kept.";
    case "replace_carried_stack":
      return method.kind === "blessing"
        ? "Converts all carried runes, one for one."
        : "Uses the full carried stack.";
  }
}

export function additionalInspection(
  source: ItemSourceView,
  uses: readonly ItemUseView[],
): DefinitionInspection {
  return {
    ...source.inspection,
    offeredAssets: source.inspection.offeredAssets.filter(
      (offer) =>
        !source.methods.some((method) => method.methodId === offer.methodId),
    ),
    initiatingMemberships: source.inspection.initiatingMemberships.filter(
      (method) => !uses.some((use) => use.method?.methodId === method.methodId),
    ),
  };
}

const METHOD_LABELS: Record<MethodKind, string> = {
  kill: "Monster loot",
  vendor: "Purchase",
  quest_accept: "Quest acceptance",
  quest_complete: "Quest completion",
  altar_activate: "Altar activation",
  recipe: "Recipe",
  gather: "Gathering",
  world_chest: "World chest",
  portable_chest: "Open carried chest",
  pack_use: "Use carried pack",
  merge: "Combine components",
  fragment: "Combine fragments",
  treasure_dig: "Treasure digging",
  blessing: "Bless carried runes",
  essence: "Primal Essence exchange",
  creation: "Starting equipment",
  housing: "Housing catalog",
  cap_xp: "Maximum-level XP cycle",
};
export function methodGroupKey(method: MethodView): string {
  return method.kind === "recipe"
    ? `recipe:${method.detail.display_kind}`
    : method.kind;
}

export function methodLabel(method: MethodView): string {
  if (method.kind === "recipe")
    return `${String(method.detail.display_kind ?? "crafting").replace(/^./, (c) => c.toUpperCase())} recipe`;
  return METHOD_LABELS[method.kind];
}
export function quantityText(quantity: EvaluatedQuantity): string {
  switch (quantity.kind) {
    case "exact":
      return quantity.value.toLocaleString("en-US");
    case "range":
      return quantity.max === null
        ? `at least ${quantity.min.toLocaleString("en-US")}`
        : `${quantity.min.toLocaleString("en-US")} to ${quantity.max.toLocaleString("en-US")}`;
    case "unknown":
      return "quantity depends on the batch or outcome";
  }
}
export function lifecycleText(repeatability: Repeatability): string {
  switch (repeatability.kind) {
    case "repeatable":
      return "";
    case "once_per_character":
      return "Once per character.";
    case "state_dependent":
      return {
        quest_cycle: "",
        world_state: "",
        event_reset: "",
        xp_cycle: "One reward per additional XP cycle.",
      }[repeatability.basis];
  }
}
export function providerHref(ref: ProviderRef): string | null {
  switch (ref.kind) {
    case "npcs":
      return `/npcs/${ref.id}`;
    case "altars":
      return `/altars/${ref.id}`;
    case "chests":
      return `/chests/${ref.id}`;
    case "items":
      return `/items/${ref.id}`;
    case "classes":
      return `/classes/${ref.id}`;
    default:
      return null;
  }
}
export function recipeHref(method: MethodView): string | null {
  const id =
    method.detail.crafting_recipe_id ??
    method.detail.alchemy_recipe_id ??
    method.detail.scribing_recipe_id;
  return typeof id === "string" ? `/recipes/${id}` : null;
}

export const REQUIREMENT_PHASE_LABELS: Record<Phase, string> = {
  offer: "To see this offer",
  purchase: "To buy",
  accept: "To accept",
  fulfill: "To fulfill",
  complete: "To complete",
  activate: "To activate",
  attempt: "To attempt",
  exchange: "To exchange",
  learn: "To learn",
  equip: "To equip",
  use: "To use",
  cast: "To cast",
  enter: "To enter",
  loot: "To loot",
};
export const REQUIREMENT_SUBJECT_LABELS: Record<Subject, string> = {
  player: "you",
  wearer: "the wearer",
  selected_instance: "the selected item",
  permitted_party: "eligible party members",
  current_world: "the current world",
};
export const PROBABILITY_EVENT_LABELS: Record<
  ProbabilityResult["event"],
  string
> = {
  corpse_generation: "kill",
  eligible_kill: "eligible final-wave kill",
  successful_hook: "successful hook",
  cast: "cast",
  attempt: "attempt",
  successful_opening: "successful opening",
  opening: "opening",
  parent_award: "award",
};
const EQUIPPED_DELIVERY: Readonly<Record<number, string>> = {
  2: "equipped on the chest",
  3: "equipped on the legs",
  12: "equipped in the main hand",
  13: "equipped in the off-hand",
};
export function deliveryText(
  delivery: OutputView["delivery"],
  slot: number | null = null,
): string {
  switch (delivery) {
    case "inventory":
      return "added to inventory";
    case "keyring":
      return "added to the key ring";
    case "corpse":
      return "available to loot from the corpse";
    case "placed_structure":
      return "placed at your house";
    case "quest_progress":
      return "credited to active quest progress, not inventory";
    case "equipment":
      return EQUIPPED_DELIVERY[slot ?? -1] ?? "equipped";
  }
}

export function expectedQuantityText(result: ProbabilityResult): string | null {
  if (
    result.expectedQuantity === null ||
    result.quantityMeaning === "fixed_units" ||
    (result.quantityMeaning === "at_least_one" &&
      result.expectedQuantity === result.probability)
  )
    return null;
  return `Average ${result.expectedQuantity.toLocaleString("en-US", {
    maximumSignificantDigits: 5,
  })} per ${PROBABILITY_EVENT_LABELS[result.event]}.`;
}

export function probabilityScenarioText(
  result: ProbabilityResult,
  factors: readonly ProbabilityFactor[],
): string {
  const a = result.assumptions;
  const notes: string[] = [];
  const percent = (value: number) =>
    `${(value * 100).toLocaleString("en-US", { maximumSignificantDigits: 5 })}%`;
  for (const factor of factors) {
    switch (factor) {
      case "fatecharm":
        notes.push(a.fatecharm ? "With Fatecharm." : "Without Fatecharm.");
        break;
      case "treasure_hunter":
        notes.push(`Treasure Hunter ${percent(a.treasureHunter)}.`);
        break;
      case "quest_need":
        notes.push(
          a.questNeed === "none"
            ? "Assumes no quest-dependent drops are needed."
            : a.questNeed === "unknown"
              ? "Quest need is not specified."
              : "With the selected quest-need scenario.",
        );
        break;
      case "hunting":
        notes.push(`Hunting ${percent(a.huntingFraction ?? 0)}.`);
        break;
      case "profession":
        notes.push(
          a.professionFraction === null
            ? "Profession skill not specified."
            : `Profession skill ${percent(a.professionFraction)}.`,
        );
        break;
      case "tool":
        notes.push(
          a.toolQuality === null
            ? "Tool quality not specified."
            : `Tool quality ${a.toolQuality}.`,
        );
        break;
      case "costume":
        notes.push(`${a.costumePieces} Fisherman costume pieces.`);
        break;
      case "extra_gather":
        notes.push(`Extra-gather chance ${percent(a.extraGatherChance ?? 0)}.`);
        break;
      case "altar_tier":
        if (a.altarTier !== null && a.altarTier !== undefined)
          notes.push(
            `Altar reward tier ${["I", "II", "III", "IV"][a.altarTier]}.`,
          );
        break;
      case "chest_access":
        notes.push(
          a.chestAccess === "key"
            ? "Using the matching key."
            : a.chestAccess === "lockpick"
              ? "Using Lockpicking."
              : "Key or lockpick access not specified.",
        );
        break;
    }
  }
  return notes.join(" ");
}

export const USE_ENTITY_LABELS: Readonly<
  Record<RequirementEntityRef["kind"], string>
> = {
  item: "item",
  skill: "skill",
  quest: "quest",
  portal: "portal",
  resource: "gathering",
  summon_trigger: "summoning",
};

const USE_ROLE_LABELS: Readonly<Record<string, string>> = {
  material: "Recipe ingredient",
  currency: "Trade currency",
  activation: "Altar activation",
  key: "Chest key",
  lockpick: "Lockpicking",
  component: "Combine with other components",
  fragment: "Combine fragments",
  selected_instance: "Selected item exchange",
  quest_primary: "Quest completion item",
  quest_secondary: "Alternative quest completion item",
  retained: "Required item",
  portable_chest: "Open this chest",
  pack_use: "Use this pack",
  merge: "Combine components",
  treasure_map: "Dig for treasure",
  gather_counter: "Gathering quest progress",
  inventory_primary: "Quest inventory requirement",
  inventory_secondary: "Quest inventory or equipment requirement",
  equipped: "Quest equipment requirement",
  brew_counter: "Successful brews for a quest",
  attachment: "Augment compatibility",
};
export function useRoleLabel(role: string, method?: MethodView | null): string {
  if (
    method &&
    (role === "activation" || (role === "material" && method.kind !== "recipe"))
  )
    return methodLabel(method);
  return USE_ROLE_LABELS[role] ?? role.replaceAll("_", " ");
}

const EXECUTION_UNITS: Partial<Record<MethodKind, string>> = {
  recipe: "batches",
  vendor: "purchases",
  quest_accept: "quest acceptances",
  quest_complete: "quest completions",
  altar_activate: "altar activations",
  gather: "gathers",
  kill: "kills",
  world_chest: "chest openings",
  portable_chest: "chest openings",
  pack_use: "pack openings",
  treasure_dig: "digs",
  cap_xp: "full XP cycles",
};

export function acquisitionPlanNotes(
  branch: AcquisitionBranch,
): readonly string[] {
  const notes: string[] = [];
  const unit = EXECUTION_UNITS[branch.method.kind] ?? "uses";
  if (branch.plannedExecutions !== null && branch.plannedExecutions > 1)
    notes.push(
      `${branch.plannedExecutions} ${unit} produce ×${quantityText(branch.yieldedAmount)} in total.`,
    );
  else if (
    branch.requiredExecutions !== null &&
    branch.plannedExecutions === null &&
    branch.requiredExecutions > 1
  )
    notes.push(`Requires ${branch.requiredExecutions} separate ${unit}.`);
  if (branch.uncoveredAmount !== null && branch.uncoveredAmount > 0)
    notes.push(`${branch.uncoveredAmount} must come from another source.`);
  if (
    branch.plannedExecutions === null &&
    branch.ingredients.length &&
    branch.method.costGroups.some(
      (group) => group.quantity_rule === "all_carried",
    )
  )
    notes.push(
      `Costs below are per ${branch.method.kind === "blessing" ? "rune" : "item"}.`,
    );
  return notes;
}

export function ingredientQuantityText(
  branch: AcquisitionBranch,
  ingredient: AcquisitionBranch["ingredients"][number],
): string | null {
  if (ingredient.amount.kind !== "unknown")
    return quantityText(ingredient.amount);
  return branch.method.costGroups.some(
    (group) =>
      group.id === ingredient.input.cost_group_id &&
      group.quantity_rule === "all_carried",
  )
    ? String(ingredient.input.amount)
    : null;
}
