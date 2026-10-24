import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import initSqlJs from "sql.js-fts5";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import type {
  AcquisitionModel,
  AcquisitionQuery,
  AcquisitionRequest,
  AcquisitionRows,
  MethodKind,
  OutputRow,
} from "./types";
import { queryAcquisitionRows } from "./queries";
import { assembleAcquisitionModel } from "./assemble";
import {
  projectDirectGeometry,
  projectItemSources,
  projectItemUsages,
  projectMonsterLoot,
  projectProviderMethods,
} from "./projections";
import { expandAcquisition } from "./expand";
import { publicAcquisitionFingerprint } from "./fingerprint";
import { evaluateRequirement } from "./conditions";
import { BASELINE_ASSUMPTIONS, calculateMethodProbabilities } from "./rules";

const require = createRequire(import.meta.url);
const schema = readFileSync(
  new URL("../../../../build-pipeline/schema.sql", import.meta.url),
  "utf8",
);
interface Fixture {
  db: Database.Database;
  insert: (table: string, row: Record<string, unknown>) => void;
  method: (
    id: string,
    kind: MethodKind,
    rule_id?: string,
    rooted?: number,
  ) => void;
  output: (
    id: string,
    methodId: string,
    itemId: string,
    amount?: number,
    extra?: Partial<OutputRow>,
  ) => void;
  cost: (
    id: string,
    methodId: string,
    items: readonly [string, number][],
    role?: string,
  ) => void;
  execute: AcquisitionQuery;
  model: (request: AcquisitionRequest) => Promise<AcquisitionModel>;
}
function fixture(): Fixture {
  const db = new Database(":memory:");
  db.exec(schema);
  const insert = (table: string, row: Record<string, unknown>) => {
    const fields = Object.keys(row);
    db.prepare(
      `INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
    ).run(...Object.values(row));
  };
  insert("zones", {
    id: "zone",
    zone_id: 1,
    name: "Test dungeon",
    is_dungeon: 1,
  });
  for (const [id, name, item_type] of [
    ["arrows", "Arrows", "ammo"],
    ["pack", "Pack of 25 Arrows", "pack"],
    ["iron", "Iron", "material"],
    ["copper", "Copper", "material"],
    ["key", "Ancient Key", "key"],
    ["ash", "Ashen Key Shard", "material"],
    ["cinder", "Cinderbound Emblem", "material"],
    ["sigil", "Scorched Sigil Fragment", "material"],
    ["workbench", "Workbench", "structure"],
    ["fragment", "Fatecharm Fragment", "fragment"],
    ["rune", "Cursed Rune", "material"],
    ["blessed", "Blessed Rune", "material"],
    ["essence", "Primal Essence", "material"],
  ])
    insert("items", { id, name, item_type, quality: 1 });
  insert("npcs", { id: "merchant", name: "Merchant" });
  insert("npc_spawns", {
    id: "merchant-zero",
    npc_id: "merchant",
    zone_id: "zone",
    position_x: 0,
    position_y: 0,
    position_z: 0,
  });
  insert("npc_spawns", {
    id: "merchant-second",
    npc_id: "merchant",
    zone_id: "zone",
    position_x: 9,
    position_y: 0,
    position_z: 2,
  });
  for (const id of ["station-a", "station-b"])
    insert("crafting_stations", {
      id,
      name: id,
      zone_id: "zone",
      position_x: id === "station-a" ? 3 : 7,
      position_y: 0,
      position_z: 5,
    });
  const method = (
    id: string,
    kind: MethodKind,
    rule_id: string = kind,
    rooted = 1,
  ) =>
    insert("acquisition_methods", {
      id,
      kind,
      rule_id,
      rooted,
      source_level_hint: 1,
    });
  const output = (
    id: string,
    method_id: string,
    item_id: string,
    amount = 1,
    extra: Partial<OutputRow> = {},
  ) =>
    insert("acquisition_outputs", {
      id,
      method_id,
      ordinal: 0,
      resource_kind: "item",
      item_id,
      amount_min: amount,
      amount_max: amount,
      yield_rule: "fixed",
      delivery: "inventory",
      ...extra,
    });
  const cost = (
    id: string,
    method_id: string,
    items: readonly [string, number][],
    role = "material",
  ) => {
    const kind = (
      db
        .prepare("SELECT kind FROM acquisition_methods WHERE id=?")
        .get(method_id) as { kind: string }
    ).kind;
    const phase =
      kind === "recipe" || kind === "gather" || kind === "world_chest"
        ? "attempt"
        : kind === "essence" || kind === "blessing"
          ? "exchange"
          : kind === "vendor" || kind === "housing"
            ? "purchase"
            : "use";
    insert("acquisition_cost_groups", {
      id,
      method_id,
      phase,
      quantity_rule: "fixed",
      consumption_rule: "on_success",
      selection_rule: "always",
    });
    items.forEach(([item_id, amount], ordinal) =>
      insert("acquisition_inputs", {
        id: `${id}-${ordinal}`,
        cost_group_id: id,
        ordinal,
        resource_kind: "item",
        item_id,
        amount,
        role,
      }),
    );
  };
  method("vendor", "vendor");
  insert("acquisition_vendor_details", {
    id: "vendor",
    npc_id: "merchant",
    offered_item_id: "pack",
    season: "none",
  });
  insert("acquisition_providers_npcs", {
    id: "vendor-provider",
    method_id: "vendor",
    npc_id: "merchant",
    offer_index: 0,
  });
  output("vendor-output", "vendor", "arrows", 25);
  method("pack-use", "pack_use", "pack_use", 0);
  insert("acquisition_item_details", { id: "pack-use", item_id: "pack" });
  insert("acquisition_providers_items", {
    id: "pack-provider",
    method_id: "pack-use",
    item_id: "pack",
  });
  output("pack-output", "pack-use", "arrows", 25);
  cost("pack-cost", "pack-use", [["pack", 1]]);
  insert("crafting_recipes", { id: "arrow-recipe", result_item_id: "arrows" });
  for (const [id, amount, station, material, count] of [
    ["recipe-a", 25, "station-a", "iron", 2],
    ["recipe-b", 10, "station-b", "copper", 3],
  ] as const) {
    method(id, "recipe", "crafting");
    insert("acquisition_recipe_details", {
      id,
      crafting_recipe_id: "arrow-recipe",
      declared_result_item_id: "arrows",
      result_amount: amount,
      tier: 0,
      display_kind: "crafting",
    });
    insert("acquisition_providers_crafting_stations", {
      id: `${id}-provider`,
      method_id: id,
      crafting_station_id: station,
      offer_index: 0,
    });
    output(`${id}-output`, id, "arrows", amount);
    cost(`${id}-cost`, id, [[material, count]]);
  }
  insert("acquisition_home_providers", {
    id: "home-a",
    method_id: "recipe-a",
    structure_item_id: "workbench",
    component_path: "0/1:0",
    offer_index: 0,
  });
  insert("acquisition_home_providers", {
    id: "home-b",
    method_id: "recipe-a",
    structure_item_id: "workbench",
    component_path: "0/2:0",
    offer_index: 5,
  });
  method("merge", "merge");
  insert("acquisition_item_details", { id: "merge", item_id: "ash" });
  output("merge-output", "merge", "key");
  cost(
    "merge-cost",
    "merge",
    [
      ["ash", 1],
      ["cinder", 1],
      ["sigil", 1],
    ],
    "component",
  );
  const execute: AcquisitionQuery = async (sql, params) =>
    db.prepare(sql).all(...params) as Record<string, unknown>[];
  const model = async (request: AcquisitionRequest) =>
    assembleAcquisitionModel(await queryAcquisitionRows(execute, request));
  return { db, insert, method, output, cost, execute, model };
}

function addCreation(f: Fixture) {
  f.insert("classes", {
    id: "warrior",
    name: "Warrior",
    description: "",
    primary_role: "melee",
    difficulty: 1,
    resource_type: "stamina",
    compatible_races: "[]",
  });
  f.method("creation", "creation");
  f.insert("acquisition_creation_details", {
    id: "creation",
    class_id: "warrior",
  });
  f.insert("acquisition_global_roots", {
    id: "creation-root",
    method_id: "creation",
    origin: "creation",
  });
  f.output("creation-output", "creation", "arrows", 5);
}

function addQuest(f: Fixture, id: string, repeatable = false) {
  f.insert("quests", {
    id,
    name: id,
    quest_type: "gather_inventory",
    is_repeatable: Number(repeatable),
  });
  f.method(`${id}-complete`, "quest_complete");
  f.insert("acquisition_quest_details", {
    id: `${id}-complete`,
    quest_id: id,
    phase: "complete",
  });
  f.output(`${id}-output`, `${id}-complete`, "arrows", 3);
}

function addKill(
  f: Fixture,
  id: string,
  overrides: Record<string, unknown> = {},
) {
  f.insert("loot_pools", { id: `${id}-pool`, kind: "monster" });
  f.insert("loot_monster_rules", { id: `${id}-rule`, pool_id: `${id}-pool` });
  f.insert("monsters", {
    id: `${id}-monster`,
    name: id,
    loot_pool_id: `${id}-pool`,
  });
  f.insert("monster_spawns", {
    id: `${id}-spawn`,
    monster_id: `${id}-monster`,
    zone_id: "zone",
    position_x: 8,
    position_y: 0,
    position_z: 4,
  });
  f.method(id, "kill", "monster_loot");
  f.insert("acquisition_kill_details", {
    id,
    monster_id: `${id}-monster`,
    loot_pool_id: `${id}-pool`,
    loot_zone_number: 1,
    loot_zone_id: "zone",
    loot_zone_withheld: 0,
    respawn: 1,
    exp_multiplier: 1,
    is_boss: 0,
    is_elite: 0,
    is_hunt: 0,
    is_summoned_pet: 0,
    event_kind: "authored",
    gold_min: 0,
    gold_max: 0,
    gold_probability: 0,
    ...overrides,
  });
  f.insert("acquisition_providers_monster_spawns", {
    id: `${id}-provider`,
    method_id: id,
    monster_spawn_id: `${id}-spawn`,
  });
  return `${id}-pool`;
}

function poolEntry(
  f: Fixture,
  pool: string,
  ordinal: number,
  item: string | null,
  extra: Record<string, unknown> = {},
) {
  f.insert("loot_pool_entries", {
    id: `${pool}-${ordinal}`,
    pool_id: pool,
    ordinal,
    item_id: item,
    resolution: "direct",
    probability: 0.2,
    duplicate_group: ordinal,
    counts_equipment: 0,
    guaranteed_equipment_candidate: 0,
    quest_gate: "none",
    scales_with_treasure_hunter: 0,
    quality: 1,
    withheld: Number(item === null),
    ...extra,
  });
}

describe("canonical source, inspection and provider behavior", () => {
  it("delivers pack contents without advertising the offered pack as carried inventory", async () => {
    const f = fixture();
    try {
      const model = await f.model({
        kind: "items",
        itemIds: ["pack", "arrows", "key"],
      });
      const pack = projectItemSources(model, "pack");
      expect(pack.hasKnownSource).toBe(false);
      expect(model.methodViews.get("vendor")!.probabilityFactors).toEqual([]);
      expect(pack.methods).toEqual([]);
      expect(
        pack.inspection.offeredAssets.map((method) => method.kind),
      ).toEqual(["vendor"]);
      expect(pack.inspection.fixedContents).toMatchObject([
        { itemId: "arrows", amount: { kind: "exact", value: 25 } },
      ]);
      expect(pack.inspection.offerLocations).toHaveLength(2);
      expect(pack.inspection.offerLocations[0].position).toEqual({
        x: 0,
        y: 0,
        z: 0,
      });
      expect(
        projectDirectGeometry(model, "arrows").filter(
          (location) => location.provider.kind === "npcs",
        ),
      ).toHaveLength(2);
      expect(
        projectProviderMethods(model, {
          kind: "crafting_stations",
          id: "station-a",
        }).map((method) => method.methodId),
      ).toEqual(["recipe-a"]);
      expect(
        projectProviderMethods(model, {
          kind: "crafting_stations",
          id: "station-b",
        }).map((method) => method.methodId),
      ).toEqual(["recipe-b"]);
      const merge = projectItemSources(model, "key").methods[0];
      expect(merge.costGroups[0].inputs.map((input) => input.item_id)).toEqual([
        "ash",
        "cinder",
        "sigil",
      ]);
      expect(projectDirectGeometry(model, "key")).toEqual([]);
      expect(model.methodViews.get("recipe-a")!.homeProviders).toHaveLength(2);
      expect(
        model.methodViews
          .get("recipe-a")!
          .homeProviders.every((home) => home.requirements.length === 1),
      ).toBe(true);
      expect(Object.isFrozen(merge.costGroups[0].inputs)).toBe(true);
      expect("set" in model.methodViews).toBe(false);
    } finally {
      f.db.close();
    }
  });

  it("does not describe consumed inputs as additional retained uses", async () => {
    const f = fixture();
    try {
      const model = await f.model({
        kind: "items",
        itemIds: ["pack", "iron"],
      });
      for (const [itemId, amount] of [
        ["pack", 1],
        ["iron", 2],
      ] as const) {
        const uses = projectItemUsages(model, itemId);
        expect(
          uses.map((use) => ({
            kind: use.kind,
            consumed: use.consumed,
            amount: use.amount,
          })),
        ).toEqual([
          {
            kind: "cost",
            consumed: true,
            amount: { kind: "exact", value: amount },
          },
        ]);
      }
      const use = projectItemUsages(model, "pack")[0];
      const inventory = (amount: number) => ({
        subjects: {
          player: {
            items: {
              inventory: {
                entries: [{ itemId: "pack", amount }],
                complete: true,
              },
            },
          },
        },
      });
      expect(
        use.requirements.some(
          (root) => evaluateRequirement(root, inventory(0)).status === "unmet",
        ),
      ).toBe(true);
      expect(
        use.requirements.every(
          (root) => evaluateRequirement(root, inventory(1)).status === "met",
        ),
      ).toBe(true);
    } finally {
      f.db.close();
    }
  });

  it.each(["inventory_primary", "inventory_secondary", "equipped"] as const)(
    "projects one %s objective without losing its alternatives, conjunction or completion cost",
    async (role) => {
      const f = fixture();
      try {
        addQuest(f, "turn-in");
        for (const [id, itemId, objectiveRole, amount] of [
          ["required-iron", "iron", role, 3],
          ["worn-copper", "copper", "equipped", 1],
        ] as const) {
          f.insert("quest_objectives", {
            id,
            quest_id: "turn-in",
            ordinal: id === "required-iron" ? 0 : 1,
            kind: "item",
            role: objectiveRole,
            amount,
          });
          f.insert("quest_objective_items", { id, item_id: itemId });
        }
        f.cost(
          "turn-in-cost",
          "turn-in-complete",
          [["iron", 3]],
          "quest_primary",
        );
        f.db
          .prepare(
            "UPDATE acquisition_cost_groups SET phase='complete' WHERE id=?",
          )
          .run("turn-in-cost");
        const model = await f.model({ kind: "items", itemIds: ["iron"] });
        const uses = projectItemUsages(model, "iron");
        const objectives = uses.filter(
          (use) => use.entity?.id === "turn-in" && use.phase === "fulfill",
        );
        expect(objectives).toHaveLength(1);
        expect(objectives[0]).toMatchObject({
          kind: "objective",
          role,
          amount: { kind: "exact", value: 3 },
          consumed: false,
        });
        expect(
          uses.filter((use) => use.method?.detail.quest_id === "turn-in"),
        ).toMatchObject([
          {
            kind: "cost",
            phase: "complete",
            consumed: true,
            amount: { kind: "exact", value: 3 },
          },
        ]);
        const root = objectives[0].requirements[0];
        const status = (
          inventory: number,
          keyring: number,
          equipment: number,
          wornCopper = 1,
        ) =>
          evaluateRequirement(root, {
            subjects: {
              player: {
                items: {
                  inventory: {
                    entries: [{ itemId: "iron", amount: inventory }],
                    complete: true,
                  },
                  keyring: {
                    entries: [{ itemId: "iron", amount: keyring }],
                    complete: true,
                  },
                  equipment: {
                    entries: [
                      { itemId: "iron", amount: equipment },
                      { itemId: "copper", amount: wornCopper },
                    ],
                    complete: true,
                  },
                },
              },
            },
          }).status;
        expect(status(2, 0, 0)).toBe("unmet");
        expect(status(3, 0, 0)).toBe(role === "equipped" ? "unmet" : "met");
        expect(status(0, 1, 0)).toBe(role === "equipped" ? "unmet" : "met");
        expect(status(0, 0, 1)).toBe(
          role === "inventory_secondary" ? "met" : "unmet",
        );
        expect(status(0, 0, 3)).toBe(
          role === "inventory_primary" ? "unmet" : "met",
        );
        expect(status(3, 1, 3, 0)).toBe("unmet");
      } finally {
        f.db.close();
      }
    },
  );

  it("retains an origin use for a portal whose destination is withheld", async () => {
    const f = fixture();
    try {
      f.insert("portals", {
        id: "withheld-portal",
        from_zone_id: "zone",
        position_x: 2,
        position_y: 0,
        position_z: 6,
        required_item_id: "key",
        destination_withheld: 1,
      });
      const model = await f.model({ kind: "items", itemIds: ["key"] });
      const use = projectItemUsages(model, "key").find(
        (use) => use.entity?.kind === "portal",
      )!;
      expect(use.useLocations).toMatchObject([
        {
          provider: { kind: "portals", id: "withheld-portal" },
          purpose: "use",
          position: { x: 2, y: 0, z: 6 },
        },
      ]);
      expect(projectDirectGeometry(model, "key")).toEqual([]);
    } finally {
      f.db.close();
    }
  });

  it("keeps native placement context and nonrespawning placeholder loot separate", async () => {
    const f = fixture();
    try {
      const pool = addKill(f, "normal");
      poolEntry(f, pool, 0, "iron");
      f.output("normal-output", "normal", "iron", 1, {
        yield_rule: "pool",
        amount_min: null,
        amount_max: null,
        delivery: "corpse",
      });
      f.method("placeholder", "kill", "placeholder_loot");
      f.insert("acquisition_kill_details", {
        id: "placeholder",
        monster_id: "normal-monster",
        loot_pool_id: pool,
        loot_zone_number: 1,
        loot_zone_id: "zone",
        respawn: 0,
        exp_multiplier: 1,
        is_boss: 0,
        is_elite: 0,
        is_hunt: 0,
        is_summoned_pet: 0,
        event_kind: "placeholder",
        parent_monster_spawn_id: "normal-spawn",
        gold_min: 0,
        gold_max: 0,
        gold_probability: 0,
      });
      f.insert("acquisition_providers_monster_spawns", {
        id: "placeholder-provider",
        method_id: "placeholder",
        monster_spawn_id: "normal-spawn",
      });
      f.output("placeholder-output", "placeholder", "iron", 1, {
        yield_rule: "pool",
        amount_min: null,
        amount_max: null,
        delivery: "corpse",
      });
      f.insert("luck_tokens", {
        zone_id: "zone",
        zone_name: "Test dungeon",
        fragment_token_id: "fragment",
      });
      f.output("fragment-output", "normal", "fragment", 1, {
        ordinal: 1,
        yield_rule: "pool",
        amount_min: null,
        amount_max: null,
        delivery: "corpse",
      });
      const model = await f.model({
        kind: "monsters",
        monsterIds: ["normal-monster"],
      });
      expect(projectMonsterLoot(model, "normal-monster").contexts).toHaveLength(
        2,
      );
      expect(
        model.methodViews
          .get("normal")!
          .probabilityResults.find(
            (result) =>
              result.target.kind === "item" &&
              result.target.itemId === "fragment",
          )?.probability,
      ).toBe(0.05);
      expect(
        model.methodViews
          .get("placeholder")!
          .probabilityResults.some(
            (result) =>
              result.target.kind === "item" &&
              result.target.itemId === "fragment",
          ),
      ).toBe(false);
      expect(
        projectDirectGeometry(model, "iron").some(
          (location) => location.approximate,
        ),
      ).toBe(true);
    } finally {
      f.db.close();
    }
  });
});

describe("bounded complete alternatives and lifecycle planning", () => {
  it("expands only the requested recipe alternatives and retains unrooted variants and ingredient sources", async () => {
    const f = fixture();
    try {
      addCreation(f);
      f.db
        .prepare("UPDATE acquisition_methods SET rooted=0 WHERE id='recipe-b'")
        .run();
      f.cost("result-reuse-cost", "recipe-a", [["arrows", 1]]);
      for (const id of ["iron-vendor-a", "iron-vendor-b"]) {
        f.method(id, "vendor");
        f.insert("acquisition_vendor_details", {
          id,
          npc_id: "merchant",
          offered_item_id: "iron",
          season: "none",
        });
        f.insert("acquisition_providers_npcs", {
          id: `${id}-provider`,
          method_id: id,
          npc_id: "merchant",
        });
        f.output(`${id}-output`, id, "iron");
      }
      const tree = await expandAcquisition(f.execute, {
        itemId: "arrows",
        amount: 26,
        rootRecipeMethodIds: ["recipe-a", "recipe-b"],
        maxDepth: 8,
        maxNodes: 200,
      });
      expect(tree.branches.map((branch) => branch.method.methodId)).toEqual([
        "recipe-a",
        "recipe-b",
      ]);
      const first = tree.branches[0];
      expect(first).toMatchObject({
        plannedExecutions: 2,
        yieldedAmount: { kind: "exact", value: 50 },
      });
      const iron = first.ingredients.find(
        (ingredient) => ingredient.input.item_id === "iron",
      )!;
      expect(iron.amount).toEqual({ kind: "exact", value: 4 });
      expect(
        iron.acquisition?.branches.map((branch) => branch.method.methodId),
      ).toEqual(["iron-vendor-a", "iron-vendor-b"]);
      expect(
        first.ingredients
          .find((ingredient) => ingredient.input.item_id === "arrows")
          ?.acquisition?.branches.some(
            (branch) => branch.method.methodId === "vendor",
          ),
      ).toBe(true);
      expect(first.method.providers.map((provider) => provider.ref.id)).toEqual(
        ["station-a"],
      );
      expect(first.method.homeProviders).toHaveLength(2);
      expect(tree.branches[1]).toMatchObject({
        plannedExecutions: 3,
        ingredients: [{ amount: { kind: "exact", value: 9 } }],
      });
      const selected = await expandAcquisition(f.execute, {
        itemId: "arrows",
        amount: 26,
        rootRecipeMethodIds: ["recipe-b"],
        maxDepth: 8,
        maxNodes: 200,
      });
      expect(selected.branches.map((branch) => branch.method.methodId)).toEqual(
        ["recipe-b"],
      );
      expect(selected.branches[0]).toMatchObject({
        plannedExecutions: 3,
        yieldedAmount: { kind: "exact", value: 30 },
        ingredients: [{ amount: { kind: "exact", value: 9 } }],
      });
    } finally {
      f.db.close();
    }
  });

  it("plans immediate-content pack recipes from declared yield without inventing a carried-pack source", async () => {
    const f = fixture();
    try {
      f.insert("crafting_recipes", {
        id: "pack-recipe",
        result_item_id: "pack",
      });
      f.method("pack-recipe-method", "recipe", "crafting");
      f.insert("acquisition_recipe_details", {
        id: "pack-recipe-method",
        crafting_recipe_id: "pack-recipe",
        declared_result_item_id: "pack",
        result_amount: 2,
        tier: 0,
        display_kind: "crafting",
      });
      f.output("pack-recipe-output", "pack-recipe-method", "arrows", 50);
      f.cost("pack-recipe-cost", "pack-recipe-method", [
        ["iron", 2],
        ["copper", 1],
      ]);
      const tree = await expandAcquisition(f.execute, {
        itemId: "pack",
        amount: 3,
        rootRecipeMethodIds: ["pack-recipe-method"],
        maxDepth: 8,
        maxNodes: 200,
      });
      expect(tree.sources.hasKnownSource).toBe(false);
      expect(tree.branches).toHaveLength(1);
      expect(tree.branches[0]).toMatchObject({
        plannedExecutions: 2,
        yieldedAmount: { kind: "exact", value: 4 },
        ingredients: [
          {
            input: { item_id: "iron" },
            amount: { kind: "exact", value: 4 },
            acquisition: { itemId: "iron" },
          },
          {
            input: { item_id: "copper" },
            amount: { kind: "exact", value: 2 },
            acquisition: { itemId: "copper" },
          },
        ],
      });
      const ordinary = await expandAcquisition(f.execute, {
        itemId: "pack",
        amount: 3,
        maxDepth: 8,
        maxNodes: 200,
      });
      expect(ordinary.branches).toEqual([]);
    } finally {
      f.db.close();
    }
  });

  it("keeps unknown cooking success per attempt in item and recipe-root expansion", async () => {
    const f = fixture();
    try {
      f.db
        .prepare(
          "UPDATE acquisition_methods SET rule_id='cooking' WHERE id='recipe-a'",
        )
        .run();
      f.db
        .prepare(
          "UPDATE acquisition_recipe_details SET display_kind='cooking',tier=1 WHERE id='recipe-a'",
        )
        .run();
      for (const rootRecipeMethodIds of [undefined, ["recipe-a", "recipe-b"]]) {
        const tree = await expandAcquisition(f.execute, {
          itemId: "arrows",
          amount: 26,
          rootRecipeMethodIds,
          maxDepth: 8,
          maxNodes: 200,
        });
        const recipe = tree.branches.find(
          (branch) => branch.method.methodId === "recipe-a",
        )!;
        expect(recipe).toMatchObject({
          requiredExecutions: null,
          plannedExecutions: null,
          uncoveredAmount: null,
          yieldedAmount: { kind: "unknown" },
          ingredients: [{ amount: { kind: "exact", value: 2 } }],
        });
        expect(
          tree.branches.find((branch) => branch.method.methodId === "recipe-b"),
        ).toMatchObject({
          plannedExecutions: 3,
          yieldedAmount: { kind: "exact", value: 30 },
        });
      }
    } finally {
      f.db.close();
    }
  });

  it("uses whole recipe batches and leaves once-only and cycle availability explicit", async () => {
    const f = fixture();
    try {
      addCreation(f);
      addQuest(f, "one-time");
      addQuest(f, "repeat", true);
      f.insert("progression_rules", {
        id: 1,
        max_level: 50,
        max_veteran_points: 200,
        attribute_points_per_veteran: 1,
        veteran_skill_points_per_veteran: 1,
      });
      f.method("cap", "cap_xp");
      f.insert("acquisition_cap_xp_details", {
        id: "cap",
        reward_item_id: "arrows",
      });
      f.output("cap-output", "cap", "arrows");
      f.insert("acquisition_global_roots", {
        id: "cap-root",
        method_id: "cap",
        origin: "cap_xp",
      });
      const tree = await expandAcquisition(f.execute, {
        itemId: "arrows",
        amount: 26,
        maxDepth: 8,
        maxNodes: 200,
      });
      const recipe = tree.branches.find(
        (branch) => branch.method.methodId === "recipe-a",
      )!;
      expect(recipe).toMatchObject({
        requiredExecutions: 2,
        plannedExecutions: 2,
        uncoveredAmount: 0,
        yieldedAmount: { kind: "exact", value: 50 },
      });
      expect(recipe.ingredients[0].amount).toEqual({ kind: "exact", value: 4 });
      expect(
        tree.branches.filter((branch) => branch.method.kind === "recipe"),
      ).toHaveLength(2);
      expect(
        tree.branches.find((branch) => branch.method.kind === "creation"),
      ).toMatchObject({
        requiredExecutions: 6,
        plannedExecutions: 1,
        uncoveredAmount: 21,
        availability: "not_evaluated",
      });
      expect(
        tree.branches.find(
          (branch) => branch.method.methodId === "one-time-complete",
        ),
      ).toMatchObject({
        requiredExecutions: 9,
        plannedExecutions: 1,
        uncoveredAmount: 23,
      });
      expect(
        tree.branches.find(
          (branch) => branch.method.methodId === "repeat-complete",
        ),
      ).toMatchObject({
        requiredExecutions: 9,
        plannedExecutions: null,
        uncoveredAmount: null,
        repeatability: { basis: "quest_cycle" },
      });
      expect(
        tree.branches.find((branch) => branch.method.kind === "cap_xp"),
      ).toMatchObject({
        requiredExecutions: 26,
        plannedExecutions: null,
        uncoveredAmount: null,
        repeatability: { basis: "xp_cycle" },
      });
      const limited = await expandAcquisition(f.execute, {
        itemId: "arrows",
        amount: 26,
        maxDepth: 0,
        maxNodes: 1,
      });
      expect(limited.branches).toHaveLength(tree.branches.length);
      expect(
        limited.branches.find(
          (branch) => branch.method.methodId === "recipe-a",
        )!.ingredients[0].acquisition,
      ).toMatchObject({ reason: "depth_limit", inspectionLink: "/items/iron" });
    } finally {
      f.db.close();
    }
  });

  it("keeps a shared ingredient on separate alternatives and marks only path-local cycles", async () => {
    const f = fixture();
    try {
      f.db
        .prepare(
          "UPDATE acquisition_inputs SET item_id='iron' WHERE cost_group_id='recipe-b-cost'",
        )
        .run();
      f.insert("crafting_recipes", {
        id: "iron-recipe",
        result_item_id: "iron",
      });
      f.method("iron-recipe-method", "recipe", "crafting");
      f.insert("acquisition_recipe_details", {
        id: "iron-recipe-method",
        crafting_recipe_id: "iron-recipe",
        declared_result_item_id: "iron",
        result_amount: 1,
        tier: 0,
        display_kind: "crafting",
      });
      f.output("iron-output", "iron-recipe-method", "iron");
      f.cost("iron-cost", "iron-recipe-method", [["arrows", 1]]);
      const tree = await expandAcquisition(f.execute, {
        itemId: "arrows",
        amount: 1,
        maxDepth: 8,
        maxNodes: 200,
      });
      const recipes = tree.branches.filter(
        (branch) => branch.method.kind === "recipe",
      );
      expect(
        recipes.map((branch) => branch.ingredients[0].acquisition?.itemId),
      ).toEqual(["iron", "iron"]);
      const nested =
        recipes[0].ingredients[0].acquisition!.branches[0].ingredients[0]
          .acquisition!;
      expect(nested.branches.some((branch) => branch.reason === "cycle")).toBe(
        true,
      );
      expect(
        nested.branches.some(
          (branch) => branch.method.methodId === "recipe-b" && !branch.reason,
        ),
      ).toBe(true);
    } finally {
      f.db.close();
    }
  });
});

describe("quest navigation and completion", () => {
  it("ignores visible and withheld tracking markers but requires genuine discovery progress", async () => {
    const f = fixture();
    try {
      addQuest(f, "navigation");
      for (const withheld of [0, 1]) {
        const id = `tracking-${withheld}`;
        f.insert("quest_objectives", {
          id,
          quest_id: "navigation",
          ordinal: withheld,
          kind: "location",
          role: "tracking_location",
          withheld,
        });
        f.insert("quest_objective_locations", {
          id,
          zone_id: withheld ? null : "zone",
        });
      }
      const request: AcquisitionRequest = {
        kind: "requirements",
        entities: [{ kind: "quest", id: "navigation" }],
      };
      const facts = {
        subjects: {
          player: {
            quests: {
              complete: true,
              entries: [
                { questId: "navigation", active: true, completed: false },
              ],
            },
            questProgress: { complete: true, entries: [] },
          },
        },
      };
      const before = await f.model(request);
      const completion = before.requirements
        .get("quest:navigation")!
        .find((root) => root.phase === "complete")!;
      expect(evaluateRequirement(completion, facts).status).toBe("met");
      f.insert("quest_objectives", {
        id: "discovery",
        quest_id: "navigation",
        ordinal: 2,
        kind: "location",
        role: "location_visit",
      });
      f.insert("quest_objective_locations", {
        id: "discovery",
        zone_id: "zone",
      });
      const after = await f.model(request);
      const discovery = after.requirements
        .get("quest:navigation")!
        .find((root) => root.phase === "complete")!;
      expect(evaluateRequirement(discovery, facts).status).toBe("unmet");
      expect(
        evaluateRequirement(discovery, {
          subjects: {
            player: {
              ...facts.subjects.player,
              questProgress: {
                complete: true,
                entries: [
                  {
                    questId: "navigation",
                    objectiveId: "discovery",
                    amount: 1,
                  },
                ],
              },
            },
          },
        }).status,
      ).toBe("met");
    } finally {
      f.db.close();
    }
  });
});

describe("semantic fingerprints and host parity", () => {
  it("ignores opaque rekeys and unused native offer numbering but detects costs, names and capability gates", async () => {
    const f = fixture();
    try {
      const request: AcquisitionRequest = {
        kind: "items",
        itemIds: ["arrows"],
      };
      const rows = await queryAcquisitionRows(f.execute, request);
      const before = publicAcquisitionFingerprint(
        assembleAcquisitionModel(rows),
        request,
      );
      const changed = structuredClone(rows);
      const mapped = new Map(
        changed.methods.map((method, index) => [method.id, `opaque-${index}`]),
      );
      const rewrite = <Row extends object>(row: Row) =>
        Object.fromEntries(
          Object.entries(row).map(([field, value]) => [
            field,
            field === "id"
              ? (mapped.get(String(value)) ?? `opaque-row-${String(value)}`)
              : field === "method_id" || field === "setup_method_id"
                ? (mapped.get(String(value)) ?? value)
                : value,
          ]),
        );
      const rekeyed = {
        ...changed,
        methods: changed.methods.map((method) => rewrite(method)),
        outputs: changed.outputs.map(rewrite),
        costGroups: changed.costGroups.map(rewrite),
        inputs: changed.inputs.map((row) => ({
          ...rewrite(row),
          cost_group_id: `opaque-row-${row.cost_group_id}`,
        })),
        details: Object.fromEntries(
          Object.entries(changed.details).map(([kind, details]) => [
            kind,
            details.map(rewrite),
          ]),
        ),
        providers: Object.fromEntries(
          Object.entries(changed.providers).map(([kind, providers]) => [
            kind,
            providers.map((row) => ({
              ...rewrite(row),
              offer_index:
                typeof row.offer_index === "number"
                  ? row.offer_index + 100
                  : null,
            })),
          ]),
        ),
        homeProviders: changed.homeProviders.map((row) => ({
          ...rewrite(row),
          offer_index: Number(row.offer_index) + 100,
        })),
      } as unknown as AcquisitionRows;
      expect(
        publicAcquisitionFingerprint(
          assembleAcquisitionModel(rekeyed),
          request,
        ),
      ).toEqual(before);
      f.db
        .prepare(
          "UPDATE acquisition_inputs SET amount=4 WHERE cost_group_id='recipe-a-cost'",
        )
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(before);
      f.db
        .prepare(
          "UPDATE acquisition_inputs SET amount=2 WHERE cost_group_id='recipe-a-cost'",
        )
        .run();
      f.db
        .prepare("UPDATE items SET name='Renamed Iron' WHERE id='iron'")
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(before);
      f.db.prepare("UPDATE items SET name='Iron' WHERE id='iron'").run();
      f.db
        .prepare(
          "UPDATE acquisition_home_providers SET component_path='new/path' WHERE id='home-a'",
        )
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(before);
      f.db
        .prepare(
          "UPDATE acquisition_home_providers SET component_path='0/1:0' WHERE id='home-a'",
        )
        .run();
      f.db
        .prepare(
          "UPDATE acquisition_outputs SET amount_min=26,amount_max=26 WHERE method_id='recipe-a'",
        )
        .run();
      f.db
        .prepare(
          "UPDATE acquisition_recipe_details SET result_amount=26 WHERE id='recipe-a'",
        )
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(before);
    } finally {
      f.db.close();
    }
  });

  it("orders unordered entity, method and provider inputs independently of storage row order", async () => {
    const f = fixture();
    try {
      const request: AcquisitionRequest = {
        kind: "items",
        itemIds: ["arrows", "pack", "key"],
      };
      const rows = await queryAcquisitionRows(f.execute, request);
      const before = publicAcquisitionFingerprint(
        assembleAcquisitionModel(rows),
        request,
      );
      const reversed: AcquisitionRows = {
        ...rows,
        methods: [...rows.methods].reverse(),
        costGroups: [...rows.costGroups].reverse(),
        inputs: [...rows.inputs].reverse(),
        outputs: [...rows.outputs].reverse(),
        homeProviders: [...rows.homeProviders].reverse(),
        details: Object.fromEntries(
          Object.entries(rows.details).map(
            ([kind, values]): [string, readonly object[]] => [
              kind,
              [...values].reverse(),
            ],
          ),
        ) as AcquisitionRows["details"],
        providers: Object.fromEntries(
          Object.entries(rows.providers).map(
            ([kind, values]): [string, readonly object[]] => [
              kind,
              [...values].reverse(),
            ],
          ),
        ) as AcquisitionRows["providers"],
      };
      expect(
        publicAcquisitionFingerprint(assembleAcquisitionModel(reversed), {
          kind: "items",
          itemIds: ["key", "pack", "arrows"],
        }),
      ).toEqual(before);
    } finally {
      f.db.close();
    }
  });

  it("preserves anonymous process meaning across opaque pool rekeys and detects cap, gate and chance changes", async () => {
    const f = fixture();
    try {
      const pool = addKill(f, "fingerprint-hunter");
      poolEntry(f, pool, 0, "arrows", {
        cap: 2,
        scales_with_treasure_hunter: 1,
      });
      poolEntry(f, pool, 1, null, { cap: 1 });
      const request: AcquisitionRequest = {
        kind: "monsters",
        monsterIds: ["fingerprint-hunter-monster"],
      };
      const rows = await queryAcquisitionRows(f.execute, request);
      const before = publicAcquisitionFingerprint(
        assembleAcquisitionModel(rows),
        request,
      );
      const renamed = "opaque-pool";
      const rekeyed = {
        ...rows,
        pools: rows.pools.map((row) => ({ ...row, id: renamed })),
        poolEntries: rows.poolEntries.map((row, index) => ({
          ...row,
          id: `opaque-entry-${index}`,
          pool_id: renamed,
          duplicate_group: row.duplicate_group + 50,
        })),
        methodPools: rows.methodPools.map((row) => ({
          ...row,
          pool_id: renamed,
        })),
        details: {
          ...rows.details,
          kill: rows.details.kill.map((row) => ({
            ...row,
            loot_pool_id: renamed,
          })),
        },
        entities: {
          ...rows.entities,
          monsters: (rows.entities.monsters ?? []).map((row) => ({
            ...row,
            loot_pool_id: renamed,
          })),
        },
        facts: {
          ...rows.facts,
          loot_monster_rules: (rows.facts.loot_monster_rules ?? []).map(
            (row) => ({ ...row, pool_id: renamed }),
          ),
        },
      } as AcquisitionRows;
      expect(
        publicAcquisitionFingerprint(
          assembleAcquisitionModel(rekeyed),
          request,
        ),
      ).toEqual(before);
      const reordered = {
        ...rows,
        poolEntries: rows.poolEntries.map((row) => ({
          ...row,
          ordinal: 1 - row.ordinal,
        })),
      };
      expect(
        publicAcquisitionFingerprint(
          assembleAcquisitionModel(reordered),
          request,
        ),
      ).not.toEqual(before);
      for (const sql of [
        "UPDATE loot_pool_entries SET cap=3 WHERE ordinal=0",
        "UPDATE loot_pool_entries SET cap=2,probability=.3 WHERE ordinal=0",
        "UPDATE loot_pool_entries SET probability=.2,quest_gate='withheld_need' WHERE ordinal=0",
      ]) {
        f.db.prepare(sql).run();
        expect(
          publicAcquisitionFingerprint(await f.model(request), request),
        ).not.toEqual(before);
      }
    } finally {
      f.db.close();
    }
  });

  it("keeps shared fingerprint values immutable across pages, selections and fresh models", async () => {
    const f = fixture();
    try {
      const itemIds = ["arrows", "pack", "key"];
      const model = await f.model({ kind: "items", itemIds });
      const request = { kind: "items" as const, itemIds: ["arrows"] };
      const page = publicAcquisitionFingerprint(model, request);
      const expected = structuredClone(page) as { items: unknown[] };
      function rejectMutation(value: unknown): void {
        if (!value || typeof value !== "object") return;
        expect(Object.isFrozen(value)).toBe(true);
        const key = Object.keys(value)[0];
        if (key !== undefined)
          expect(Reflect.set(value, key, null)).toBe(false);
        for (const child of Object.values(value)) rejectMutation(child);
      }
      rejectMutation(page);
      request.itemIds.push("pack");
      const batch = publicAcquisitionFingerprint(model, request) as {
        items: unknown[];
      };
      expect(batch.items).toContainEqual(expected.items[0]);
      expect(
        publicAcquisitionFingerprint(model, {
          kind: "items",
          itemIds: ["arrows"],
        }),
      ).toEqual(expected);
      expect(
        publicAcquisitionFingerprint(model, {
          kind: "items",
          itemIds: ["pack", "arrows", "pack"],
        }),
      ).toEqual(batch);
      const provider = { kind: "npcs" as const, id: "merchant" };
      const providers = {
        kind: "providers" as const,
        providers: [provider, provider],
      };
      const providerPage = publicAcquisitionFingerprint(model, providers) as {
        providers: unknown[];
      };
      expect(providerPage.providers).toHaveLength(2);
      provider.id = "missing";
      expect(providerPage.providers[0]).toMatchObject({
        provider: { id: "merchant" },
      });
      expect(Object.isFrozen(provider)).toBe(false);
      f.db
        .prepare(
          "UPDATE acquisition_inputs SET amount=4 WHERE cost_group_id='recipe-a-cost'",
        )
        .run();
      expect(
        publicAcquisitionFingerprint(
          await f.model({ kind: "items", itemIds }),
          { kind: "items", itemIds: ["arrows"] },
        ),
      ).not.toEqual(expected);
      expect(
        publicAcquisitionFingerprint(model, {
          kind: "items",
          itemIds: ["arrows"],
        }),
      ).toEqual(expected);
    } finally {
      f.db.close();
    }
  });

  it("queries, assembles and projects the same complete values through better-sqlite3 and sql.js", async () => {
    const f = fixture();
    const SQL = await initSqlJs({
      wasmBinary: Uint8Array.from(
        readFileSync(require.resolve("sql.js-fts5/dist/sql-wasm.wasm")),
      ).buffer,
    });
    const browserDb = new SQL.Database(f.db.serialize());
    const browserExecute: AcquisitionQuery = async (sql, params) => {
      const statement = browserDb.prepare(sql);
      try {
        statement.bind([...params]);
        const rows: Record<string, unknown>[] = [];
        while (statement.step()) rows.push(statement.getAsObject());
        return rows;
      } finally {
        statement.free();
      }
    };
    try {
      const request: AcquisitionRequest = {
        kind: "items",
        itemIds: ["arrows", "pack", "key"],
      };
      const server = await f.model(request);
      const browser = assembleAcquisitionModel(
        await queryAcquisitionRows(browserExecute, request),
      );
      for (const id of request.itemIds) {
        expect(projectItemSources(browser, id)).toEqual(
          projectItemSources(server, id),
        );
        expect(projectItemUsages(browser, id)).toEqual(
          projectItemUsages(server, id),
        );
        expect(projectDirectGeometry(browser, id)).toEqual(
          projectDirectGeometry(server, id),
        );
      }
      expect(publicAcquisitionFingerprint(browser, request)).toEqual(
        publicAcquisitionFingerprint(server, request),
      );
    } finally {
      browserDb.close();
      f.db.close();
    }
  });
  it("isolates assembled facts from mutable inputs including nested values on frozen rows", async () => {
    const f = fixture();
    try {
      const itemIds = ["arrows"];
      const queried = await queryAcquisitionRows(f.execute, {
        kind: "items",
        itemIds,
      });
      const mutable = structuredClone(queried);
      const nested = { values: [1] };
      const items = mutable.entities.items.map((row, index) =>
        index === 0 ? Object.freeze({ ...row, nested }) : row,
      );
      const rows = { ...mutable, entities: { ...mutable.entities, items } };
      const model = assembleAcquisitionModel(rows);
      const before = publicAcquisitionFingerprint(model, rows.request);
      const amount = mutable.outputs[0].amount_min;
      Object.assign(mutable.outputs[0], { amount_min: 999, amount_max: 999 });
      Object.assign(items[1], { name: "Externally changed" });
      nested.values.push(2);
      Object.assign(mutable.request, { itemIds: ["key"] });
      expect(model.rows.outputs[0].amount_min).toBe(amount);
      expect(model.rows.entities.items[0].nested).toEqual({ values: [1] });
      expect(model.rows.request).toEqual({
        kind: "items",
        itemIds: ["arrows"],
      });
      expect(publicAcquisitionFingerprint(model, model.rows.request)).toEqual(
        before,
      );
      const uses = projectItemUsages(model, "iron");
      expect(uses.length).toBeGreaterThan(0);
      expect(Object.isFrozen(uses[0].amount)).toBe(true);
      expect(projectItemUsages(model, "iron")).toEqual(uses);
    } finally {
      f.db.close();
    }
  });

  it("batches deduplicated targets at 200 and preserves empty unknown results without swallowing corruption", async () => {
    const f = fixture();
    try {
      const calls: { sql: string; count: number }[] = [];
      const execute: AcquisitionQuery = async (sql, params) => {
        calls.push({ sql, count: params.length });
        return f.execute(sql, params);
      };
      const unknown = Array.from(
        { length: 401 },
        (_, index) => `unknown-${index}`,
      );
      const model = assembleAcquisitionModel(
        await queryAcquisitionRows(execute, {
          kind: "items",
          itemIds: [...unknown, ...unknown],
        }),
      );
      expect(projectItemSources(model, "unknown-0")).toMatchObject({
        hasKnownSource: false,
        methods: [],
      });
      expect(calls.every((call) => call.count <= 200)).toBe(true);
      expect(
        calls
          .filter((call) =>
            call.sql.startsWith(
              "SELECT * FROM acquisition_outputs WHERE item_id",
            ),
          )
          .map((call) => call.count),
      ).toEqual([200, 200, 1]);
      const rows = await queryAcquisitionRows(f.execute, {
        kind: "items",
        itemIds: ["arrows"],
      });
      expect(() =>
        assembleAcquisitionModel({
          ...rows,
          outputs: rows.outputs.map((output, index) =>
            index
              ? output
              : { ...output, delivery: "corrupt" as OutputRow["delivery"] },
          ),
        }),
      ).toThrow(/delivery/);
    } finally {
      f.db.close();
    }
  });
});

describe("conditional quantities and finite requirements", () => {
  it("requires learning only for Alchemy and applies the Alchemy floor to Scribing", async () => {
    const f = fixture();
    try {
      for (const kind of ["alchemy", "scribing", "cooking"] as const) {
        const table =
          kind === "alchemy"
            ? "alchemy_recipes"
            : kind === "scribing"
              ? "scribing_recipes"
              : "crafting_recipes";
        const route = `${kind}-route`;
        f.insert(table, { id: route, result_item_id: "arrows" });
        f.method(kind, "recipe", kind);
        f.insert("acquisition_recipe_details", {
          id: kind,
          [`${table.replace("_recipes", "")}_recipe_id`]: route,
          declared_result_item_id: "arrows",
          result_amount: 1,
          tier: 4,
          display_kind: kind,
        });
        f.output(`${kind}-output`, kind, "arrows");
        f.cost(`${kind}-cost`, kind, [["iron", 1]]);
      }
      const model = await f.model({ kind: "items", itemIds: ["arrows"] });
      const facts = (skill: number, learned = false) => ({
        subjects: {
          player: {
            recipes: { entries: learned ? ["arrows"] : [], complete: true },
            items: {
              inventory: {
                entries: [{ itemId: "iron", amount: 2 }],
                complete: true,
              },
            },
            professions: {
              alchemy: {
                known: true as const,
                value: skill,
                provenance: "entered" as const,
              },
              cooking: {
                known: true as const,
                value: skill,
                provenance: "entered" as const,
              },
            },
          },
        },
      });
      const qualifies = (id: string, skill: number, learned = false) =>
        model.methodViews
          .get(id)!
          .requirements.every(
            (root) =>
              evaluateRequirement(root, facts(skill, learned)).status === "met",
          );
      expect(qualifies("recipe-a", 0)).toBe(true);
      expect(qualifies("cooking", 0.1)).toBe(true);
      expect(qualifies("alchemy", 1)).toBe(false);
      expect(qualifies("alchemy", 0.1, true)).toBe(true);
      expect(qualifies("scribing", 0.09)).toBe(false);
      expect(qualifies("scribing", 0.1)).toBe(true);
      const chance = (fraction: number | null) =>
        calculateMethodProbabilities(
          model.rows,
          model.methods.get("scribing")!,
          model.methodViews.get("scribing")!.detail,
          {
            assumptions: {
              ...BASELINE_ASSUMPTIONS,
              professionFraction: fraction,
            },
          },
        ).find(
          (result) =>
            result.target.kind === "item" && result.target.itemId === "arrows",
        )!.probability;
      expect(chance(0.09)).toBe(0);
      expect(chance(0.1)).toBeCloseTo(0.1, 12);
      expect(chance(null)).toBeNull();
      expect(model.methodViews.get("scribing")!.probabilityFactors).toContain(
        "profession",
      );
      f.db
        .prepare(
          "UPDATE acquisition_recipe_details SET tier=0 WHERE id='scribing'",
        )
        .run();
      const unrestricted = await f.model({
        kind: "items",
        itemIds: ["arrows"],
      });
      const scroll = unrestricted.methodViews.get("scribing")!;
      expect(
        scroll.requirements.every(
          (root) =>
            evaluateRequirement(root, {
              subjects: { player: { items: facts(0).subjects.player.items } },
            }).status === "met",
        ),
      ).toBe(true);
      expect(
        scroll.probabilityResults.find(
          (result) =>
            result.target.kind === "item" && result.target.itemId === "arrows",
        )!.probability,
      ).toBe(1);
      expect(scroll.probabilityFactors).not.toContain("profession");
    } finally {
      f.db.close();
    }
  });

  it("keeps class-selected bow ammunition under exactly the same reward choice", async () => {
    const f = fixture();
    try {
      addCreation(f);
      f.insert("classes", {
        id: "ranger",
        name: "Ranger",
        description: "",
        primary_role: "ranged",
        difficulty: 1,
        resource_type: "stamina",
        compatible_races: "[]",
      });
      f.insert("items", { id: "bow", name: "Bow", item_type: "weapon" });
      f.insert("quests", {
        id: "class-quest",
        name: "Class reward",
        quest_type: "kill",
      });
      f.method("class-reward", "quest_complete");
      f.insert("acquisition_quest_details", {
        id: "class-reward",
        quest_id: "class-quest",
        phase: "complete",
      });
      f.insert("quest_reward_slots", {
        id: "bow-slot",
        quest_id: "class-quest",
        ordinal: 0,
        slot_kind: "class",
        class_id: "ranger",
        item_id: "bow",
        amount: 1,
      });
      f.output("bow-output", "class-reward", "bow", 1, { condition_slot: 0 });
      f.output("ammo-output", "class-reward", "arrows", 50, {
        ordinal: 1,
        condition_slot: 0,
      });
      const model = await f.model({
        kind: "requirements",
        entities: [{ kind: "quest", id: "class-quest" }],
      });
      const outputs = model.methodViews.get("class-reward")!.outputs;
      expect(outputs.map((output) => output.requirements)).toEqual([
        outputs[0].requirements,
        outputs[0].requirements,
      ]);
      const ranger = {
        subjects: {
          player: {
            identities: {
              class: {
                known: true as const,
                value: "ranger",
                provenance: "entered" as const,
              },
            },
          },
        },
      };
      const warrior = {
        subjects: {
          player: {
            identities: {
              class: {
                known: true as const,
                value: "warrior",
                provenance: "entered" as const,
              },
            },
          },
        },
      };
      expect(
        evaluateRequirement(outputs[1].requirements[0], ranger).status,
      ).toBe("met");
      expect(
        evaluateRequirement(outputs[1].requirements[0], warrior).status,
      ).toBe("unmet");
      expect(outputs[1].quantity).toEqual({ kind: "exact", value: 50 });
      expect(
        model.methodViews
          .get("class-reward")!
          .probabilityResults.every((result) => result.probability === null),
      ).toBe(true);
    } finally {
      f.db.close();
    }
  });

  it("uses native fractional Adventuring and keeps keyless chests unrestricted", async () => {
    const f = fixture();
    try {
      f.db
        .prepare("UPDATE items SET adventuring_level_needed=.3 WHERE id='pack'")
        .run();
      f.insert("chests", { id: "unlocked", name: "Unlocked", zone_id: "zone" });
      f.method("unlocked-method", "world_chest");
      f.insert("acquisition_world_chest_details", {
        id: "unlocked-method",
        chest_id: "unlocked",
        key_item_id: null,
        outer_success: 0.7,
        gold_min: 0,
        gold_max: 0,
      });
      f.output("unlocked-output", "unlocked-method", "iron");
      const model = await f.model({
        kind: "items",
        itemIds: ["arrows", "iron"],
      });
      const gate = model.methodViews.get("vendor")!.requirements[0];
      expect(
        model.methodViews.get("unlocked-method")!.probabilityFactors,
      ).toEqual([]);
      expect(gate.enforcement).toBe("normal_ui");
      expect(
        evaluateRequirement(gate, {
          subjects: {
            player: {
              metrics: {
                adventuring_fraction: {
                  known: true,
                  value: 0.29,
                  provenance: "entered",
                },
              },
            },
          },
        }).status,
      ).toBe("unmet");
      expect(
        evaluateRequirement(gate, {
          subjects: {
            player: {
              metrics: {
                adventuring_fraction: {
                  known: true,
                  value: 0.3,
                  provenance: "entered",
                },
              },
            },
          },
        }).status,
      ).toBe("met");
      expect(model.methodViews.get("unlocked-method")!.requirements).toEqual(
        [],
      );
      expect(
        model.methodViews
          .get("unlocked-method")!
          .probabilityResults.find((result) => result.event === "attempt")!
          .probability,
      ).toBe(0.7);
    } finally {
      f.db.close();
    }
  });

  it("shares chest access and outer rolls across primary and secondary awards", async () => {
    const f = fixture();
    try {
      f.insert("chests", { id: "locked", name: "Locked", zone_id: "zone" });
      f.method("locked-method", "world_chest");
      f.insert("acquisition_world_chest_details", {
        id: "locked-method",
        chest_id: "locked",
        key_item_id: "key",
        outer_success: 0.7,
        gold_min: 0,
        gold_max: 0,
      });
      f.output("locked-primary", "locked-method", "iron");
      f.insert("loot_pools", { id: "secondary", kind: "resource_secondary" });
      poolEntry(f, "secondary", 0, "iron");
      poolEntry(f, "secondary", 1, "arrows", { probability: 0.4 });
      f.insert("acquisition_method_pools", {
        id: "locked-secondary",
        method_id: "locked-method",
        pool_id: "secondary",
        ordinal: 0,
        event: "attempt",
      });
      const model = await f.model({
        kind: "items",
        itemIds: ["iron", "arrows"],
      });
      const method = model.methods.get("locked-method")!;
      const detail = model.methodViews.get("locked-method")!.detail;
      for (const [chestAccess, accessChance] of [
        ["key", 1],
        ["lockpick", 0.2],
      ] as const) {
        const results = calculateMethodProbabilities(
          model.rows,
          method,
          detail,
          { assumptions: { ...BASELINE_ASSUMPTIONS, chestAccess } },
        );
        const iron = results.find(
          (result) =>
            result.event === "attempt" &&
            result.target.kind === "item" &&
            result.target.itemId === "iron",
        )!;
        const arrows = results.find(
          (result) =>
            result.event === "attempt" &&
            result.target.kind === "item" &&
            result.target.itemId === "arrows",
        )!;
        expect(iron.probability).toBeCloseTo(0.7 * accessChance, 12);
        expect(iron.expectedQuantity).toBeCloseTo(0.7 * accessChance * 1.1, 12);
        expect(arrows.probability).toBeCloseTo(0.7 * accessChance * 0.2, 12);
      }
    } finally {
      f.db.close();
    }
  });
});

describe("original finite probability processes", () => {
  it("aggregates repeated portable-chest first awards before formatting and retains anonymous competitors", async () => {
    const f = fixture();
    try {
      f.insert("items", {
        id: "chest-item",
        name: "Malachite chest",
        item_type: "chest",
      });
      f.insert("loot_pools", { id: "chest-pool", kind: "portable_chest" });
      f.insert("loot_chest_rules", {
        id: "chest-rule",
        pool_id: "chest-pool",
        num_items: 1,
      });
      f.insert("item_pool_definitions", {
        id: "chest-definition",
        item_id: "chest-item",
        pool_id: "chest-pool",
        role: "portable_chest",
      });
      poolEntry(f, "chest-pool", 0, "iron", {
        probability: 0.25,
        duplicate_group: 0,
        cap: 2,
        scales_with_treasure_hunter: 1,
      });
      poolEntry(f, "chest-pool", 1, null, {
        probability: 0.5,
        duplicate_group: 1,
        cap: 1,
      });
      poolEntry(f, "chest-pool", 2, "iron", {
        probability: 0.25,
        duplicate_group: 0,
        cap: 2,
        scales_with_treasure_hunter: 1,
      });
      f.method("open-chest", "portable_chest");
      f.insert("acquisition_item_details", {
        id: "open-chest",
        item_id: "chest-item",
      });
      f.insert("acquisition_method_pools", {
        id: "chest-binding",
        method_id: "open-chest",
        pool_id: "chest-pool",
        ordinal: 0,
        event: "opening",
      });
      f.output("chest-iron", "open-chest", "iron", 1, {
        yield_rule: "pool",
        amount_min: null,
        amount_max: null,
      });
      const model = await f.model({
        kind: "items",
        itemIds: ["chest-item", "iron"],
      });
      const result = model.methodViews.get("open-chest")!.probabilityResults;
      const expected = (0.34375 * (1 - 0.28125 ** 10)) / (1 - 0.28125);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ event: "opening" });
      expect(result[0].probability).toBeCloseTo(expected, 14);
      expect(result[0].expectedQuantity).toBeCloseTo(expected, 14);
      const inspected = projectItemSources(model, "chest-item").inspection
        .portableChestOutcomes;
      expect(inspected).toHaveLength(1);
      expect(inspected[0].probability).toBeCloseTo(expected, 14);
      expect(model.rows.poolEntries).toHaveLength(3);
      expect(model.methodViews.get("open-chest")!.probabilityFactors).toEqual([
        "treasure_hunter",
      ]);
      const boosted = calculateMethodProbabilities(
        model.rows,
        model.methods.get("open-chest")!,
        model.methodViews.get("open-chest")!.detail,
        {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            scenario: "entered",
            treasureHunter: 1,
          },
        },
      );
      expect(boosted[0].probability).toBeCloseTo(
        (0.46375 * (1 - 0.21125 ** 10)) / (1 - 0.21125),
        14,
      );
    } finally {
      f.db.close();
    }
  });

  it("preserves full configured fishing, trash and quality-filtered fallback denominators", async () => {
    const f = fixture();
    try {
      f.insert("gathering_resources", {
        id: "spot",
        name: "Fishing spot",
        is_fishing_spot: 1,
        level: 2,
      });
      f.method("fish", "gather", "fishing");
      f.insert("acquisition_resource_details", {
        id: "fish",
        resource_id: "spot",
        resource_kind: "fishing",
        outer_success: 1,
        gold_min: 0,
        gold_max: 0,
      });
      for (const [id, kind] of [
        ["primary", "fishing_primary"],
        ["trash", "fishing_trash"],
        ["fallback", "fishing_fallback"],
      ])
        f.insert("loot_pools", { id, kind });
      poolEntry(f, "primary", 0, "arrows", { probability: 0.2 });
      for (let ordinal = 1; ordinal < 4; ordinal++)
        poolEntry(f, "primary", ordinal, null, { probability: 0.2 });
      poolEntry(f, "trash", 0, "iron");
      poolEntry(f, "trash", 1, null);
      poolEntry(f, "fallback", 0, "copper", { quality: 1 });
      poolEntry(f, "fallback", 1, null, { quality: 1 });
      poolEntry(f, "fallback", 2, null, { quality: 2 });
      f.insert("loot_fishing_rules", {
        id: "fishing-rule",
        primary_pool_id: "primary",
        trash_pool_id: "trash",
        fallback_pool_id: "fallback",
        spot_tier: 2,
      });
      f.insert("acquisition_method_fishing_rules", {
        id: "fish",
        method_id: "fish",
        fishing_rule_id: "fishing-rule",
      });
      for (const [ordinal, item] of ["arrows", "iron", "copper"].entries())
        f.output(`fish-${item}`, "fish", item, 1, {
          ordinal,
          yield_rule: "pool",
          amount_min: null,
          amount_max: null,
        });
      const model = await f.model({ kind: "items", itemIds: ["arrows"] });
      expect(model.methodViews.get("fish")!.probabilityFactors).toEqual([
        "profession",
        "tool",
        "costume",
      ]);
      const results = calculateMethodProbabilities(
        model.rows,
        model.methods.get("fish")!,
        model.methodViews.get("fish")!.detail,
        {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            scenario: "entered",
            professionFraction: 0.4,
            toolQuality: 2,
            costumePieces: 3,
          },
        },
      );
      const arrow = results.filter(
        (result) =>
          result.target.kind === "item" && result.target.itemId === "arrows",
      );
      expect(
        arrow.find((result) => result.event === "successful_hook")!.probability,
      ).toBeCloseTo(0.115, 12);
      expect(
        arrow.find((result) => result.event === "cast")!.probability,
      ).toBeCloseTo(0.0667, 12);
      const fallback = results.find(
        (result) =>
          result.event === "successful_hook" &&
          result.target.kind === "item" &&
          result.target.itemId === "copper",
      )!;
      f.db
        .prepare(
          "DELETE FROM loot_pool_entries WHERE pool_id='fallback' AND ordinal=2",
        )
        .run();
      const unchanged = await f.model({ kind: "items", itemIds: ["arrows"] });
      const after = calculateMethodProbabilities(
        unchanged.rows,
        unchanged.methods.get("fish")!,
        unchanged.methodViews.get("fish")!.detail,
        {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            scenario: "entered",
            professionFraction: 0.4,
            toolQuality: 2,
            costumePieces: 3,
          },
        },
      );
      expect(
        after.find(
          (result) =>
            result.event === "successful_hook" &&
            result.target.kind === "item" &&
            result.target.itemId === "copper",
        )!.probability,
      ).toEqual(fallback.probability);
    } finally {
      f.db.close();
    }
  });

  it("keeps a withheld required component rather than manufacturing a cheaper method or a root", async () => {
    const f = fixture();
    try {
      f.db
        .prepare(
          "UPDATE acquisition_inputs SET item_id=NULL,withheld=1 WHERE id='merge-cost-1'",
        )
        .run();
      f.db
        .prepare("UPDATE acquisition_methods SET rooted=0 WHERE id='merge'")
        .run();
      const model = await f.model({ kind: "items", itemIds: ["key"] });
      expect(projectItemSources(model, "key").hasKnownSource).toBe(false);
      const method = model.methodViews.get("merge")!;
      expect(method.costGroups[0].inputs).toHaveLength(3);
      expect(method.costGroups[0].inputs[1]).toMatchObject({
        item_id: null,
        amount: 1,
        withheld: 1,
      });
      expect(
        evaluateRequirement(method.requirements[0], {
          subjects: {
            player: {
              items: {
                inventory: {
                  entries: [
                    { itemId: "ash", amount: 1 },
                    { itemId: "sigil", amount: 1 },
                  ],
                  complete: true,
                },
              },
            },
          },
        }).status,
      ).toBe("unknown");
    } finally {
      f.db.close();
    }
  });
});

describe("remaining canonical method and definition families", () => {
  it("locks completed one-time quests while preserving elapsed repeat cycles and partial history", async () => {
    const f = fixture();
    try {
      addQuest(f, "once");
      addQuest(f, "repeat", true);
      const model = await f.model({
        kind: "requirements",
        entities: [
          { kind: "quest", id: "once" },
          { kind: "quest", id: "repeat" },
        ],
      });
      const once = model.requirements
        .get("quest:once")!
        .find((root) => root.phase === "accept")!;
      const status = (
        entries: { questId: string; active: boolean; completed: boolean }[],
        complete = true,
      ) =>
        evaluateRequirement(once, {
          subjects: { player: { quests: { entries, complete } } },
        }).status;
      expect(
        status([{ questId: "once", active: false, completed: true }]),
      ).toBe("unmet");
      expect(
        status([{ questId: "once", active: false, completed: true }], false),
      ).toBe("unmet");
      expect(
        status([{ questId: "once", active: true, completed: false }]),
      ).toBe("unmet");
      expect(
        status([{ questId: "once", active: false, completed: false }]),
      ).toBe("met");
      expect(status([])).toBe("met");
      expect(status([], false)).toBe("unknown");
      const repeat = model.requirements
        .get("quest:repeat")!
        .find((root) => root.phase === "accept")!;
      expect(
        evaluateRequirement(repeat, {
          subjects: {
            player: {
              quests: {
                complete: true,
                entries: [
                  {
                    questId: "repeat",
                    active: false,
                    completed: true,
                    completedAt: "2026-10-17T04:00:00.000Z",
                  },
                ],
              },
            },
          },
          nowUtc: {
            known: true,
            value: "2026-10-17T12:00:00.000Z",
            provenance: "entered",
          },
        }).status,
      ).toBe("met");
    } finally {
      f.db.close();
    }
  });

  it("fingerprints recipe teaching membership and displayed teaching-item facts", async () => {
    const f = fixture();
    try {
      f.insert("items", {
        id: "recipe-book",
        name: "Arrow Recipe",
        item_type: "general",
        recipe_potion_learned_id: "arrows",
        tooltip_html: "<p>Learn to make arrows.</p>",
      });
      f.insert("items", {
        id: "alternate-book",
        name: "Other Arrow Recipe",
        item_type: "general",
        recipe_potion_learned_id: "arrows",
      });
      f.insert("visual_assets", {
        domain: "item",
        entity_id: "recipe-book",
        kind: "icon",
        export_path: "images/items/recipe-book.webp",
        public_path: "images/items/recipe-book.webp",
        source_field: "image",
        source_type: "Sprite",
        width: 16,
        height: 16,
      });
      const request: AcquisitionRequest = {
        kind: "recipes",
        recipeIds: ["arrow-recipe"],
      };
      const rows = await queryAcquisitionRows(f.execute, request);
      const before = publicAcquisitionFingerprint(
        assembleAcquisitionModel(rows),
        request,
      );
      const reordered = {
        ...rows,
        facts: {
          ...rows.facts,
          recipe_teaching_items: [
            ...rows.facts.recipe_teaching_items,
          ].reverse(),
        },
      };
      expect(
        publicAcquisitionFingerprint(
          assembleAcquisitionModel(reordered),
          request,
        ),
      ).toEqual(before);
      f.db
        .prepare(
          "UPDATE items SET recipe_potion_learned_id=NULL WHERE id='recipe-book'",
        )
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(before);
      f.db
        .prepare(
          "UPDATE items SET recipe_potion_learned_id='arrows',name='Revised Arrow Recipe' WHERE id='recipe-book'",
        )
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(before);
      f.db
        .prepare(
          "UPDATE items SET name='Arrow Recipe',tooltip_html='<p>Different recipe details.</p>' WHERE id='recipe-book'",
        )
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(before);
      f.db
        .prepare(
          "UPDATE items SET tooltip_html='<p>Learn to make arrows.</p>' WHERE id='recipe-book'",
        )
        .run();
      f.db
        .prepare(
          "UPDATE visual_assets SET public_path='images/items/revised-recipe-book.webp' WHERE entity_id='recipe-book'",
        )
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(before);
    } finally {
      f.db.close();
    }
  });

  it("retains service batches, selected-instance gates, fragment costs and non-carried housing delivery", async () => {
    const f = fixture();
    try {
      f.method("bless", "blessing");
      f.insert("acquisition_service_details", {
        id: "bless",
        service_role: "blessing",
      });
      f.insert("acquisition_cost_groups", {
        id: "bless-cost",
        method_id: "bless",
        phase: "exchange",
        quantity_rule: "all_carried",
        consumption_rule: "replace_carried_stack",
        selection_rule: "always",
      });
      f.insert("acquisition_inputs", {
        id: "bless-runes",
        cost_group_id: "bless-cost",
        ordinal: 0,
        resource_kind: "item",
        item_id: "rune",
        amount: 1,
        role: "component",
      });
      f.insert("acquisition_inputs", {
        id: "bless-gold",
        cost_group_id: "bless-cost",
        ordinal: 1,
        resource_kind: "gold",
        amount: 75,
        role: "currency",
      });
      f.output("bless-output", "bless", "blessed", 1, {
        yield_rule: "all_carried",
        amount_min: null,
        amount_max: null,
      });
      f.method("exchange", "essence");
      f.insert("acquisition_service_details", {
        id: "exchange",
        service_role: "essence",
      });
      f.cost("exchange-cost", "exchange", [["copper", 1]], "selected_instance");
      f.output("exchange-output", "exchange", "essence", 5);
      f.method("fragment-convert", "fragment");
      f.insert("acquisition_item_details", {
        id: "fragment-convert",
        item_id: "fragment",
      });
      f.cost(
        "fragment-cost",
        "fragment-convert",
        [["fragment", 7]],
        "fragment",
      );
      f.output("converted-key", "fragment-convert", "key");
      f.method("house-buy", "housing");
      f.insert("acquisition_housing_details", {
        id: "house-buy",
        structure_item_id: "workbench",
      });
      f.insert("acquisition_global_roots", {
        id: "house-root",
        method_id: "house-buy",
        origin: "housing",
      });
      f.output("house-output", "house-buy", "workbench", 1, {
        delivery: "placed_structure",
      });
      const model = await f.model({
        kind: "items",
        itemIds: ["blessed", "essence", "key", "workbench"],
      });
      expect(model.methodViews.get("bless")!.outputs[0].quantity).toEqual({
        kind: "unknown",
      });
      expect(model.methodViews.get("bless")!.costGroups[0]).toMatchObject({
        quantity_rule: "all_carried",
        consumption_rule: "replace_carried_stack",
      });
      expect(
        model.methodViews
          .get("exchange")!
          .requirements.map((root) => [root.subject, root.enforcement]),
      ).toEqual([
        ["selected_instance", "normal_ui"],
        ["selected_instance", "server"],
      ]);
      expect(
        model.methodViews.get("fragment-convert")!.costGroups[0].inputs[0]
          .amount,
      ).toBe(7);
      expect(model.methodViews.get("house-buy")!.outputs[0].delivery).toBe(
        "placed_structure",
      );
      expect(projectDirectGeometry(model, "workbench")).toEqual([]);
      const tree = await expandAcquisition(f.execute, {
        itemId: "blessed",
        amount: 10,
        maxDepth: 8,
        maxNodes: 200,
      });
      expect(tree.branches[0]).toMatchObject({
        requiredExecutions: null,
        plannedExecutions: null,
        uncoveredAmount: null,
        yieldedAmount: { kind: "unknown" },
      });
      expect(
        tree.branches[0].ingredients.every(
          (ingredient) => ingredient.amount.kind === "unknown",
        ),
      ).toBe(true);
    } finally {
      f.db.close();
    }
  });

  it("does not expose NPC-only learning and uses veteran spent points for player veteran skills", async () => {
    const f = fixture();
    try {
      addCreation(f);
      f.insert("skills", {
        id: "npc-attack",
        name: "NPC attack",
        skill_type: "attack",
        player_classes: null,
        max_level: 1,
      });
      f.insert("skills", {
        id: "player-veteran",
        name: "Veteran skill",
        skill_type: "passive",
        player_classes: '["warrior"]',
        is_veteran: 1,
        required_spent_points: 3,
        max_level: 3,
        level_requirement: '{"base_value":5,"bonus_per_level":3}',
        skill_point_cost: '{"base_value":0,"bonus_per_level":2}',
      });
      f.insert("npc_skills", {
        id: "cast-first",
        npc_id: "merchant",
        skill_id: "npc-attack",
        skill_index: 0,
      });
      f.insert("npc_skills", {
        id: "cast-repeat",
        npc_id: "merchant",
        skill_id: "npc-attack",
        skill_index: 1,
      });
      const request: AcquisitionRequest = {
        kind: "requirements",
        entities: [
          { kind: "skill", id: "npc-attack" },
          { kind: "skill", id: "player-veteran" },
        ],
      };
      const model = await f.model(request);
      expect(model.requirements.has("skill:npc-attack")).toBe(false);
      expect(model.entities.get("classes")?.get("warrior")?.name).toBe(
        "Warrior",
      );
      const gate = model.requirements.get("skill:player-veteran")![0];
      const facts = {
        subjects: {
          player: {
            metrics: {
              level: {
                known: true as const,
                value: 50,
                provenance: "entered" as const,
              },
              spent_skill_points: {
                known: true as const,
                value: 100,
                provenance: "entered" as const,
              },
              spent_veteran_points: {
                known: true as const,
                value: 2,
                provenance: "entered" as const,
              },
            },
            identities: {
              class: {
                known: true as const,
                value: "warrior",
                provenance: "entered" as const,
              },
            },
          },
        },
      };
      expect(evaluateRequirement(gate, facts).status).toBe("unmet");
      const fingerprint = publicAcquisitionFingerprint(model, request);
      f.db
        .prepare(
          "UPDATE skills SET level_requirement=? WHERE id='player-veteran'",
        )
        .run(JSON.stringify({ base_value: 5, bonus_per_level: 4 }));
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(fingerprint);
    } finally {
      f.db.close();
    }
  });

  it("distinguishes granted interaction ranks from genuine first learning actions", async () => {
    const f = fixture();
    try {
      addCreation(f);
      for (const [id, max_level] of [
        ["interaction", 0],
        ["granted-only", 1],
      ] as const)
        f.insert("skills", {
          id,
          name: id,
          skill_type: "passive",
          player_classes: '["warrior"]',
          learn_default: 1,
          max_level,
        });
      f.insert("skills", {
        id: "upgrade",
        name: "Upgrade",
        skill_type: "passive",
        player_classes: '["warrior"]',
        learn_default: 1,
        max_level: 3,
        tier: 2,
        level_requirement: '{"base_value":5,"bonus_per_level":3}',
        skill_point_cost: '{"base_value":1,"bonus_per_level":2}',
      });
      f.insert("skills", {
        id: "first",
        name: "First",
        skill_type: "passive",
        player_classes: '["warrior"]',
        max_level: 3,
      });
      f.insert("skills", {
        id: "second",
        name: "Second",
        skill_type: "passive",
        player_classes: '["warrior"]',
        max_level: 3,
      });
      for (const [ordinal, predecessor_skill_id] of [
        "first",
        "second",
      ].entries())
        f.insert("skill_predecessors", {
          id: `predecessor-${ordinal}`,
          skill_id: "upgrade",
          ordinal,
          predecessor_skill_id,
          rank: 2,
          withheld: 0,
        });
      const request: AcquisitionRequest = {
        kind: "requirements",
        entities: [
          { kind: "skill", id: "interaction" },
          { kind: "skill", id: "granted-only" },
          { kind: "skill", id: "upgrade" },
        ],
      };
      const model = await f.model(request);
      expect(model.requirements.has("skill:interaction")).toBe(false);
      expect(model.requirements.has("skill:granted-only")).toBe(false);
      const gate = model.requirements.get("skill:upgrade")![0];
      expect(gate.expression).toMatchObject({
        kind: "all",
        operands: expect.arrayContaining([
          {
            kind: "predicate",
            predicate: {
              kind: "metric_at_least",
              subject: "player",
              metric: "level",
              amount: 8,
              unit: "levels",
            },
          },
          {
            kind: "predicate",
            predicate: {
              kind: "metric_at_least",
              subject: "player",
              metric: "available_skill_points",
              amount: 3,
              unit: "points",
            },
          },
          {
            kind: "predicate",
            predicate: {
              kind: "skill_base_rank",
              subject: "player",
              skillId: "first",
              rank: 2,
            },
          },
          {
            kind: "predicate",
            predicate: {
              kind: "skill_base_rank",
              subject: "player",
              skillId: "second",
              rank: 2,
            },
          },
          {
            kind: "predicate",
            predicate: {
              kind: "skill_tier_choice",
              subject: "player",
              skillId: "upgrade",
              tier: 2,
              defaultRank: 1,
            },
          },
        ]),
      });
      const fingerprint = publicAcquisitionFingerprint(model, request);
      f.db
        .prepare("UPDATE skills SET max_level=1 WHERE id='interaction'")
        .run();
      expect(
        publicAcquisitionFingerprint(await f.model(request), request),
      ).not.toEqual(fingerprint);
    } finally {
      f.db.close();
    }
  });

  it("keeps caster identities without traversing their unrelated quest and skill trees", async () => {
    const f = fixture();
    try {
      f.insert("npcs", { id: "other", name: "Other NPC" });
      f.insert("quests", {
        id: "unrelated",
        name: "Unrelated",
        quest_type: "gather_inventory",
      });
      for (const id of ["selected-cast", "other-cast"])
        f.insert("skills", {
          id,
          name: id,
          skill_type: "attack",
          player_classes: "[]",
          max_level: 1,
        });
      f.insert("npc_skills", {
        id: "selected-cast-row",
        npc_id: "merchant",
        skill_id: "selected-cast",
        skill_index: 0,
      });
      f.insert("npc_skills", {
        id: "other-cast-row",
        npc_id: "merchant",
        skill_id: "other-cast",
        skill_index: 1,
      });
      f.insert("npc_quest_memberships", {
        id: "quest-offer",
        npc_id: "merchant",
        quest_id: "unrelated",
        role: "offer",
        ordinal: 0,
      });
      f.insert("npc_quest_memberships", {
        id: "quest-complete",
        npc_id: "other",
        quest_id: "unrelated",
        role: "complete",
        ordinal: 0,
      });
      const caster = await f.model({
        kind: "requirements",
        entities: [{ kind: "skill", id: "selected-cast" }],
      });
      expect(caster.rows.facts.npc_skills.map((row) => row.skill_id)).toEqual([
        "selected-cast",
      ]);
      expect([...caster.entities.get("npcs")!.keys()]).toEqual(["merchant"]);
      expect(caster.rows.entities.npc_spawns).toHaveLength(2);
      expect(caster.rows.entities.quests).toEqual([]);
      const item = await f.model({ kind: "items", itemIds: ["arrows"] });
      expect(item.rows.facts.npc_skills).toEqual([]);
      expect(item.rows.entities.quests).toEqual([]);
      const provider = await f.model({
        kind: "providers",
        providers: [{ kind: "npcs", id: "merchant" }],
      });
      expect(provider.rows.facts.npc_skills.map((row) => row.skill_id)).toEqual(
        ["selected-cast", "other-cast"],
      );
      expect(provider.rows.entities.quests.map((row) => row.id)).toEqual([
        "unrelated",
      ]);
      expect(
        provider.rows.facts.npc_quest_memberships.map((row) => row.role).sort(),
      ).toEqual(["complete", "offer"]);
    } finally {
      f.db.close();
    }
  });

  it("keeps augments out of guaranteed equipment and retains anonymous top-up competition", async () => {
    const f = fixture();
    try {
      const pool = addKill(f, "boss", { is_boss: 1 });
      f.db
        .prepare(
          "UPDATE acquisition_methods SET rule_id='boss_loot' WHERE id='boss'",
        )
        .run();
      f.insert("items", {
        id: "augment",
        name: "Augment",
        item_type: "augment",
        quality: 2,
        augment_is_defensive: 1,
      });
      poolEntry(f, pool, 0, "iron", {
        probability: 0.2,
        cap: 1,
        counts_equipment: 1,
        guaranteed_equipment_candidate: 1,
      });
      poolEntry(f, pool, 1, "copper", {
        probability: 0.3,
        cap: 1,
        counts_equipment: 1,
        guaranteed_equipment_candidate: 1,
      });
      poolEntry(f, pool, 2, "augment", { probability: 1, cap: 1 });
      for (const [ordinal, item] of ["iron", "copper", "augment"].entries())
        f.output(`boss-${item}`, "boss", item, 1, {
          ordinal,
          yield_rule: "pool",
          amount_min: null,
          amount_max: null,
          delivery: "corpse",
        });
      f.insert("luck_tokens", {
        zone_id: "zone",
        zone_name: "Test dungeon",
        boss_luck_token_id: "rune",
      });
      const before = await f.model({
        kind: "items",
        itemIds: ["iron", "augment"],
      });
      expect(before.methodViews.get("boss")!.probabilityFactors).toEqual([
        "fatecharm",
      ]);
      const chance = before.methodViews
        .get("boss")!
        .probabilityResults.find(
          (result) =>
            result.target.kind === "item" && result.target.itemId === "iron",
        )!.probability!;
      expect(chance).toBeGreaterThan(0.2);
      expect(chance).toBeLessThan(1);
      f.db
        .prepare(
          "UPDATE loot_pool_entries SET item_id=NULL,withheld=1 WHERE pool_id=? AND ordinal=1",
        )
        .run(pool);
      f.db
        .prepare("DELETE FROM acquisition_outputs WHERE id='boss-copper'")
        .run();
      const after = await f.model({
        kind: "items",
        itemIds: ["iron", "augment"],
      });
      expect(
        after.methodViews
          .get("boss")!
          .probabilityResults.find(
            (result) =>
              result.target.kind === "item" && result.target.itemId === "iron",
          )!.probability,
      ).toEqual(chance);
      expect(
        projectItemUsages(after, "augment").find(
          (use) => use.kind === "augment",
        )!.compatibility,
      ).toMatchObject({
        categoryRule: "in",
        recoverable: true,
        normalRecoveryGold: 10000,
      });
    } finally {
      f.db.close();
    }
  });
});

describe("method-local gather primary control flow", () => {
  it("uses the Radiant roll's one-unit award instead of a zero configured gift maximum", async () => {
    const f = fixture();
    try {
      f.insert("gathering_resources", {
        id: "spark",
        name: "Radiant Spark",
        is_radiant_spark: 1,
      });
      f.method("spark", "gather", "radiant");
      f.insert("acquisition_resource_details", {
        id: "spark",
        resource_id: "spark",
        resource_kind: "radiant",
        outer_success: 1,
        gold_min: 0,
        gold_max: 0,
      });
      f.output("spark-primary", "spark", "iron", 1, {
        yield_rule: "radiant",
        amount_max: 0,
      });
      const model = await f.model({ kind: "items", itemIds: ["iron"] });
      const method = model.methodViews.get("spark")!;
      expect(method.outputs[0].quantity).toEqual({ kind: "exact", value: 1 });
      const results = calculateMethodProbabilities(
        model.rows,
        model.methods.get("spark")!,
        method.detail,
        {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            professionFraction: 1,
            extraGatherChance: 0.5,
          },
        },
      );
      const award = results.find(
        (result) =>
          result.target.kind === "item" && result.target.itemId === "iron",
      )!;
      expect(award.probability).toBeCloseTo(0.25, 12);
      expect(award.expectedQuantity).toBeCloseTo(0.375, 12);
    } finally {
      f.db.close();
    }
  });

  it("uses canonical quest-progress output bounds rather than a shared template reward", async () => {
    const f = fixture();
    try {
      f.db
        .prepare(
          "UPDATE items SET is_quest_item=1,has_gather_quest=1 WHERE id='iron'",
        )
        .run();
      f.insert("gathering_resources", {
        id: "shared-resource",
        name: "Shared configured resource",
      });
      f.insert("loot_pools", {
        id: "secondary-pool",
        kind: "resource_secondary",
      });
      poolEntry(f, "secondary-pool", 0, "copper", { probability: 0.6 });
      for (const [id, min, max] of [
        ["positive-primary", 1, 1],
        ["zero-branch-primary", 0, 2],
      ] as const) {
        f.method(id, "gather", "gather_fixed");
        f.insert("acquisition_resource_details", {
          id,
          resource_id: "shared-resource",
          resource_kind: "other",
          outer_success: 1,
          gold_min: 0,
          gold_max: 0,
        });
        f.output(`${id}-primary`, id, "iron", 1, {
          yield_rule: "extra_gather",
          amount_min: min,
          amount_max: max,
          delivery: "quest_progress",
        });
        f.insert("acquisition_method_pools", {
          id: `${id}-secondary`,
          method_id: id,
          pool_id: "secondary-pool",
          ordinal: 0,
          event: "attempt",
        });
      }
      f.output("possible-secondary", "zero-branch-primary", "copper", 1, {
        ordinal: 1,
        yield_rule: "pool",
        amount_min: null,
        amount_max: null,
      });
      const model = await f.model({
        kind: "items",
        itemIds: ["iron", "copper"],
      });
      expect(
        model.methodViews
          .get("positive-primary")!
          .probabilityResults.some(
            (result) =>
              result.target.kind === "item" &&
              result.target.itemId === "copper",
          ),
      ).toBe(false);
      expect(
        model.methodViews
          .get("zero-branch-primary")!
          .probabilityResults.find(
            (result) =>
              result.target.kind === "item" &&
              result.target.itemId === "copper",
          )!.probability,
      ).toBeCloseTo(0.2, 12);
    } finally {
      f.db.close();
    }
  });
});

describe("exact summon provider alternatives", () => {
  it("loads each guard group and permits either complete trigger path", async () => {
    const f = fixture();
    try {
      const pool = addKill(f, "summoned");
      poolEntry(f, pool, 0, "iron");
      f.output("summoned-output", "summoned", "iron", 1, {
        yield_rule: "pool",
        amount_min: null,
        amount_max: null,
      });
      for (const suffix of ["a", "b"]) {
        f.insert("monsters", {
          id: `guard-${suffix}`,
          name: `Guard ${suffix}`,
        });
        f.insert("monster_spawns", {
          id: `guard-${suffix}-spawn`,
          monster_id: `guard-${suffix}`,
          zone_id: "zone",
        });
        f.insert("summon_triggers", {
          id: `trigger-${suffix}`,
          summoned_entity_type: "Monster",
          summoned_entity_id: "summoned-monster",
          summoned_entity_name: "Summoned",
          summoned_monster_spawn_id: "summoned-spawn",
          summoned_is_summonable: 1,
          summoned_respawn_time: 30,
          summoned_respawn_probability: 1,
          summoned_death_time: 10,
        });
        f.insert("summon_trigger_placeholders", {
          id: `guard-link-${suffix}`,
          trigger_id: `trigger-${suffix}`,
          spawn_id: `guard-${suffix}-spawn`,
          placeholder_order: 0,
        });
      }
      const model = await f.model({ kind: "items", itemIds: ["iron"] });
      expect(
        model.rows.facts.summon_trigger_placeholders
          .map((row) => row.spawn_id)
          .sort(),
      ).toEqual(["guard-a-spawn", "guard-b-spawn"]);
      const activation = model.methodViews
        .get("summoned")!
        .providers[0].requirements.find((root) => root.phase === "activate")!;
      const status = (a: boolean | null, b: boolean) =>
        evaluateRequirement(activation, {
          world: {
            instanceToken: "current",
            events: {
              complete: true,
              entries: ["a", "b"].map((suffix) => ({
                triggerId: `trigger-${suffix}`,
                instanceToken: "current",
                ready: true,
              })),
            },
            monsters: {
              complete: false,
              entries: [
                ...(a === null
                  ? []
                  : [
                      {
                        monsterSpawnId: "guard-a-spawn",
                        instanceToken: "current",
                        dead: a,
                      },
                    ]),
                {
                  monsterSpawnId: "guard-b-spawn",
                  instanceToken: "current",
                  dead: b,
                },
              ],
            },
          },
        }).status;
      expect(status(true, false)).toBe("met");
      expect(status(false, true)).toBe("met");
      expect(status(false, false)).toBe("unmet");
      expect(status(null, false)).toBe("unknown");
    } finally {
      f.db.close();
    }
  });
});
