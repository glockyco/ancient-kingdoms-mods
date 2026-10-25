import {
  PROFESSION_MECHANICS,
  rawTierSuccessChance,
} from "../data/professions/mechanics";
import {
  SEASONS,
  seasonDates,
  seasonIncludes,
  seasonInSentence,
} from "../data/seasonal-events";
import { formatNumber, toRomanNumeral } from "$lib/utils/format";
import type {
  AcquisitionRows,
  DataRow,
  FactCollection,
  Known,
  PredicatePayload,
  RequirementExpression,
  RequirementFacts,
  RequirementPredicate,
  RequirementRoot,
  RequirementResult,
  RequirementDescription,
  Subject,
  SubjectFacts,
  SkillLearningDefinition,
} from "./types";
import { dataError } from "./queries";
export function skillLearningAtRank(
  skill: SkillLearningDefinition,
  rank: number,
): { requiredLevel: number; pointCost: number } {
  if (
    !Number.isSafeInteger(skill.maxRank) ||
    skill.maxRank < 1 ||
    !Number.isInteger(rank) ||
    rank < 1 ||
    rank > skill.maxRank
  )
    throw new RangeError(`Invalid learning rank ${rank}`);
  for (const curve of [skill.levelRequirement, skill.skillPointCost])
    if (
      !Number.isFinite(curve.base_value) ||
      !Number.isFinite(curve.bonus_per_level)
    )
      dataError("skill learning", "invalid rank curve");
  return {
    requiredLevel:
      skill.levelRequirement.base_value +
      skill.levelRequirement.bonus_per_level * (rank - 1),
    pointCost:
      skill.skillPointCost.base_value +
      skill.skillPointCost.bonus_per_level * (rank - 1),
  };
}
export function predicate(
  payload: PredicatePayload,
  subject: Subject = "player",
): RequirementExpression {
  return { kind: "predicate", predicate: { ...payload, subject } };
}
export function combine(
  kind: "all" | "any",
  operands: readonly RequirementExpression[],
): RequirementExpression {
  if (!operands.length) dataError("requirements", `empty ${kind}`);
  return operands.length === 1 ? operands[0] : { kind, operands };
}
const unknown = { status: "unknown", children: [], evidence: [] } as const;
const PREDICATE_FIELDS: Record<
  PredicatePayload["kind"],
  {
    strings: readonly string[];
    numbers: readonly string[];
    booleans?: readonly string[];
  }
