import type {
  AcquisitionBranch,
  AcquisitionModel,
  AcquisitionQuery,
  AcquisitionTree,
  EvaluatedQuantity,
} from "./types";
import { queryAcquisitionRows } from "./queries";
import { assembleAcquisitionModel } from "./assemble";
import { projectAcquisitionNames, projectItemSources } from "./projections";

export async function expandAcquisition(
  execute: AcquisitionQuery,
  request: {
    itemId: string;
    amount: number;
    maxDepth: number;
    maxNodes: number;
    rootRecipeMethodIds?: readonly string[];
  },
): Promise<AcquisitionTree> {
  if (
    !request.itemId ||
    !Number.isSafeInteger(request.amount) ||
    request.amount < 1
  )
    throw new RangeError(
      "Acquisition request needs an item and positive integer amount",
    );
  if (
    !Number.isInteger(request.maxDepth) ||
    request.maxDepth < 0 ||
    !Number.isInteger(request.maxNodes) ||
    request.maxNodes < 1
  )
    throw new RangeError("Invalid acquisition expansion limits");

  const byItem = new Map<string, AcquisitionModel>();
  let rootRecipeModel: AcquisitionModel | undefined;
  const names: Record<string, string> = Object.create(null);
  const methodsFor = (
    model: AcquisitionModel,
    itemId: string,
    depth: number,
  ) =>
    depth === 0 && request.rootRecipeMethodIds !== undefined
      ? [...model.methodViews.values()].filter(
          (method) =>
            method.kind === "recipe" &&
            method.detail.declared_result_item_id === itemId &&
            request.rootRecipeMethodIds!.includes(method.methodId),
        )
      : projectItemSources(model, itemId).methods;
  let frontier = [request.itemId];
  let loaded = 0;
  // Batch each sibling frontier. Direct authoritative methods are never sliced.
  for (let depth = 0; depth <= request.maxDepth && frontier.length; depth++) {
    const next = [...new Set(frontier)].filter((id) => !byItem.has(id));
    const selected = next.slice(0, Math.max(0, request.maxNodes - loaded));
    if (!selected.length) break;
    const model = assembleAcquisitionModel(
      await queryAcquisitionRows(execute, { kind: "items", itemIds: selected }),
    );
    if (depth === 0 && request.rootRecipeMethodIds !== undefined)
      rootRecipeModel = model;
    else for (const itemId of selected) byItem.set(itemId, model);
    Object.assign(names, projectAcquisitionNames(model));
    loaded += selected.length;
    frontier = [];
    for (const itemId of selected) {
      for (const method of methodsFor(model, itemId, depth)) {
        for (const group of method.costGroups) {
          for (const input of group.inputs) {
            if (input.item_id && !input.withheld) frontier.push(input.item_id);
          }
        }
      }
    }
  }
  Object.freeze(names);

  let displayedNodes = 0;
  function build(
    itemId: string,
    amount: number,
    depth: number,
    path: ReadonlySet<string>,
    currentModel: AcquisitionModel,
  ): AcquisitionTree {
    const model =
      depth === 0 && rootRecipeModel
        ? rootRecipeModel
        : (byItem.get(itemId) ?? currentModel);
    const sources = projectItemSources(model, itemId);
    const base = {
      itemId,
      amount,
      names,
      sources,
      inspectionLink: `/items/${encodeURIComponent(itemId)}`,
    };
    if (depth > request.maxDepth)
      return { ...base, branches: [], reason: "depth_limit" };
    if (!byItem.has(itemId) && !(depth === 0 && rootRecipeModel))
      return { ...base, branches: [], reason: "node_limit" };
    if (displayedNodes >= request.maxNodes)
      return { ...base, branches: [], reason: "node_limit" };
    displayedNodes++;
    const branches: AcquisitionBranch[] = [];
    for (const method of methodsFor(model, itemId, depth)) {
      const pair = `${itemId}:${method.methodId}`;
      const cyclicMethod = path.has(pair);
      const nextPath = new Set(path);
      nextPath.add(pair);
      const outputs = method.outputs.filter(
        (output) => output.item_id === itemId && !output.withheld,
      );
      const outcomeProbabilities = method.probabilityResults.filter(
        (result) =>
          result.target.kind === "item" && result.target.itemId === itemId,
      );
      const requiresKnownSuccess =
        ["kill", "gather", "world_chest", "portable_chest"].includes(
          method.kind,
        ) ||
        (method.kind === "recipe" &&
          ["alchemy", "cooking", "scribing"].includes(method.ruleId) &&
          Number(method.detail.tier) > 0);
      const deterministic =
        outputs.length > 0 &&
        outputs.every(
          (output) =>
            output.quantity.kind === "exact" && output.condition_slot === null,
        ) &&
        outcomeProbabilities.every((result) => result.probability === 1) &&
        (!requiresKnownSuccess || outcomeProbabilities.length > 0);
      // Recipe-root mode plans executions of the declared recipe, including
      // packs delivered as contents. It does not advertise a carried-pack yield.
      const perAction =
        depth === 0 &&
        request.rootRecipeMethodIds !== undefined &&
        (!requiresKnownSuccess || deterministic)
          ? Number(method.detail.result_amount)
          : deterministic
            ? outputs.reduce(
                (total, output) =>
                  total +
                  (output.quantity.kind === "exact"
                    ? output.quantity.value
                    : 0),
                0,
              )
            : null;
      const requiredExecutions =
        perAction !== null && perAction > 0
          ? Math.ceil(amount / perAction)
          : null;
      const plannedExecutions =
        requiredExecutions === null
          ? null
          : method.repeatability.kind === "repeatable"
            ? requiredExecutions
            : method.repeatability.kind === "once_per_character"
              ? Math.min(1, requiredExecutions)
              : null;
      const uncoveredAmount =
        plannedExecutions !== null && perAction !== null
          ? Math.max(0, amount - plannedExecutions * perAction)
          : null;
      const yieldedAmount: EvaluatedQuantity =
        plannedExecutions !== null && perAction !== null
          ? { kind: "exact", value: plannedExecutions * perAction }
          : perAction !== null
            ? { kind: "exact", value: perAction }
            : { kind: "unknown" };
      const ingredients: AcquisitionBranch["ingredients"][number][] = [];
      for (const group of method.costGroups) {
        for (const input of group.inputs) {
          const count: EvaluatedQuantity =
            group.quantity_rule === "all_carried"
              ? { kind: "unknown" }
              : {
                  kind: "exact",
                  value: input.amount * (plannedExecutions ?? 1),
                };
          let acquisition: AcquisitionTree | null = null;
          if (input.item_id && !input.withheld && !cyclicMethod) {
            const ingredientAmount =
              count.kind === "exact" ? count.value : input.amount;
            const nextModel = byItem.get(input.item_id) ?? model;
            const ingredientSources = projectItemSources(
              nextModel,
              input.item_id,
            );
            const cyclic =
              ingredientSources.methods.length > 0 &&
              ingredientSources.methods.every((candidate) =>
                nextPath.has(`${input.item_id}:${candidate.methodId}`),
              );
            if (cyclic)
              acquisition = {
                itemId: input.item_id,
                amount: ingredientAmount,
                names,
                sources: ingredientSources,
                branches: [],
                reason: "cycle",
                inspectionLink: `/items/${encodeURIComponent(input.item_id)}`,
              };
            else
              acquisition = build(
                input.item_id,
                ingredientAmount,
                depth + 1,
                nextPath,
                nextModel,
              );
          }
          ingredients.push({ input, amount: count, acquisition });
        }
      }
      branches.push({
        method,
        requestedAmount: amount,
        yieldedAmount,
        batches: requiredExecutions,
        repeatability: method.repeatability,
        requiredExecutions,
        plannedExecutions,
        uncoveredAmount,
        availability: "not_evaluated",
        ingredients,
        ...(cyclicMethod ? { reason: "cycle" as const } : {}),
      });
    }
    if (!branches.length && sources.methods.length)
      return { ...base, branches, reason: "cycle" };
    return { ...base, branches };
  }
  return build(
    request.itemId,
    request.amount,
    0,
    new Set(),
    rootRecipeModel ?? byItem.get(request.itemId)!,
  );
}
