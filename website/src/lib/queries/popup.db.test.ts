import Database from "better-sqlite3";
import { afterAll, describe, expect, test, vi } from "vitest";
import {
  loadAltarPopupDetails,
  loadMonsterPopupDetails,
  loadChestPopupDetails,
  loadGatheringPopupDetails,
  loadItemPopupDetails,
  loadNpcPopupDetails,
  loadQuestPopupDetails,
  loadQuestPopupDetailsBatch,
  loadProviderPopupDetails,
  loadRequirementPopupDetails,
} from "./popup";
import { loadBrowserAcquisition, itemMapLocations } from "$lib/map/acquisition";
import { getItemMapBounds } from "./map-search";
import { resolveVirtualSelection } from "$lib/map/resolve-selection";
import type { MethodView } from "$lib/acquisition/types";
import { projectItemSources } from "$lib/acquisition/projections";

// The real SQL adapter needs no spy that retains every result graph.
vi.mock("$lib/db", () => ({
  query: async (sql: string, params: unknown[] = []) =>
    db.prepare(sql).all(...params),
}));
const db = new Database("data/compendium.db", { readonly: true });
afterAll(() => db.close());

function itemTargets(method: MethodView): string[] {
  return [
    ...new Set([
      ...method.outputs.flatMap((output) =>
        output.item_id ? [output.item_id] : [],
      ),
      ...method.probabilityResults.flatMap((result) =>
        result.target.kind === "item" ? [result.target.itemId] : [],
      ),
    ]),
  ];
}

