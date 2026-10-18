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
} from "./popup";
import { loadBrowserAcquisition, itemMapLocations } from "$lib/map/acquisition";
import { getItemMapBounds } from "./map-search";
import { resolveVirtualSelection } from "$lib/map/resolve-selection";
import {
  BASELINE_ASSUMPTIONS,
  calculateMethodProbabilities,
} from "$lib/acquisition/rules";
import { getMonsterSources } from "$lib/server/item-sources";

vi.mock("$lib/db", () => ({
  query: async (sql: string, params: unknown[] = []) =>
    db.prepare(sql).all(...params),
}));
const db = new Database("data/compendium.db", { readonly: true });
afterAll(() => db.close());

describe("compact map popups on canonical acquisition", () => {
  test("pack vendors deliver arrows while NPC and pack popups list the offered pack", async () => {
    const arrows = await loadItemPopupDetails("arrow");
    const pack = await loadItemPopupDetails("pack_25_arrows");
    expect(arrows).not.toBeNull();
    expect(pack).not.toBeNull();
    const offers = db
      .prepare(
        `SELECT d.npc_id FROM acquisition_vendor_details d JOIN acquisition_outputs o ON o.method_id=d.id WHERE d.offered_item_id='pack_25_arrows' AND d.season='none' AND o.item_id='arrow'`,
      )
      .all() as { npc_id: string }[];
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(arrows!.vendors).toContainEqual(
        expect.objectContaining({ npcId: offer.npc_id, resultAmount: 25 }),
      );
      expect(pack!.vendors).toContainEqual(
        expect.objectContaining({ npcId: offer.npc_id, resultAmount: null }),
      );
      const npc = await loadNpcPopupDetails(offer.npc_id);
      expect(npc.itemsSold).toContainEqual(
        expect.objectContaining({ itemId: "pack_25_arrows" }),
      );
      expect(npc.itemsSold).not.toContainEqual(
        expect.objectContaining({ itemId: "arrow" }),
      );
    }
  });

  test("the Northern Wastes mummy cannot advertise a dungeon fragment", async () => {
    const spawn = db
      .prepare("SELECT monster_id,level FROM monster_spawns WHERE id=?")
      .get("ancient_mummy_northern_wastes_569_1261") as {
      monster_id: string;
      level: number;
    };
    expect(spawn).toBeDefined();
    const popup = await loadMonsterPopupDetails(
      spawn.monster_id,
      spawn.level,
      "ancient_mummy_northern_wastes_569_1261",
    );
    expect(
      popup.drops.some(
        (drop) => drop.itemId === "vanishing_fatecharm_fragment",
      ),
    ).toBe(false);
    const fragment = await loadItemPopupDetails("vanishing_fatecharm_fragment");
    expect(fragment!.canFocus).toBe(true);
    const selection = await resolveVirtualSelection(
      "item",
      "vanishing_fatecharm_fragment",
    );
    expect(
      selection.highlight?.overrideGroups?.flatMap((group) => group.ids),
    ).not.toContain("ancient_mummy_northern_wastes_569_1261");
  });

  test("Ancient Key retains its complete merge group", async () => {
    const popup = await loadItemPopupDetails("ancient_key");
    expect(popup!.mergeSources.map((source) => source.itemId).sort()).toEqual([
      "ashen_key_shard",
      "cinderbound_emblem",
      "scorched_sigil_fragment",
    ]);
  });

  test("chest and item rows agree on canonical key-opening probabilities", async () => {
    const row = db
      .prepare(
        "SELECT d.id,d.chest_id,o.item_id FROM acquisition_world_chest_details d JOIN acquisition_outputs o ON o.method_id=d.id WHERE o.item_id IS NOT NULL ORDER BY d.id,o.ordinal LIMIT 1",
      )
      .get() as { id: string; chest_id: string; item_id: string };
    expect(row).toBeDefined();
    const model = await loadBrowserAcquisition({
      kind: "providers",
      providers: [{ kind: "chests", id: row.chest_id }],
    });
    const method = model.methodViews.get(row.id)!;
    const probabilities = calculateMethodProbabilities(
      model.rows,
      model.methods.get(row.id)!,
      method.detail,
      {
        assumptions: {
          ...BASELINE_ASSUMPTIONS,
          chestAccess: "key",
          professionFraction: 1,
          toolQuality: 4,
        },
      },
    );
    const expected = probabilities.find(
      (result) =>
        result.target.kind === "item" && result.target.itemId === row.item_id,
    )?.probability;
    const chest = await loadChestPopupDetails(row.chest_id);
    const item = await loadItemPopupDetails(row.item_id);
    expect(
      chest.drops.find((drop) => drop.itemId === row.item_id)?.dropRate,
    ).toBe(expected);
    expect(
      item!.chestSources.find((source) => source.chestId === row.chest_id)
        ?.rate,
    ).toBe(expected);
  });

  test("fishing popups retain bounded per-cast outcomes", async () => {
    const row = db
      .prepare(
        "SELECT gs.id FROM gathering_resource_spawns gs JOIN gathering_resources gr ON gr.id=gs.resource_id WHERE gr.is_fishing_spot=1 ORDER BY gs.id LIMIT 1",
      )
      .get() as { id: string };
    expect(row).toBeDefined();
    const popup = await loadGatheringPopupDetails(row.id);
    expect(popup.drops).toEqual([]);
    expect(
      popup.fishingOutcomes!.some((outcome) => outcome.kind === "primary_fish"),
    ).toBe(true);
    for (const outcome of popup.fishingOutcomes!) {
      expect(outcome.dropRateMin).toBeGreaterThanOrEqual(0);
      expect(outcome.dropRateMax).toBeGreaterThanOrEqual(outcome.dropRateMin);
      expect(outcome.dropRateMax).toBeLessThanOrEqual(1);
    }
  });

  test("altar reward rows come from eligible final-wave contexts", async () => {
    const row = db
      .prepare(
        "SELECT altar_id FROM acquisition_kill_details WHERE event_kind='altar_final' ORDER BY altar_id LIMIT 1",
      )
      .get() as { altar_id: string };
    expect(row).toBeDefined();
    const popup = await loadAltarPopupDetails(row.altar_id);
    expect(popup.finalMonsterIds.length).toBeGreaterThan(0);
    for (const reward of popup.rewards) {
      expect(reward.dropRate).toBeGreaterThan(0);
      const item = await loadItemPopupDetails(reward.itemId);
      expect(item!.altarSources).toContainEqual(
        expect.objectContaining({
          altarId: row.altar_id,
          tier: reward.tier,
          dropRate: reward.dropRate,
        }),
      );
    }
  });

  test("quest objectives retain normalized counter, equipment and location roles", async () => {
    const rows = db
      .prepare(
        "SELECT o.quest_id,o.kind,o.role,o.amount,q.remove_items_on_complete FROM quest_objectives o JOIN quests q ON q.id=o.quest_id WHERE o.withheld=0 AND o.kind!='brew' ORDER BY o.quest_id,o.ordinal",
      )
      .all() as {
      quest_id: string;
      kind: string;
      role: string;
      amount: number | null;
      remove_items_on_complete: number;
    }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.some((row) => row.kind === "location" && row.amount === null),
    ).toBe(true);
    const popups = await loadQuestPopupDetailsBatch([
      ...new Set(rows.map((row) => row.quest_id)),
    ]);
    for (const row of rows) {
      const type =
        row.kind === "monster"
          ? "kill"
          : row.kind === "location"
            ? "discover"
            : row.role === "gather_counter"
              ? "gather"
              : row.role === "equipped"
                ? "equip"
                : row.remove_items_on_complete
                  ? "deliver"
                  : "have";
      expect(popups.get(row.quest_id)!.objectives).toContainEqual(
        expect.objectContaining({ type, amount: row.amount ?? 1 }),
      );
    }
  });

  test("quest discovery geometry converts once at the map boundary", async () => {
    const row = db
      .prepare(
        "SELECT o.quest_id,l.position_x,l.position_y FROM quest_objective_locations l JOIN quest_objectives o ON o.id=l.id WHERE o.withheld=0 AND l.position_x IS NOT NULL AND l.position_y IS NOT NULL ORDER BY l.id LIMIT 1",
      )
      .get() as { quest_id: string; position_x: number; position_y: number };
    expect(row).toBeDefined();
    const popup = await loadQuestPopupDetails(row.quest_id);
    expect(popup!.objectives).toContainEqual(
      expect.objectContaining({
        type: "discover",
        position: [row.position_x, -row.position_y],
      }),
    );
  });

  test("quest NPCs retain every exact offer and completion membership", async () => {
    const rows = db
      .prepare(
        "SELECT DISTINCT quest_id,npc_id,role FROM npc_quest_memberships ORDER BY quest_id,npc_id,role",
      )
      .all() as { quest_id: string; npc_id: string; role: string }[];
    expect(rows.length).toBeGreaterThan(0);
    const popups = await loadQuestPopupDetailsBatch([
      ...new Set(rows.map((row) => row.quest_id)),
    ]);
    for (const row of rows)
      expect(popups.get(row.quest_id)!.npcs).toContainEqual(
        expect.objectContaining({
          npcId: row.npc_id,
          [row.role === "offer" ? "isGiver" : "isTurnIn"]: true,
        }),
      );
  });

  test("Worldheart shows the same target-specific chance on item and monster surfaces", async () => {
    const spawn = db
      .prepare(
        "SELECT id,level FROM monster_spawns WHERE monster_id='valaark' ORDER BY id LIMIT 1",
      )
      .get() as { id: string; level: number };
    expect(spawn).toBeDefined();
    const [sources, item, monster] = await Promise.all([
      getMonsterSources(db, "valaarks_worldheart"),
      loadItemPopupDetails("valaarks_worldheart"),
      loadMonsterPopupDetails("valaark", spawn.level, spawn.id, true),
    ]);
    const server = sources.find((source) => source.monster_id === "valaark")!;
    const itemDrop = item!.droppers.find(
      (source) => source.monsterId === "valaark",
    )!;
    const monsterDrop = monster.drops.find(
      (drop) => drop.itemId === "valaarks_worldheart",
    )!;
    expect(monsterDrop.dropRate).toBeCloseTo(0.063050078125, 12);
    expect(itemDrop.dropRate).toBe(monsterDrop.dropRate);
    expect(server.per_kill_chance).toBe(monsterDrop.dropRate);
    expect(itemDrop.fatecharmDropRate).toBe(monsterDrop.fatecharmDropRate);
    expect(server.per_kill_chance_with_fatecharm).toBe(
      monsterDrop.fatecharmDropRate,
    );
  });

  test("Worldheart remains selectable without revealing its suppressed placement", async () => {
    const popup = await loadItemPopupDetails("valaarks_worldheart");
    expect(
      popup!.droppers.some((dropper) => dropper.monsterId === "valaark"),
    ).toBe(true);
    expect(popup!.canFocus).toBe(false);
    expect(await getItemMapBounds("valaarks_worldheart")).toBeNull();
    const selection = await resolveVirtualSelection(
      "item",
      "valaarks_worldheart",
    );
    expect(selection.popup).toEqual({
      type: "item",
      id: "valaarks_worldheart",
    });
    expect(selection.highlight).toBeNull();
  });

  test("bounds use only visible eligible direct, offer and use locations", async () => {
    const ids = [
      "vanishing_fatecharm_fragment",
      "pack_25_arrows",
      "key_to_old_valorath",
    ];
    const model = await loadBrowserAcquisition({ kind: "items", itemIds: ids });
    for (const id of ids) {
      const locations = itemMapLocations(model, id);
      expect(
        locations.every(
          (location) =>
            location.geometryVisibility === "visible" &&
            location.position !== null,
        ),
      ).toBe(true);
      const bounds = await getItemMapBounds(id);
      if (!locations.length) expect(bounds).toBeNull();
      else
        expect(bounds).toEqual({
          minX: Math.min(...locations.map((location) => location.position!.x)),
          maxX: Math.max(...locations.map((location) => location.position!.x)),
          minY: Math.min(...locations.map((location) => location.position!.y)),
          maxY: Math.max(...locations.map((location) => location.position!.y)),
        });
    }
  });
});
