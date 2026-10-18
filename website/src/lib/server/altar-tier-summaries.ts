import type {
  MethodView,
  OutputView,
  ProbabilityResult,
  RequirementRoot,
} from "$lib/acquisition/types";

export const isAltarTierRoot = (root: RequirementRoot) =>
  root.expression.kind === "predicate" &&
  root.expression.predicate.kind === "altar_tier";

function withoutFields<T extends object, K extends keyof T>(
  value: T,
  fields: readonly K[],
): Omit<T, K> {
  const result = { ...value };
  for (const field of fields) delete result[field];
  return result;
}

export function altarOutcomeSemantics(
  method: MethodView,
  outputs: readonly OutputView[],
  probabilities: readonly ProbabilityResult[],
) {
  const context = withoutFields(method.detail, ["id", "loot_pool_id"]);
  return {
    context,
    rule: method.ruleId,
    phase: method.phase,
    setup: method.setupMethod?.methodId,
    providers: method.providers.map(
      ({ location, requirements, ...provider }) => ({
        ...provider,
        requirements: requirements.filter((root) => !isAltarTierRoot(root)),
        location: location ? withoutFields(location, ["methodIds"]) : null,
      }),
    ),
    costs: method.costGroups,
    effects: method.effects,
    repeatability: method.repeatability,
    requirements: method.requirements.filter((root) => !isAltarTierRoot(root)),
    outputs: outputs.map((output) => ({
      ...withoutFields(output, ["id", "method_id", "requirements"]),
      requirements: output.requirements.filter(
        (root) => !isAltarTierRoot(root),
      ),
    })),
    probabilities: probabilities.map((result) => ({
      ...withoutFields(result, ["methodId", "outcomeKey", "assumptions"]),
      assumptions: withoutFields(result.assumptions, ["altarTier"]),
    })),
  };
}

export function consolidateAltarTiers<T>(
  values: readonly T[],
  methodFor: (value: T) => MethodView,
  semanticsFor: (value: T) => unknown,
): Array<{ value: T; acrossTiers: boolean; variants: readonly T[] }> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const method = methodFor(value);
    if (method.ruleId !== "altar_final_loot") continue;
    const key = JSON.stringify(semanticsFor(value));
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  const shared = new Map<T, readonly T[]>();
  const omitted = new Set<T>();
  for (const group of groups.values()) {
    const tiers = group.map((value) => {
      const roots = methodFor(value).requirements.filter(isAltarTierRoot);
      const expression = roots.length === 1 ? roots[0].expression : null;
      return expression?.kind === "predicate" &&
        expression.predicate.kind === "altar_tier"
        ? expression.predicate.tier
        : null;
    });
    // Only a complete set of equivalent tier outcomes is unrestricted by tier.
    // Partial sets and every conditional reward retain their original contexts.
    if (
      group.length === 4 &&
      !tiers.includes(null) &&
      new Set(tiers).size === 4
    ) {
      shared.set(group[0], group);
      for (const value of group.slice(1)) omitted.add(value);
    }
  }
  return values.flatMap((value) =>
    omitted.has(value)
      ? []
      : [
          {
            value,
            acrossTiers: shared.has(value),
            variants: shared.get(value) ?? [value],
          },
        ],
  );
}