describe("canonical browser popup acquisition", () => {
  test("arrow-pack offers retain inspection without inventing carried-pack delivery", async () => {
    const details = await loadItemPopupDetails("pack_25_arrows");
    expect(details).not.toBeNull();
    expect(details!.sources.inspection.offeredAssets.length).toBeGreaterThan(0);
    const offers = details!.sources.inspection.offeredAssets.filter(
      (method) => method.kind === "vendor",
    );
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(
        offer.outputs.some(
          (output) => output.item_id === "arrow" && output.amount_min === 25,
        ),
      ).toBe(true);
      expect(
        offer.outputs.some((output) => output.item_id === "pack_25_arrows"),
      ).toBe(false);
    }
    expect(
      details!.sources.inspection.fixedContents.some(
        (outcome) =>
          outcome.itemId === "arrow" &&
          outcome.amount.kind === "exact" &&
          outcome.amount.value === 25,
      ),
    ).toBe(true);
    expect(
      details!.locations.some((location) => location.purpose === "offer"),
    ).toBe(true);
    expect(
      details!.locations.some((location) => location.purpose === "award"),
    ).toBe(false);
  });

  test("provider and item popups retain the same outcome-associated probabilities", async () => {
    const sources = db
      .prepare(
        `SELECT d.id method_id,d.chest_id,o.item_id FROM acquisition_world_chest_details d JOIN acquisition_outputs o ON o.method_id=d.id WHERE o.item_id IS NOT NULL ORDER BY d.id,o.ordinal LIMIT 8`,
      )
      .all() as { method_id: string; chest_id: string; item_id: string }[];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      const chest = await loadChestPopupDetails(source.chest_id);
      const item = await loadItemPopupDetails(source.item_id);
      const method = chest.methods.find(
        (m) => m.methodId === source.method_id,
      )!;
      expect(method).toBeDefined();
      expect(
        item!.sources.methods.find((m) => m.methodId === method.methodId)
          ?.probabilityResults,
      ).toEqual(method.probabilityResults);
      expect(
        method.costGroups.every(
          (group) =>
            group.selection_rule !== "always" ||
            group.inputs.every((input) => input.role !== "key"),
        ),
      ).toBe(true);
    }
  });

  test("every popup provider family loads complete methods rather than grouped source summaries", async () => {
    for (const [table, kind] of [
      ["acquisition_providers_resource_spawns", "resource_spawns"],
      ["acquisition_providers_crafting_stations", "crafting_stations"],
      ["acquisition_providers_alchemy_tables", "alchemy_tables"],
      ["acquisition_providers_scribing_tables", "scribing_tables"],
      ["acquisition_providers_altars", "altars"],
    ] as const) {
      const column = {
        resource_spawns: "resource_spawn_id",
        crafting_stations: "crafting_station_id",
        alchemy_tables: "alchemy_table_id",
        scribing_tables: "scribing_table_id",
        altars: "altar_id",
      }[kind];
      const row = db
        .prepare(
          `SELECT ${column} id,method_id FROM ${table} ORDER BY id LIMIT 1`,
        )
        .get() as { id: string; method_id: string } | undefined;
      expect(row, kind).toBeDefined();
      const details =
        kind === "resource_spawns"
          ? await loadGatheringPopupDetails(row!.id)
          : kind === "altars"
            ? await loadAltarPopupDetails(row!.id)
            : await loadProviderPopupDetails({ kind, id: row!.id });
      expect(
        details.methods.some((method) => method.methodId === row!.method_id),
      ).toBe(true);
    }
  });

  test("an authored monster popup does not combine other placement contexts", async () => {
    const row = db
      .prepare(
        `SELECT p.monster_spawn_id,d.monster_id,ms.level FROM acquisition_providers_monster_spawns p JOIN acquisition_kill_details d ON d.id=p.method_id JOIN monster_spawns ms ON ms.id=p.monster_spawn_id WHERE d.event_kind='authored' ORDER BY p.id LIMIT 1`,
      )
      .get() as { monster_spawn_id: string; monster_id: string; level: number };
    expect(row).toBeDefined();
    const details = await loadMonsterPopupDetails(
      row.monster_id,
      row.level,
      row.monster_spawn_id,
    );
    expect(details.methods.length).toBeGreaterThan(0);
    expect(
      details.methods.every((method) =>
        method.providers.some(
          (provider) =>
            provider.ref.kind === "monster_spawns" &&
            provider.ref.id === row.monster_spawn_id,
        ),
      ),
    ).toBe(true);
    const itemIds = [...new Set(details.methods.flatMap(itemTargets))];
    const model = await loadBrowserAcquisition({ kind: "items", itemIds });
    for (const method of details.methods) {
      const targets = itemTargets(method);
      for (const id of targets)
        if (method.rooted)
          expect(
            projectItemSources(model, id).methods.some(
              (source) => source.methodId === method.methodId,
            ),
          ).toBe(true);
      if (method.rooted && targets.length) {
        const item = await loadItemPopupDetails(targets[0]);
        expect(
          item!.sources.methods.some(
            (source) => source.methodId === method.methodId,
          ),
        ).toBe(true);
      }
    }
  });

  test("a placeholder event marker retains only its own context", async () => {
    const row = db
      .prepare(
        `SELECT d.id,d.monster_id,m.level FROM acquisition_kill_details d JOIN monsters m ON m.id=d.monster_id WHERE d.event_kind='placeholder' ORDER BY d.id LIMIT 1`,
      )
      .get() as {
      id: string;
      monster_id: string;
      level: number;
    };
    expect(row).toBeDefined();
    const details = await loadMonsterPopupDetails(
      row.monster_id,
      row.level,
      row.id,
    );
    expect(details.methods.map((method) => method.methodId)).toEqual([row.id]);
    expect(details.methods[0].detail.event_kind).toBe("placeholder");
  });

  test("quest objectives preserve counter, inventory, equipment and non-counting location facts", async () => {
    const rows = db
      .prepare(
        `SELECT id,quest_id,kind,role,amount,withheld FROM quest_objectives ORDER BY quest_id,ordinal`,
      )
      .all() as {
      id: string;
      quest_id: string;
      kind: string;
      role: string;
      amount: number | null;
      withheld: number;
    }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.some((row) => row.kind === "location" && row.amount === null),
    ).toBe(true);
    const ids = [...new Set(rows.map((row) => row.quest_id))];
    const popups = await loadQuestPopupDetailsBatch(ids);
    for (const id of ids) {
      const details = popups.get(id);
      for (const objective of rows.filter((row) => row.quest_id === id))
        expect(details!.objectives).toContainEqual(
          expect.objectContaining({
            id: objective.id,
            kind: objective.kind,
            role: objective.role,
            amount: objective.amount,
            withheld: Boolean(objective.withheld),
          }),
        );
    }
  });

  test("quest discovery geometry converts to map coordinates only at the popup boundary", async () => {
    const row = db
      .prepare(
        `SELECT o.quest_id,l.id,l.position_x,l.position_y FROM quest_objective_locations l JOIN quest_objectives o ON o.id=l.id WHERE o.withheld=0 AND l.position_x IS NOT NULL AND l.position_y IS NOT NULL LIMIT 1`,
      )
      .get() as {
      quest_id: string;
      id: string;
      position_x: number;
      position_y: number;
    };
    expect(row).toBeDefined();
    const details = await loadQuestPopupDetails(row.quest_id);
    expect(details!.objectives.find((o) => o.id === row.id)?.position).toEqual([
      row.position_x,
      -row.position_y,
    ]);
  });

  test("NPC skills preserve authored order and all exact quest memberships", async () => {
    const row = db
      .prepare(`SELECT npc_id FROM npc_skills ORDER BY npc_id LIMIT 1`)
      .get() as { npc_id: string };
    expect(row).toBeDefined();
    const details = await loadNpcPopupDetails(row.npc_id);
    const skills = db
      .prepare(
        `SELECT skill_id id,skill_index 'index' FROM npc_skills WHERE npc_id=? ORDER BY skill_index`,
      )
      .all(row.npc_id);
    expect(details.skills.map(({ id, index }) => ({ id, index }))).toEqual(
      skills,
    );
    const memberships = db
      .prepare(
        `SELECT quest_id id,role FROM npc_quest_memberships WHERE npc_id=? ORDER BY role,ordinal`,
      )
      .all(row.npc_id);
    expect(details.quests.map(({ id, role }) => ({ id, role }))).toEqual(
      memberships,
    );
  });

  test("withheld portal destinations retain their origin even without an access gate", async () => {
    const id = "iportal_northern_wastes_to_old_valorath_620_1272";
    const native = db
      .prepare(
        `SELECT id,required_item_id,from_zone_id,position_x,position_y,destination_withheld,to_zone_id FROM portals WHERE id=?`,
      )
      .get(id) as {
      id: string;
      required_item_id: string | null;
      from_zone_id: string;
      position_x: number;
      position_y: number;
      destination_withheld: number;
      to_zone_id: null;
    };
    const popup = await loadRequirementPopupDetails("portal", id);
    const portal = popup.model.entities.get("portals")?.get(id);
    expect(portal).toMatchObject(native);
    expect(portal?.destination_withheld).toBe(1);
    expect(portal?.to_zone_id).toBeNull();
    expect(typeof portal?.position_x).toBe("number");
    expect(typeof portal?.position_y).toBe("number");
    expect(typeof portal?.from_zone_id).toBe("string");
  });

  test("treasure-map destinations remain use geometry, never map awards", async () => {
    const row = db
      .prepare(
        `SELECT map_item_id FROM acquisition_treasure_details WHERE map_item_id IS NOT NULL LIMIT 1`,
      )
      .get() as { map_item_id: string };
    expect(row).toBeDefined();
    const map = await loadItemPopupDetails(row.map_item_id);
    expect(map!.usages.some((use) => use.useLocations.length > 0)).toBe(true);
    expect(
      map!.sources.methods.every((method) => method.kind !== "treasure_dig"),
    ).toBe(true);
    const model = await loadBrowserAcquisition({
      kind: "items",
      itemIds: [row.map_item_id],
    });
    const positions = itemMapLocations(model, row.map_item_id).map(
      (location) => location.position!,
    );
    const bounds = await getItemMapBounds(row.map_item_id);
    if (positions.length)
      expect(bounds).toEqual({
        minX: Math.min(...positions.map((p) => p.x)),
        maxX: Math.max(...positions.map((p) => p.x)),
        minY: Math.min(...positions.map((p) => p.y)),
        maxY: Math.max(...positions.map((p) => p.y)),
      });
  });

  test("virtual-only and unknown items have no map focus", async () => {
    expect(await getItemMapBounds("__unknown_public_item__")).toBeNull();
    expect(
      (await resolveVirtualSelection("item", "__unknown_public_item__"))
        .highlight,
    ).toBeNull();
    expect(await loadItemPopupDetails("__unknown_public_item__")).toBeNull();
  });
});
