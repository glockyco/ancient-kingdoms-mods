import type {
  AcquisitionQuery,
  AcquisitionModel,
  AcquisitionTree,
  MethodView,
} from "./types";

export interface AcquisitionItem {
  name: string;
  quality: number;
  icon_path: string | null;
  tooltip_html: string | null;
}

export async function loadAcquisitionItems(
  execute: AcquisitionQuery,
  value: AcquisitionModel | AcquisitionTree,
): Promise<Record<string, AcquisitionItem>> {
  const ids = new Set<string>();
  const visitMethod = (method: MethodView) => {
    for (const output of method.outputs)
      if (output.item_id) ids.add(output.item_id);
    for (const group of method.costGroups)
      for (const input of group.inputs)
        if (input.item_id) ids.add(input.item_id);
    for (const result of method.probabilityResults)
      if (result.target.kind === "item") ids.add(result.target.itemId);
    for (const home of method.homeProviders)
      if (typeof home.structure_item_id === "string")
        ids.add(home.structure_item_id);
    if (method.setupMethod) visitMethod(method.setupMethod);
  };
  if ("rows" in value) {
    for (const item of value.rows.entities.items ?? []) ids.add(item.id);
    for (const method of value.methodViews.values()) visitMethod(method);
    for (const entry of value.rows.poolEntries)
      if (entry.item_id) ids.add(entry.item_id);
  } else {
    const visit = (tree: AcquisitionTree) => {
      ids.add(tree.itemId);
      for (const method of tree.sources.methods) visitMethod(method);
      for (const branch of tree.branches) {
        visitMethod(branch.method);
        for (const ingredient of branch.ingredients)
          if (ingredient.acquisition) visit(ingredient.acquisition);
      }
    };
    visit(value);
  }
  const result: Record<string, AcquisitionItem> = {};
  const selected = [...ids];
  for (let offset = 0; offset < selected.length; offset += 200) {
    const batch = selected.slice(offset, offset + 200);
    const rows = await execute(
      `SELECT i.id, i.name, i.quality, i.tooltip_html, v.public_path AS icon_path FROM items i LEFT JOIN visual_assets v ON v.domain = 'item' AND v.entity_id = i.id AND v.kind = 'icon' WHERE i.id IN (${batch.map(() => "?").join(",")})`,
      batch,
    );
    for (const row of rows)
      result[String(row.id)] = {
        name: String(row.name),
        quality: Number(row.quality),
        tooltip_html: row.tooltip_html as string | null,
        icon_path: row.icon_path as string | null,
      };
  }
  return result;
}
