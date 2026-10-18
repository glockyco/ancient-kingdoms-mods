import type {
  AcquisitionQuery,
  AcquisitionRequest,
  AcquisitionModel,
  ItemSourceView,
  ItemUseView,
} from "../acquisition/types";
import { queryAcquisitionRows } from "../acquisition/queries";
import { assembleAcquisitionModel } from "../acquisition/assemble";
import {
  projectItemSources,
  projectItemUsages,
} from "../acquisition/projections";

export async function loadAcquisition(
  execute: AcquisitionQuery,
  request: AcquisitionRequest,
): Promise<AcquisitionModel> {
  return assembleAcquisitionModel(await queryAcquisitionRows(execute, request));
}

export async function loadItemAcquisition(
  execute: AcquisitionQuery,
  itemIds: readonly string[],
): Promise<{
  model: AcquisitionModel;
  sources: Record<string, ItemSourceView>;
  usages: Record<string, readonly ItemUseView[]>;
}> {
  const ids = [...new Set(itemIds)];
  const model = await loadAcquisition(execute, { kind: "items", itemIds: ids });
  return {
    model,
    sources: Object.fromEntries(
      ids.map((id) => [id, projectItemSources(model, id)]),
    ),
    usages: Object.fromEntries(
      ids.map((id) => [id, projectItemUsages(model, id)]),
    ),
  };
}
