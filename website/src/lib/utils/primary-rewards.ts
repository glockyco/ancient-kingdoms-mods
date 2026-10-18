import type {
  Delivery,
  EvaluatedQuantity,
  MethodView,
  ProbabilityResult,
} from "$lib/acquisition/types";

export interface PrimaryReward {
  resourceKind: "item" | "gold";
  itemId: string | null;
  itemName: string | null;
  withheld: boolean;
  quantity: EvaluatedQuantity;
  delivery: Delivery;
  methodIds: readonly string[];
  variants: readonly {
    methodId: string;
    outputId: string;
    quantity: EvaluatedQuantity;
  }[];
}

function totalQuantity(
  quantities: readonly EvaluatedQuantity[],
): EvaluatedQuantity {
  let min = 0;
  let max: number | null = 0;
  for (const quantity of quantities) {
    if (quantity.kind === "unknown") return { kind: "unknown" };
    min += quantity.kind === "exact" ? quantity.value : quantity.min;
    const upper = quantity.kind === "exact" ? quantity.value : quantity.max;
    max = max === null || upper === null ? null : max + upper;
  }
  return min === max
    ? { kind: "exact", value: min }
    : { kind: "range", min, max };
}

/** Potential delivery quantities, not success probabilities or guaranteed rewards. */
export function summarizePrimaryRewards(
  methods: readonly MethodView[],
  items: Readonly<Record<string, { name: string }>>,
): PrimaryReward[] {
  const exactMethods = [
    ...new Map(methods.map((method) => [method.methodId, method])).values(),
  ];
  const groups = new Map<string, PrimaryReward>();
  for (const method of exactMethods) {
    for (const output of method.outputs) {
      if (output.yield_rule === "pool") continue;
      const key = JSON.stringify([
        output.resource_kind,
        output.item_id,
        output.delivery,
        !!output.withheld,
      ]);
      let reward = groups.get(key);
      if (!reward) {
        reward = {
          resourceKind: output.resource_kind,
          itemId: output.item_id,
          itemName: output.item_id
            ? (items[output.item_id]?.name ?? null)
            : null,
          withheld: !!output.withheld,
          quantity: { kind: "unknown" },
          delivery: output.delivery,
          methodIds: [],
          variants: [],
        };
        groups.set(key, reward);
      }
      (
        reward.variants as {
          methodId: string;
          outputId: string;
          quantity: EvaluatedQuantity;
        }[]
      ).push({
        methodId: method.methodId,
        outputId: output.id,
        quantity: output.quantity,
      });
    }
  }
  for (const reward of groups.values()) {
    const perMethod = new Map<string, EvaluatedQuantity[]>();
    for (const variant of reward.variants) {
      const quantities = perMethod.get(variant.methodId) ?? [];
      quantities.push(variant.quantity);
      perMethod.set(variant.methodId, quantities);
    }
    reward.methodIds = [...perMethod.keys()];
    const totals = exactMethods.map((method) =>
      totalQuantity(perMethod.get(method.methodId) ?? []),
    );
    if (totals.some((quantity) => quantity.kind === "unknown")) {
      reward.quantity = { kind: "unknown" };
      continue;
    }
    let min = Infinity;
    let max: number | null = 0;
    for (const quantity of totals) {
      if (quantity.kind === "unknown") continue;
      min = Math.min(
        min,
        quantity.kind === "exact" ? quantity.value : quantity.min,
      );
      const upper = quantity.kind === "exact" ? quantity.value : quantity.max;
      max = max === null || upper === null ? null : Math.max(max, upper);
    }
    reward.quantity =
      min === max ? { kind: "exact", value: min } : { kind: "range", min, max };
  }
  return [...groups.values()];
}

/** A scalar rate is valid only when every exact method agrees on the same outcome. */
export function commonItemProbability(
  methods: readonly MethodView[],
  itemId: string,
  event: ProbabilityResult["event"],
): number | null {
  let common: ProbabilityResult | undefined;
  for (const method of methods) {
    const results = method.probabilityResults.filter(
      (result) =>
        result.event === event &&
        result.target.kind === "item" &&
        result.target.itemId === itemId,
    );
    if (results.length !== 1 || results[0].probability === null) return null;
    const result = results[0];
    if (
      common &&
      (common.probability !== result.probability ||
        common.target.delivery !== result.target.delivery)
    )
      return null;
    common = result;
  }
  return common?.probability ?? null;
}