> = {
  metric_at_least: { strings: ["metric", "unit"], numbers: ["amount"] },
  identity_is: { strings: ["identityKind", "id"], numbers: [] },
  item_count: { strings: ["itemId", "location"], numbers: ["amount"] },
  faction_at_least: { strings: ["factionId"], numbers: ["standing"] },
  quest_state: { strings: ["questId", "state"], numbers: [] },
  quest_progress: {
    strings: ["questId", "objectiveId", "counterKind"],
    numbers: ["amount"],
  },
  recipe_known: { strings: ["resultItemId"], numbers: [] },
  skill_base_rank: { strings: ["skillId"], numbers: ["rank"] },
  skill_tier_choice: { strings: ["skillId"], numbers: ["tier", "defaultRank"] },
  profession_floor: { strings: ["profession"], numbers: ["tier"] },
  usable_tool: {
    strings: ["category"],
    numbers: [],
    booleans: ["requiresDurability"],
  },
  party_key: { strings: ["itemId"], numbers: [], booleans: ["onlineOnly"] },
  current_monster_dead: { strings: ["monsterSpawnId"], numbers: [] },
  event_ready: { strings: ["triggerId"], numbers: [] },
  quest_cycle: { strings: ["questId", "cycle"], numbers: [] },
  game_clock_window: {
    strings: [],
    numbers: ["startHour", "endHour"],
    booleans: ["includeStart", "includeEnd"],
  },
  season_active: { strings: ["season"], numbers: [] },
  altar_tier: { strings: ["altarId"], numbers: ["tier", "minimumScore"] },
  house_owned: { strings: [], numbers: [] },
  home_station: { strings: ["structureItemId", "componentPath"], numbers: [] },
  instance_eligible: { strings: ["itemId", "rule"], numbers: [] },
  withheld: { strings: ["reason"], numbers: [] },
};
function validatePredicate(predicate: RequirementPredicate): void {
  if (!predicate || !Object.hasOwn(PREDICATE_FIELDS, predicate.kind))
    dataError("requirements", "unsupported predicate kind");
  if (
    ![
      "player",
      "wearer",
      "selected_instance",
      "permitted_party",
      "current_world",
    ].includes(predicate.subject)
  )
    dataError("requirements", "invalid predicate subject");
  const fields = PREDICATE_FIELDS[predicate.kind];
  // Validate the closed external payload once before using its discriminated type.
  const value = predicate as unknown as Record<string, unknown>;
  for (const key of fields.strings)
    if (typeof value[key] !== "string" || !value[key])
      dataError(predicate.kind, `invalid ${key}`);
  for (const key of fields.numbers)
    if (typeof value[key] !== "number" || !Number.isFinite(value[key]))
      dataError(predicate.kind, `invalid ${key}`);
  for (const key of fields.booleans ?? [])
    if (typeof value[key] !== "boolean")
      dataError(predicate.kind, `invalid ${key}`);
  const enums: Partial<
    Record<
      PredicatePayload["kind"],
      { field: string; values: readonly string[] }
    >
  > = {
    metric_at_least: {
      field: "metric",
      values: [
        "level",
        "total_veteran_points",
        "available_skill_points",
        "available_veteran_points",
        "spent_skill_points",
        "spent_veteran_points",
        "equipped_item_level",
        "adventuring_fraction",
      ],
    },
    identity_is: { field: "identityKind", values: ["class", "race"] },
    item_count: {
      field: "location",
      values: [
        "inventory",
        "base_inventory",
        "equipment",
        "keyring",
        "bank",
        "house",
        "mercenary",
      ],
    },
    quest_state: {
      field: "state",
      values: ["active", "completed", "not_active", "not_completed"],
    },
    quest_progress: {
      field: "counterKind",
      values: ["kill", "gather", "brew", "location"],
    },
    profession_floor: {
      field: "profession",
      values: ["alchemy", "cooking", "herbalism", "mining", "fishing"],
    },
    usable_tool: {
      field: "category",
      values: ["Pickaxe", "Fishing Rod", "Shovel"],
    },
    quest_cycle: {
      field: "cycle",
      values: ["repeat_8h", "daily_24h", "currently_offered"],
    },
    instance_eligible: {
      field: "rule",
      values: ["essence_ui", "essence_server"],
    },
    withheld: { field: "reason", values: ["unpublished_target"] },
    season_active: { field: "season", values: Object.keys(SEASONS) },
  };
  const enumeration = enums[predicate.kind];
  if (
    enumeration &&
    !enumeration.values.includes(String(value[enumeration.field]))
  )
    dataError(predicate.kind, `invalid ${enumeration.field}`);
  if (
    predicate.kind === "altar_tier" &&
    (!Number.isInteger(predicate.tier) ||
      predicate.tier < 0 ||
      predicate.tier > 3 ||
      (predicate.maximumScore !== null &&
        (!Number.isFinite(predicate.maximumScore) ||
          predicate.maximumScore < predicate.minimumScore)))
  )
    dataError("altar tier", "invalid bounds");
  if (predicate.kind === "party_key" && predicate.onlineOnly !== true)
    dataError("party key", "onlineOnly must be true");
}
function compare<T>(
  fact: Known<T> | undefined,
  test: (value: T) => boolean,
): RequirementResult {
  return fact?.known
    ? {
        status: test(fact.value) ? "met" : "unmet",
        children: [],
        evidence: [fact.provenance],
      }
    : unknown;
}
function membership<T>(
  facts: FactCollection<T> | undefined,
  test: (entry: T) => boolean,
): RequirementResult {
  if (facts?.entries.some(test))
    return { status: "met", children: [], evidence: ["known member"] };
  return facts?.complete
    ? { status: "unmet", children: [], evidence: ["complete collection"] }
    : unknown;
}
function countItem(
  subject: SubjectFacts | undefined,
  p: Extract<RequirementPredicate, { kind: "item_count" }>,
): RequirementResult {
  const collections =
    p.location === "inventory"
      ? [subject?.items?.inventory, subject?.items?.base_inventory]
      : [subject?.items?.[p.location]];
  let lowerBound = 0;
  for (const col of collections) {
    const count =
      col?.entries.reduce(
        (sum, item) => sum + (item.itemId === p.itemId ? item.amount : 0),
        0,
      ) ?? 0;
    lowerBound = Math.max(lowerBound, count);
  }
  if (lowerBound >= p.amount)
    return {
      status: "met",
      children: [],
      evidence: [`known count at least ${lowerBound}`],
    };
  return collections[0]?.complete
    ? {
        status: "unmet",
        children: [],
        evidence: [`complete count ${lowerBound}`],
      }
    : unknown;
}
function evaluatePredicate(
  p: RequirementPredicate,
  facts: RequirementFacts,
): RequirementResult {
  validatePredicate(p);
  const s = facts.subjects?.[p.subject];
  switch (p.kind) {
    case "withheld":
      return unknown;
    case "metric_at_least":
      return compare(s?.metrics?.[p.metric], (v) => v >= p.amount);
    case "identity_is":
      return compare(s?.identities?.[p.identityKind], (v) => v === p.id);
    case "item_count":
      return countItem(s, p);
    case "faction_at_least": {
      const entry = s?.factions?.entries.find(
        (f) => f.factionId === p.factionId,
      );
      return entry
        ? {
            status: entry.standing >= p.standing ? "met" : "unmet",
            children: [],
            evidence: [`standing ${entry.standing}`],
          }
        : unknown;
    }
    case "quest_state": {
      const quest = s?.quests?.entries.find(
        (quest) => quest.questId === p.questId,
      );
      if (quest) {
        const met =
          p.state === "active"
            ? quest.active
            : p.state === "completed"
              ? quest.completed
              : p.state === "not_active"
                ? !quest.active
                : !quest.completed;
        return {
          status: met ? "met" : "unmet",
          children: [],
          evidence: ["known quest state"],
        };
      }
      return s?.quests?.complete
        ? {
            status:
              p.state === "not_active" || p.state === "not_completed"
                ? "met"
                : "unmet",
            children: [],
            evidence: ["complete quest collection"],
          }
        : unknown;
    }
    case "quest_progress": {
      const entry = s?.questProgress?.entries.find(
        (q) => q.questId === p.questId && q.objectiveId === p.objectiveId,
      );
      if (entry?.amount !== undefined && entry.amount >= p.amount)
        return {
          status: "met",
          children: [],
          evidence: [`progress ${entry.amount}`],
        };
      return s?.questProgress?.complete
        ? {
            status: "unmet",
            children: [],
            evidence: [`progress ${entry?.amount ?? 0}`],
          }
        : unknown;
    }
    case "recipe_known":
      return membership(s?.recipes, (v) => v === p.resultItemId);
    case "skill_base_rank": {
      const rank = s?.skills?.entries.find(
        (v) => v.skillId === p.skillId,
      )?.baseRank;
      if (rank !== undefined && rank >= p.rank)
        return { status: "met", children: [], evidence: [`base rank ${rank}`] };
      return s?.skills?.complete
        ? {
            status: "unmet",
            children: [],
            evidence: [`base rank ${rank ?? 0}`],
          }
        : unknown;
    }
    case "skill_tier_choice": {
      if (p.tier === 0)
        return { status: "met", children: [], evidence: ["unrestricted tier"] };
      const own = s?.skills?.entries.find((v) => v.skillId === p.skillId);
      if (own && own.baseRank > p.defaultRank)
        return { status: "met", children: [], evidence: ["already chosen"] };
      const chosen =
        s?.skills?.entries.filter(
          (v) => v.tier === p.tier && v.baseRank > v.defaultRank,
        ).length ?? 0;
      const limit = p.tier === 1 || p.tier === 3 ? 2 : 1;
      if (chosen >= limit)
        return {
          status: "unmet",
          children: [],
          evidence: ["tier choices full"],
        };
      return s?.skills?.complete
        ? { status: "met", children: [], evidence: ["tier choice available"] }
        : unknown;
    }
    case "profession_floor": {
      const skill = s?.professions?.[p.profession];
      if (!skill?.known) return unknown;
      const needsTool = p.profession === "mining" || p.profession === "fishing";
      const category = p.profession === "mining" ? "Pickaxe" : "Fishing Rod";
      const tool = needsTool
        ? s?.tools?.entries.find(
            (t) => t.category === category && t.durability > 0,
          )
        : undefined;
      if (needsTool && !tool)
        return s?.tools?.complete
          ? { status: "unmet", children: [], evidence: ["no usable tool"] }
          : unknown;
      const rule = PROFESSION_MECHANICS[p.profession].success;
      const chance = rawTierSuccessChance(
        rule,
        p.tier,
        skill.value * 100,
        tool?.quality ?? 0,
      );
      return {
        status: chance + Number.EPSILON >= rule.floor ? "met" : "unmet",
        children: [],
        evidence: [`raw success ${chance}`, `required floor ${rule.floor}`],
      };
    }
    case "usable_tool":
      return membership(
        s?.tools,
        (t) =>
          t.category === p.category &&
          (!p.requiresDurability || t.durability > 0),
      );
    case "party_key": {
      let complete = facts.party?.complete ?? false;
      for (const member of facts.party?.entries ?? []) {
        if (!member.online) continue;
        const result = countItem(
          { items: { inventory: member.items } },
          { ...p, kind: "item_count", location: "inventory", amount: 1 },
        );
        if (result.status === "met") return result;
        complete &&= member.items.complete;
      }
      return complete
        ? {
            status: "unmet",
            children: [],
            evidence: ["complete online party inventory"],
          }
        : unknown;
    }
    case "current_monster_dead": {
      const world = facts.world;
      const observation = world?.monsters?.entries.find(
        (m) =>
          m.monsterSpawnId === p.monsterSpawnId &&
          m.instanceToken === world.instanceToken,
      );
      return observation
        ? {
            status: observation.dead ? "met" : "unmet",
            children: [],
            evidence: ["current world observation"],
          }
        : unknown;
    }
    case "event_ready": {
      const world = facts.world;
      const observation = world?.events?.entries.find(
        (e) =>
          e.triggerId === p.triggerId &&
          e.instanceToken === world.instanceToken,
      );
      return observation
        ? {
            status: observation.ready ? "met" : "unmet",
            children: [],
            evidence: ["current event observation"],
          }
        : unknown;
    }
    case "quest_cycle": {
      if (p.cycle === "currently_offered")
        return membership(facts.offeredQuests, (value) => value === p.questId);
      const quest = s?.quests?.entries.find(
        (quest) => quest.questId === p.questId,
      );
      if (!quest?.completedAt) {
        if (s?.quests?.complete && (!quest || !quest.completed))
          return {
            status: "met",
            children: [],
            evidence: ["no prior completed cycle"],
          };
        return unknown;
      }
      if (!facts.nowUtc?.known) return unknown;
      const completed = Date.parse(quest.completedAt),
        now = Date.parse(facts.nowUtc.value);
      if (!Number.isFinite(completed) || !Number.isFinite(now))
        dataError("quest cycle", "invalid UTC timestamp");
      const ready =
        now - completed >= (p.cycle === "repeat_8h" ? 8 : 24) * 3600000;
      return {
        status: ready ? "met" : "unmet",
        children: [],
        evidence: ["elapsed UTC completion window"],
      };
    }
    case "game_clock_window":
      return compare(facts.gameHour, (h) => {
        const after = p.includeStart ? h >= p.startHour : h > p.startHour;
        const before = p.includeEnd ? h <= p.endHour : h < p.endHour;
        return p.startHour <= p.endHour ? after && before : after || before;
      });
    case "season_active":
      return compare(facts.nowUtc, (value) => {
        const instant = new Date(value);
        if (!Number.isFinite(instant.getTime()))
          dataError("season", "invalid UTC timestamp");
        return seasonIncludes(p.season, instant);
      });
    case "altar_tier": {
      const level = s?.metrics?.level,
        veteran = s?.metrics?.total_veteran_points;
      if (!level?.known || !veteran?.known) return unknown;
      const score = level.value + veteran.value;
      return {
        status:
          score >= p.minimumScore &&
          (p.maximumScore === null || score <= p.maximumScore)
            ? "met"
            : "unmet",
        children: [],
        evidence: [
          `activating player level plus total veteran points ${score}`,
        ],
      };
    }
    case "house_owned":
      return compare(s?.houseOwned, (v) => v);
    case "home_station":
      return membership(
        s?.homeStations,
        (v) =>
          v.structureItemId === p.structureItemId &&
          v.componentPath === p.componentPath,
      );
    case "instance_eligible": {
      const instance = s?.instances?.entries.find((i) => i.itemId === p.itemId);
      return instance
        ? {
            status:
              instance.definitionEligible &&
              (p.rule === "essence_server" || instance.durability > 0)
                ? "met"
                : "unmet",
            children: [],
            evidence: [p.rule],
          }
        : unknown;
    }
    default:
      return dataError("predicate", "unsupported predicate kind");
  }
}
export function evaluateRequirement(
  root: RequirementRoot,
  facts: RequirementFacts,
): RequirementResult {
  function visit(expression: RequirementExpression): RequirementResult {
    if (expression.kind === "predicate")
      return evaluatePredicate(expression.predicate, facts);
    if (expression.kind !== "all" && expression.kind !== "any")
      dataError("requirement", "unsupported expression");
    if (!expression.operands.length)
      dataError("requirement", `empty ${expression.kind}`);
    const children = expression.operands.map(visit);
    const status =
      expression.kind === "all"
        ? children.some((c) => c.status === "unmet")
          ? "unmet"
          : children.every((c) => c.status === "met")
            ? "met"
            : "unknown"
        : children.some((c) => c.status === "met")
          ? "met"
          : children.every((c) => c.status === "unmet")
            ? "unmet"
            : "unknown";
    return { status, children, evidence: [] };
  }
  return visit(root.expression);
}
function requirementName(
  names: Readonly<Record<string, string>> | undefined,
  table: string,
  id: string,
): string {
  return names?.[`${table}:${id}`] ?? names?.[id] ?? id.replaceAll("_", " ");
}
function describePredicate(
  p: RequirementPredicate,
  names?: Readonly<Record<string, string>>,
): string {
  validatePredicate(p);
  switch (p.kind) {
    case "withheld":
      return "An unpublished requirement applies";
    case "metric_at_least": {
      switch (p.metric) {
        case "level":
          return `Level ${formatNumber(p.amount)} or higher`;
        case "total_veteran_points":
          return `At least ${formatNumber(p.amount)} total veteran ${p.amount === 1 ? "point" : "points"}`;
        case "available_skill_points":
          return `At least ${formatNumber(p.amount)} available skill ${p.amount === 1 ? "point" : "points"}`;
        case "available_veteran_points":
          return `At least ${formatNumber(p.amount)} available veteran ${p.amount === 1 ? "point" : "points"}`;
        case "spent_skill_points":
          return `At least ${formatNumber(p.amount)} skill ${p.amount === 1 ? "point" : "points"} spent`;
        case "spent_veteran_points":
          return `At least ${formatNumber(p.amount)} veteran ${p.amount === 1 ? "point" : "points"} spent`;
        case "equipped_item_level":
          return `Total equipped item level ${formatNumber(p.amount)} or higher`;
        case "adventuring_fraction":
          return `Adventuring ${p.amount * 100}% or higher`;
        default:
          return dataError("description", "unsupported metric");
      }
    }
    case "identity_is":
      return `${p.identityKind}: ${requirementName(names, p.identityKind === "class" ? "classes" : "races", p.id)}`;
    case "item_count":
      return `${formatNumber(p.amount)} ${requirementName(names, "items", p.itemId)} in ${p.location.replaceAll("_", " ")}`;
    case "faction_at_least":
      return `${requirementName(names, "factions", p.factionId)} standing at least ${formatNumber(p.standing)}`;
    case "quest_state":
      return `${requirementName(names, "quests", p.questId)} ${p.state.replaceAll("_", " ")}`;
    case "quest_progress": {
      const target = names?.[`quest_objective:${p.objectiveId}`];
      if (target) {
        switch (p.counterKind) {
          case "kill":
            return `Defeat ${target} ×${formatNumber(p.amount)}`;
          case "gather":
            return `Gather ${target} ×${formatNumber(p.amount)}`;
          case "brew":
            return `Successfully brew ${target} ${p.amount === 1 ? "once" : `${formatNumber(p.amount)} times`}`;
          case "location":
            return `Visit ${target}`;
        }
      }
      switch (p.counterKind) {
        case "kill":
          return `Defeat the quest's required monsters ×${formatNumber(p.amount)}`;
        case "gather":
          return `Gather the quest's required items ×${formatNumber(p.amount)}`;
        case "brew":
          return `Successfully brew the required quest item ${p.amount === 1 ? "once" : `${formatNumber(p.amount)} times`}`;
        case "location":
          return "Visit the quest location";
      }
      return dataError("description", "unsupported quest counter");
    }
    case "recipe_known":
      return `Know the recipe for ${requirementName(names, "items", p.resultItemId)}`;
    case "skill_base_rank":
      return `${requirementName(names, "skills", p.skillId)} base rank ${p.rank}`;
    case "skill_tier_choice":
      return `An available tier ${p.tier} choice, or upgrade an already chosen skill`;
    case "profession_floor":
      return `${p.profession} base success chance at least ${PROFESSION_MECHANICS[p.profession].success.floor * 100}% at tier ${toRomanNumeral(p.tier)}`;
    case "usable_tool":
      return `Carry a ${p.category}${p.requiresDurability ? " with durability remaining" : ""}`;
    case "party_key":
      return `An online party member sharing keys carries ${requirementName(names, "items", p.itemId)}`;
    case "current_monster_dead":
      return `${requirementName(names, "monster_spawns", p.monsterSpawnId)} is dead in the current world instance`;
    case "event_ready":
      return `${requirementName(names, "summon_triggers", p.triggerId)} is ready in the current world instance`;
    case "quest_cycle":
      return p.cycle === "currently_offered"
        ? `${requirementName(names, "quests", p.questId)} is currently offered`
        : `At least ${p.cycle === "repeat_8h" ? 8 : 24} hours since completing ${requirementName(names, "quests", p.questId)}`;
    case "game_clock_window":
      return `Game time ${p.includeStart ? "from" : "after"} ${p.startHour}:00 ${p.includeEnd ? "through" : "until"} ${p.endHour}:00`;
    case "season_active":
      return `During ${seasonInSentence(p.season)}, ${seasonDates(p.season)}`;
    case "altar_tier":
      return `Activating player's level plus total veteran points ${
        p.maximumScore === null
          ? `at least ${p.minimumScore}`
          : `from ${p.minimumScore} to ${p.maximumScore}`
      }`;
    case "house_owned":
      return "Own a house";
    case "home_station":
      return `A placed home workstation from ${requirementName(names, "items", p.structureItemId)}`;
    case "instance_eligible":
      return p.rule === "essence_ui"
        ? "The item must have durability remaining"
        : "Select one item eligible for Primal Essence";
    default:
      return dataError("description", "unsupported predicate");
  }
}
export function describeRequirement(
  root: RequirementRoot,
  names?: Readonly<Record<string, string>>,
): readonly RequirementDescription[] {
  function describe(
    e: RequirementExpression,
    parentKind?: "all" | "any",
  ): string {
    if (e.kind === "predicate") return describePredicate(e.predicate, names);
    if (!e.operands.length) dataError("description", "empty group");
    const text = e.operands
      .map((operand) => describe(operand, e.kind))
      .join(e.kind === "all" ? " and " : " or ");
    return parentKind && parentKind !== e.kind ? `(${text})` : text;
  }
  return [
    {
      phase: root.phase,
      subject: root.subject,
      enforcement: root.enforcement,
      text: describe(root.expression),
      expression: root.expression,
    },
  ];
}
export function composeRequirements(
  rows: AcquisitionRows,
): ReadonlyMap<string, readonly RequirementRoot[]> {
  const result = new Map<string, RequirementRoot[]>();
  const facts = rows.facts;
  const factIndexes = new Map<string, Map<unknown, DataRow[]>>();
  function matching(table: string, column: string, id: string): DataRow[] {
    const key = `${table}:${column}`;
    let groups = factIndexes.get(key);
    if (!groups) {
      groups = new Map();
      for (const row of facts[table] ?? []) {
        const group = groups.get(row[column]) ?? [];
        group.push(row);
        groups.set(row[column], group);
      }
      factIndexes.set(key, groups);
    }
    return groups.get(id) ?? [];
  }
  function add(
    key: string,
    phase: RequirementRoot["phase"],
    parts: RequirementExpression[],
    subject: Subject = "player",
    enforcement: RequirementRoot["enforcement"] = "both",
  ) {
    if (parts.length) {
      const roots = result.get(key) ?? [];
      roots.push({
        phase,
        subject,
        enforcement,
        expression: combine("all", parts),
      });
      result.set(key, roots);
    }
  }
  const withheld = () =>
    predicate({ kind: "withheld", reason: "unpublished_target" });
  function threshold(
    parts: RequirementExpression[],
    row: DataRow,
    field: string,
    metric:
      | "level"
      | "equipped_item_level"
      | "spent_skill_points"
      | "spent_veteran_points"
      | "total_veteran_points",
  ) {
    const amount = row[field];
    if (typeof amount === "number" && amount > 0)
      parts.push(
        predicate({
          kind: "metric_at_least",
          metric,
          amount,
          unit:
            metric === "level"
              ? "levels"
              : metric === "equipped_item_level"
                ? "item levels"
                : "points",
        }),
      );
  }
  for (const item of rows.entities.items ?? []) {
    const equip =
      !!item.slot ||
      ["weapon", "armor", "shield", "accessory"].includes(
        String(item.item_type),
      );
    const subject: Subject = equip ? "wearer" : "player";
    const parts: RequirementExpression[] = [];
    if (Number(item.level_required) > 0)
      parts.push(
        predicate(
          {
            kind: "metric_at_least",
            metric: "level",
            amount: Number(item.level_required),
            unit: "levels",
          },
          subject,
        ),
      );
    const classes = matching("item_class_requirements", "item_id", item.id)
      .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
      .map((row) =>
        row.withheld
          ? predicate(
              { kind: "withheld", reason: "unpublished_target" },
              subject,
            )
          : predicate(
              {
                kind: "identity_is",
                identityKind: "class",
                id: String(row.class_id),
              },
              subject,
            ),
      );
    if (classes.length) parts.push(combine("any", classes));
    add(`item:${item.id}`, equip ? "equip" : "use", parts, subject);
  }
  for (const skill of rows.entities.skills ?? []) {
    let classes: unknown = skill.player_classes;
    if (typeof classes === "string") {
      try {
        classes = JSON.parse(classes);
      } catch {
        dataError(skill.id, "invalid player class membership");
      }
    }
    if (classes === null || classes === undefined) continue;
    if (
      !Array.isArray(classes) ||
      classes.some((value) => typeof value !== "string")
    )
      dataError(skill.id, "invalid player class membership");
    if (!classes.length) continue;
    const maxRank = Number(skill.max_level ?? 1);
    if (!Number.isSafeInteger(maxRank) || maxRank < 0)
      dataError(skill.id, "invalid maximum learning rank");
    // Skill starts at its default rank. CanUpgrade requires a higher base rank within maxLevel.
    const firstLearningRank = skill.learn_default ? 2 : 1;
    if (firstLearningRank > maxRank) continue;
    const parts: RequirementExpression[] = [];
    parts.push(
      combine(
        "any",
        classes.map((id) =>
          predicate({
            kind: "identity_is",
            identityKind: "class",
            id: String(id),
          }),
        ),
      ),
    );
    threshold(
      parts,
      skill,
      "required_spent_points",
      skill.is_veteran ? "spent_veteran_points" : "spent_skill_points",
    );
    const curve = (
      raw: unknown,
      fallback: number,
    ): { base_value: number; bonus_per_level: number } => {
      let value = raw;
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch {
          dataError(skill.id, "invalid learning curve JSON");
        }
      }
      if (value === null || value === undefined)
        return { base_value: fallback, bonus_per_level: 0 };
      if (
        typeof value !== "object" ||
        !("base_value" in value) ||
        !("bonus_per_level" in value) ||
        typeof value.base_value !== "number" ||
        typeof value.bonus_per_level !== "number" ||
        !Number.isFinite(value.base_value) ||
        !Number.isFinite(value.bonus_per_level)
      )
        dataError(skill.id, "invalid learning curve");
      return {
        base_value: value.base_value,
        bonus_per_level: value.bonus_per_level,
      };
    };
    const level = curve(
      skill.level_requirement,
      Number(skill.level_required ?? 0),
    );
    const cost = curve(
      skill.skill_point_cost,
      Number(skill.required_skill_points ?? 1),
    );
    const rank = skillLearningAtRank(
      { maxRank, levelRequirement: level, skillPointCost: cost },
      firstLearningRank,
    );
    if (rank.requiredLevel > 0)
      parts.push(
        predicate({
          kind: "metric_at_least",
          metric: "level",
          amount: rank.requiredLevel,
          unit: "levels",
        }),
      );
    if (rank.pointCost > 0)
      parts.push(
        predicate({
          kind: "metric_at_least",
          metric: skill.is_veteran
            ? "available_veteran_points"
            : "available_skill_points",
          amount: rank.pointCost,
          unit: "points",
        }),
      );
    for (const predecessor of matching(
      "skill_predecessors",
      "skill_id",
      skill.id,
    ).sort((a, b) => Number(a.ordinal) - Number(b.ordinal)))
      parts.push(
        predecessor.withheld
          ? withheld()
          : predicate({
              kind: "skill_base_rank",
              skillId: String(predecessor.predecessor_skill_id),
              rank: Number(predecessor.rank),
            }),
      );
    if (Number(skill.tier ?? 0) > 0)
      parts.push(
        predicate({
          kind: "skill_tier_choice",
          skillId: skill.id,
          tier: Number(skill.tier),
          defaultRank: skill.learn_default ? 1 : 0,
        }),
      );
    add(`skill:${skill.id}`, "learn", parts);
  }
  for (const quest of rows.entities.quests ?? []) {
    const parts: RequirementExpression[] = [];
    threshold(parts, quest, "level_required", "level");
    threshold(
      parts,
      quest,
      "veteran_level_recommended",
      "total_veteran_points",
    );
    for (const [table, kind] of [
      ["quest_class_requirements", "class"],
      ["quest_race_requirements", "race"],
    ] as const) {
      const alternatives = matching(table, "quest_id", quest.id)
        .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
        .map((row) =>
          row.withheld
            ? withheld()
            : predicate({
                kind: "identity_is",
                identityKind: kind,
                id: String(row[`${kind}_id`]),
              }),
        );
      if (alternatives.length) parts.push(combine("any", alternatives));
    }
    const predecessors = matching("quest_predecessors", "quest_id", quest.id)
      .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
      .map((row) =>
        row.withheld
          ? withheld()
          : predicate({
              kind: "quest_state",
              questId: String(row.predecessor_quest_id),
              state: "completed",
            }),
      );
    if (predecessors.length) parts.push(combine("any", predecessors));
    for (const faction of matching(
      "quest_faction_requirements",
      "quest_id",
      quest.id,
    ))
      parts.push(
        faction.withheld
          ? withheld()
          : predicate({
              kind: "faction_at_least",
              factionId: String(faction.faction_id),
              standing: Number(faction.standing),
            }),
      );
    parts.push(
      predicate({
        kind: "quest_state",
        questId: quest.id,
        state: "not_active",
      }),
    );
    // Source: server-scripts/PlayerQuests.cs:220-253.
    if (!quest.is_adventurer_quest && !quest.is_repeatable)
      parts.push(
        predicate({
          kind: "quest_state",
          questId: quest.id,
          state: "not_completed",
        }),
      );
    if (quest.is_adventurer_quest)
      parts.push(
        predicate({
          kind: "quest_cycle",
          questId: quest.id,
          cycle: "currently_offered",
        }),
      );
    if (quest.is_adventurer_quest || quest.is_repeatable)
      parts.push(
        predicate({
          kind: "quest_cycle",
          questId: quest.id,
          cycle: quest.is_adventurer_quest ? "daily_24h" : "repeat_8h",
        }),
      );
    add(`quest:${quest.id}`, "accept", parts);
    const objectives: RequirementExpression[] = [];
    for (const objective of matching(
      "quest_objectives",
      "quest_id",
      quest.id,
    ).sort((a, b) => Number(a.ordinal) - Number(b.ordinal))) {
      if (objective.role === "tracking_location") continue;
      if (objective.withheld) {
        objectives.push(withheld());
        continue;
      }
      const role = String(objective.role);
      const amount = Number(objective.amount ?? 1);
      if (
        role === "inventory_primary" ||
        role === "inventory_secondary" ||
        role === "equipped"
      ) {
        const child = matching("quest_objective_items", "id", objective.id)[0];
        if (!child?.item_id) {
          objectives.push(withheld());
          continue;
        }
        const itemId = String(child.item_id);
        if (role === "equipped")
          objectives.push(
            predicate({
              kind: "item_count",
              itemId,
              location: "equipment",
              amount,
            }),
          );
        else {
          const branches = [
            predicate({
              kind: "item_count",
              itemId,
              location: "inventory",
              amount,
            }),
            predicate({
              kind: "item_count",
              itemId,
              location: "keyring",
              amount: 1,
            }),
          ];
          if (role === "inventory_secondary")
            branches.push(
              predicate({
                kind: "item_count",
                itemId,
                location: "equipment",
                amount: 1,
              }),
            );
          objectives.push(combine("any", branches));
        }
      } else {
        const counters: Record<
          string,
          "kill" | "gather" | "brew" | "location"
        > = {
          kill_counter: "kill",
          gather_counter: "gather",
          brew_counter: "brew",
          location_visit: "location",
        };
        const counterKind = counters[role];
        if (!counterKind)
          dataError(objective.id, `unsupported objective role ${role}`);
        objectives.push(
          predicate({
            kind: "quest_progress",
            questId: quest.id,
            objectiveId: objective.id,
            counterKind,
            amount: counterKind === "location" ? 1 : amount,
          }),
        );
      }
    }
    add(`quest:${quest.id}`, "fulfill", objectives);
    add(`quest:${quest.id}`, "complete", [
      predicate({ kind: "quest_state", questId: quest.id, state: "active" }),
      ...objectives,
    ]);
  }
  for (const portal of rows.entities.portals ?? []) {
    const parts: RequirementExpression[] = [];
    threshold(parts, portal, "level_required", "level");
    threshold(parts, portal, "item_level_required", "equipped_item_level");
    if (portal.required_item_withheld) parts.push(withheld());
    else if (typeof portal.required_item_id === "string") {
      const own = combine("any", [
        predicate({
          kind: "item_count",
          itemId: portal.required_item_id,
          location: "inventory",
          amount: 1,
        }),
        predicate({
          kind: "item_count",
          itemId: portal.required_item_id,
          location: "keyring",
          amount: 1,
        }),
      ]);
      parts.push(
        portal.requires_everyone_key
          ? own
          : combine("any", [
              own,
              predicate(
                {
                  kind: "party_key",
                  itemId: portal.required_item_id,
                  onlineOnly: true,
                },
                "permitted_party",
              ),
            ]),
      );
    }
    if (portal.need_monster_dead_withheld) parts.push(withheld());
    else if (typeof portal.need_monster_dead_spawn_id === "string")
      parts.push(
        predicate(
          {
            kind: "current_monster_dead",
            monsterSpawnId: portal.need_monster_dead_spawn_id,
          },
          "current_world",
        ),
      );
    add(`portal:${portal.id}`, "enter", parts);
  }
  for (const resource of rows.entities.gathering_resources ?? []) {
    const parts: RequirementExpression[] = [];
    const profession = resource.is_mineral
      ? "mining"
      : resource.is_fishing_spot
        ? "fishing"
        : resource.is_plant
          ? "herbalism"
          : null;
    if (profession)
      parts.push(
        predicate({
          kind: "profession_floor",
          profession,
          tier: Number(resource.level ?? 0),
        }),
      );
    if (resource.tool_required_withheld) parts.push(withheld());
    if (resource.is_mineral || resource.is_fishing_spot)
      parts.push(
        predicate({
          kind: "usable_tool",
          category: resource.is_mineral ? "Pickaxe" : "Fishing Rod",
          requiresDurability: true,
        }),
      );
    add(`resource:${resource.id}`, "attempt", parts);
  }
  for (const trigger of rows.entities.summon_triggers ?? []) {
    const parts: RequirementExpression[] = [];
    for (const guard of matching(
      "summon_trigger_placeholders",
      "trigger_id",
      trigger.id,
    ).sort(
      (a, b) => Number(a.placeholder_order) - Number(b.placeholder_order),
    )) {
      parts.push(
        guard.withheld
          ? predicate(
              { kind: "withheld", reason: "unpublished_target" },
              "current_world",
            )
          : predicate(
              {
                kind: "current_monster_dead",
                monsterSpawnId: String(guard.spawn_id),
              },
              "current_world",
            ),
      );
    }
    parts.push(
      predicate(
        { kind: "event_ready", triggerId: trigger.id },
        "current_world",
      ),
    );
    add(`summon_trigger:${trigger.id}`, "activate", parts, "current_world");
  }
  return result;
}
