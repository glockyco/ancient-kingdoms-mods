import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { calculateChestRewards } from "$lib/calculation/chest-rewards";
import type { ChestRewardRow } from "$lib/queries/chest-rewards";
import {
  aggregateChestRewards,
  getItemSources,
  getGatherSources,
} from "./item-sources";
import { getItemUsages } from "./item-usages";

function fixture() {
  const db = new Database(":memory:");
  db.exec(
    readFileSync(
      new URL("../../../../build-pipeline/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  const insert = (table: string, row: Record<string, unknown>) => {
    const keys = Object.keys(row);
    db.prepare(
      `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    ).run(...Object.values(row));
  };
  const method = (id: string, kind: string, rule_id = kind, rooted = 1) =>
    insert("acquisition_methods", {
      id,
      kind,
      rule_id,
      rooted,
      source_level_hint: 1,
    });
  const output = (id: string, method_id: string, item_id: string, amount = 1) =>
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
    });
  return { db, insert, method, output };
}

test("pack vendors expose direct contents and retain pack inspection without a carried-pack source", async () => {
  const f = fixture();
  try {
    f.insert("zones", { id: "zone", zone_id: 1, name: "Zone" });
    for (const [id, name, item_type] of [
      ["pack", "Pack of 25 Arrows", "pack"],
      ["arrows", "Arrows", "ammo"],
    ])
      f.insert("items", { id, name, item_type, quality: 0 });
    f.insert("npcs", { id: "merchant", name: "Merchant" });
    f.insert("npc_spawns", {
      id: "merchant-spawn",
      npc_id: "merchant",
      zone_id: "zone",
      position_x: 0,
      position_y: 0,
      position_z: 0,
    });
    f.method("sale", "vendor");
    f.insert("acquisition_vendor_details", {
      id: "sale",
      npc_id: "merchant",
      offered_item_id: "pack",
      season: null,
    });
    f.insert("acquisition_providers_npcs", {
      id: "sale-provider",
      method_id: "sale",
      npc_id: "merchant",
    });
    f.output("sale-output", "sale", "arrows", 25);
    f.method("pack-use", "pack_use", "pack_use", 0);
    f.insert("acquisition_item_details", { id: "pack-use", item_id: "pack" });
    f.insert("acquisition_providers_items", {
      id: "pack-provider",
      method_id: "pack-use",
      item_id: "pack",
    });
    f.output("pack-output", "pack-use", "arrows", 25);
    const arrows = await getItemSources(f.db, "arrows");
    expect(arrows.vendors).toMatchObject([{ npc_id: "merchant", amount: 25 }]);
    expect(arrows.packs).toEqual([]);
    expect((await getItemSources(f.db, "pack")).vendors).toMatchObject([
      { npc_id: "merchant" },
    ]);
  } finally {
    f.db.close();
  }
});

test("same-route recipe alternatives keep their own complete ingredient groups and output size", async () => {
  const f = fixture();
  try {
    for (const id of ["arrows", "iron", "wood"])
      f.insert("items", { id, name: id, item_type: "general", quality: 0 });
    f.insert("crafting_recipes", { id: "arrows", result_item_id: "arrows" });
    for (const [id, ingredient, amount] of [
      ["one", "iron", 2],
      ["two", "wood", 3],
    ] as const) {
      f.method(id, "recipe", "crafting");
      f.insert("acquisition_recipe_details", {
        id,
        crafting_recipe_id: "arrows",
        declared_result_item_id: "arrows",
        result_amount: 25,
        tier: 0,
        display_kind: "crafting",
        experience: 0,
      });
      f.insert("acquisition_cost_groups", {
        id,
        method_id: id,
        phase: "attempt",
        quantity_rule: "fixed",
        consumption_rule: "on_success",
        selection_rule: "always",
      });
      f.insert("acquisition_inputs", {
        id,
        cost_group_id: id,
        ordinal: 0,
        resource_kind: "item",
        item_id: ingredient,
        amount,
        role: "material",
      });
      f.output(id, id, "arrows", 25);
    }
    const sources = await getItemSources(f.db, "arrows");
    expect(sources.recipes).toHaveLength(2);
    expect(sources.recipes.map((recipe) => recipe.result_amount)).toEqual([
      25, 25,
    ]);
    expect(sources.recipes.map((recipe) => recipe.materials)).toEqual([
      [{ item_id: "iron", item_name: "iron", amount: 2 }],
      [{ item_id: "wood", item_name: "wood", amount: 3 }],
    ]);
    expect((await getItemUsages(f.db, "iron")).recipes).toMatchObject([
      { amount: 2, result_amount: 25 },
    ]);
  } finally {
    f.db.close();
  }
});

test("ordinary gathering keeps the primary yield range instead of assigning it to secondary rolls", async () => {
  const f = fixture();
  try {
    f.insert("items", {
      id: "ore",
      name: "Ore",
      item_type: "general",
      quality: 0,
    });
    f.insert("gathering_resources", {
      id: "node",
      name: "Node",
      is_mineral: 1,
      level: 0,
    });
    f.method("gather", "gather", "gather_fixed");
    f.insert("acquisition_resource_details", {
      id: "gather",
      resource_id: "node",
      resource_kind: "mineral",
      outer_success: 1,
      gold_min: 0,
      gold_max: 0,
    });
    f.insert("acquisition_outputs", {
      id: "ore",
      method_id: "gather",
      ordinal: 0,
      resource_kind: "item",
      item_id: "ore",
      amount_min: 1,
      amount_max: 3,
      yield_rule: "uniform_inclusive",
      delivery: "inventory",
    });
    expect(await getGatherSources(f.db, "ore")).toMatchObject([
      {
        resource_id: "node",
        amount_min: 1,
        amount_max: 3,
        is_fishing_spot: false,
      },
    ]);
  } finally {
    f.db.close();
  }
});

test("portable chest repeats become one unrounded outcome while retaining roll competition", () => {
  const reward = (
    item_id: string,
    roll_order: number,
    roll_chance: number,
  ): ChestRewardRow => ({
    chest_item_id: "bag",
    chest_name: "Bag",
    chest_num_items: 1,
    item_id,
    item_name: item_id,
    display_name: item_id,
    roll_order,
    roll_chance,
    scales_with_treasure_hunter: 0,
    quality: 1,
    tooltip_html: null,
    item_type: "general",
    relic_buff_id: null,
    relic_buff_name: null,
    withheld: 0,
  });
  const rolls = calculateChestRewards(
    {
      id: "bag",
      num_items: 1,
      rewards: [
        reward("other", 0, 0.5),
        reward("malachite", 1, 0.3),
        reward("malachite", 2, 0.7),
      ],
    },
    0,
  );
  const outcomes = aggregateChestRewards(rolls);
  const malachite = outcomes.filter((row) => row.item_id === "malachite");
  expect(malachite).toHaveLength(1);
  expect(malachite[0].open_chance).toBe(
    rolls[1].open_chance + rolls[2].open_chance,
  );
  expect(malachite[0].open_chance).toBeLessThan(0.5);
});

test("fishing sources keep each spot and the old two per-cast reference loadouts", async () => {
  const f = fixture();
  try {
    f.insert("zones", { id: "zone", zone_id: 1, name: "Zone" });
    for (const id of ["eel", "other", "fallback", "trash"])
      f.insert("items", {
        id,
        name: id,
        item_type: "general",
        quality: id === "fallback" ? 0 : 1,
      });
    for (const [id, quality] of [
      ["rod", 0],
      ["best", 4],
    ] as const)
      f.insert("items", {
        id,
        name: id,
        item_type: "weapon",
        weapon_category: "Fishing Rod",
        quality,
      });
    f.insert("gathering_resources", {
      id: "spot",
      name: "Rough Fishing Spot",
      is_fishing_spot: 1,
      level: 1,
      tool_required_id: "rod",
    });
    f.method("fishing", "gather", "fishing");
    f.insert("acquisition_resource_details", {
      id: "fishing",
      resource_id: "spot",
      resource_kind: "fishing",
      outer_success: 1,
      gold_min: 0,
      gold_max: 0,
    });
    for (const id of ["first", "second"]) {
      f.insert("gathering_resource_spawns", {
        id,
        resource_id: "spot",
        zone_id: "zone",
        position_x: id === "first" ? 1 : 2,
        position_y: 0,
        position_z: 0,
      });
      f.insert("acquisition_providers_resource_spawns", {
        id,
        method_id: "fishing",
        resource_spawn_id: id,
      });
    }
    for (const kind of ["primary", "trash", "fallback"])
      f.insert("loot_pools", { id: kind, kind: `fishing_${kind}` });
    for (const [pool_id, item_id, ordinal, withheld] of [
      ["primary", "eel", 0, 0],
      ["primary", "other", 1, 0],
      ["primary", null, 2, 1],
      ["trash", "trash", 0, 0],
      ["fallback", "fallback", 0, 0],
    ] as const)
      f.insert("loot_pool_entries", {
        id: `${pool_id}-${ordinal}`,
        pool_id,
        item_id,
        ordinal,
        withheld,
        resolution: "direct",
        probability: 0.2,
        duplicate_group: ordinal,
        counts_equipment: 0,
        guaranteed_equipment_candidate: 0,
        quest_gate: "none",
        scales_with_treasure_hunter: 0,
        quality: pool_id === "fallback" ? 0 : 1,
      });
    f.insert("loot_fishing_rules", {
      id: "rule",
      primary_pool_id: "primary",
      trash_pool_id: "trash",
      fallback_pool_id: "fallback",
      spot_tier: 1,
    });
    f.insert("acquisition_method_fishing_rules", {
      id: "fishing",
      method_id: "fishing",
      fishing_rule_id: "rule",
    });
    f.insert("acquisition_outputs", {
      id: "eel",
      method_id: "fishing",
      ordinal: 0,
      resource_kind: "item",
      item_id: "eel",
      yield_rule: "pool",
      delivery: "inventory",
    });
    const sources = await getGatherSources(f.db, "eel");
    expect(sources).toHaveLength(2);
    expect(sources.map((source) => source.spawn_id).sort()).toEqual([
      "first",
      "second",
    ]);
    for (const source of sources) {
      expect(source.fishing_source_role).toBe("primary");
      expect(source.drop_rate).toBe(0.2);
      expect(source.fishing_chance_min).toBeCloseTo(0.02);
      expect(source.fishing_chance_max).toBeCloseTo(0.2533333333);
    }
  } finally {
    f.db.close();
  }
});

test("boss source rows retain configured rolls alongside the per-kill process result", async () => {
  const f = fixture();
  try {
    f.insert("zones", {
      id: "zone",
      zone_id: 1,
      name: "Dungeon",
      is_dungeon: 1,
    });
    for (const id of ["helm", "boots"])
      f.insert("items", { id, name: id, item_type: "equipment", quality: 1 });
    f.insert("loot_pools", { id: "pool", kind: "monster" });
    for (const [ordinal, item_id] of ["helm", "boots"].entries())
      f.insert("loot_pool_entries", {
        id: item_id,
        pool_id: "pool",
        ordinal,
        item_id,
        resolution: "direct",
        probability: 0.5,
        duplicate_group: ordinal,
        counts_equipment: 1,
        guaranteed_equipment_candidate: 1,
        quest_gate: "none",
        scales_with_treasure_hunter: 0,
        quality: 1,
      });
    f.insert("monsters", {
      id: "boss",
      name: "Boss",
      level: 50,
      level_min: 50,
      level_max: 50,
      is_boss: 1,
      loot_pool_id: "pool",
    });
    f.insert("monster_spawns", {
      id: "spawn",
      monster_id: "boss",
      zone_id: "zone",
      level: 50,
      position_x: 0,
      position_y: 0,
      position_z: 0,
    });
    f.method("kill", "kill", "boss_loot");
    f.insert("acquisition_kill_details", {
      id: "kill",
      monster_id: "boss",
      loot_pool_id: "pool",
      loot_zone_number: 1,
      loot_zone_id: "zone",
      loot_zone_withheld: 0,
      respawn: 1,
      exp_multiplier: 1,
      is_boss: 1,
      is_elite: 0,
      is_hunt: 0,
      is_summoned_pet: 0,
      event_kind: "authored",
      gold_min: 0,
      gold_max: 0,
      gold_probability: 0,
    });
    f.insert("acquisition_providers_monster_spawns", {
      id: "provider",
      method_id: "kill",
      monster_spawn_id: "spawn",
    });
    f.insert("acquisition_method_pools", {
      id: "binding",
      method_id: "kill",
      pool_id: "pool",
      ordinal: 0,
      event: "corpse_generation",
    });
    f.insert("acquisition_outputs", {
      id: "helm",
      method_id: "kill",
      ordinal: 0,
      resource_kind: "item",
      item_id: "helm",
      yield_rule: "pool",
      delivery: "corpse",
    });
    const [source] = (await getItemSources(f.db, "helm")).monsters;
    expect(source.drop_rate).toBe(0.5);
    expect(source.per_kill_chance).toBeCloseTo(0.625);
    expect(source.per_kill_chance_with_fatecharm).toBeUndefined();
  } finally {
    f.db.close();
  }
});

test("an altar boss's own loot and a distribution it rolls are drops, while tier rewards stay altar rows", async () => {
  const f = fixture();
  try {
    f.insert("zones", { id: "zone", zone_id: 1, name: "Zone" });
    for (const [id, item_type] of [
      ["aegis", "equipment"],
      ["ring", "equipment"],
      ["random_map", "random"],
      ["old_map", "treasure_map"],
    ])
      f.insert("items", { id, name: id, item_type, quality: 1 });
    f.insert("altars", {
      id: "altar",
      name: "Altar",
      type: "forgotten",
      zone_id: "zone",
      magic_reward_threshold: 40,
      epic_reward_threshold: 50,
      legendary_reward_threshold: 150,
    });
    f.insert("monsters", {
      id: "avatar",
      name: "Avatar",
      level: 58,
      level_min: 58,
      level_max: 58,
      is_boss: 1,
    });
    f.insert("loot_pools", { id: "boss_pool", kind: "monster" });
    f.insert("loot_pools", { id: "maps", kind: "random" });
    f.insert("item_pool_definitions", {
      id: "random_map_definition",
      item_id: "random_map",
      pool_id: "maps",
      role: "random",
    });
    const entry = (
      id: string,
      pool_id: string,
      ordinal: number,
      item_id: string,
      probability: number,
      child_pool_id: string | null = null,
    ) =>
      f.insert("loot_pool_entries", {
        id,
        pool_id,
        ordinal,
        item_id,
        child_pool_id,
        resolution: child_pool_id ? "uniform_child" : "direct",
        probability,
        duplicate_group: ordinal,
        counts_equipment: 0,
        guaranteed_equipment_candidate: 0,
        quest_gate: "none",
        scales_with_treasure_hunter: 0,
        quality: 1,
      });
    entry("aegis_entry", "boss_pool", 0, "aegis", 0.05);
    entry("wrapper_entry", "boss_pool", 1, "random_map", 0.01, "maps");
    entry("old_map_entry", "maps", 0, "old_map", 1);
    f.method("final", "kill", "altar_final_loot");
    f.insert("acquisition_kill_details", {
      id: "final",
      monster_id: "avatar",
      loot_pool_id: "boss_pool",
      loot_zone_number: 1,
      loot_zone_id: "zone",
      loot_zone_withheld: 0,
      respawn: 0,
      exp_multiplier: 1,
      is_boss: 1,
      is_elite: 0,
      is_hunt: 0,
      is_summoned_pet: 0,
      altar_id: "altar",
      wave_number: 2,
      wave_member_index: 0,
      event_kind: "altar_final",
      gold_min: 0,
      gold_max: 0,
      gold_probability: 0,
    });
    f.insert("acquisition_providers_altars", {
      id: "provider",
      method_id: "final",
      altar_id: "altar",
    });
    f.insert("acquisition_method_pools", {
      id: "binding",
      method_id: "final",
      pool_id: "boss_pool",
      ordinal: 0,
      event: "eligible_kill",
    });
    for (const [ordinal, item_id, condition_slot] of [
      [0, "aegis", null],
      [1, "old_map", null],
      [2, "ring", 1],
    ] as const)
      f.insert("acquisition_outputs", {
        id: `output_${item_id}`,
        method_id: "final",
        ordinal,
        resource_kind: "item",
        item_id,
        yield_rule: condition_slot === null ? "pool" : "fixed",
        amount_min: condition_slot === null ? null : 1,
        amount_max: condition_slot === null ? null : 1,
        condition_slot,
        delivery: "corpse",
      });

    const aegis = await getItemSources(f.db, "aegis");
    expect(aegis.altars).toEqual([]);
    expect(aegis.monsters).toMatchObject([
      { monster_id: "avatar", drop_rate: 0.05 },
    ]);

    const ring = await getItemSources(f.db, "ring");
    expect(ring.monsters).toEqual([]);
    expect(ring.altars).toMatchObject([
      { altar_id: "altar", reward_tier: "magic" },
    ]);

    const wrapper = await getItemSources(f.db, "random_map");
    expect(wrapper.altars).toEqual([]);
    expect(wrapper.monsters).toMatchObject([
      { monster_id: "avatar", drop_rate: 0.01 },
    ]);
  } finally {
    f.db.close();
  }
});

test("merge sources and reverse uses retain every component including a withheld conjunct", async () => {
  const f = fixture();
  try {
    for (const id of ["key", "shard", "emblem"])
      f.insert("items", { id, name: id, item_type: "general", quality: 0 });
    f.method("merge", "merge");
    f.insert("acquisition_item_details", { id: "merge", item_id: "shard" });
    f.insert("acquisition_providers_items", {
      id: "merge-provider",
      method_id: "merge",
      item_id: "shard",
    });
    f.insert("acquisition_cost_groups", {
      id: "merge-cost",
      method_id: "merge",
      phase: "use",
      quantity_rule: "fixed",
      consumption_rule: "on_success",
      selection_rule: "always",
    });
    for (const [ordinal, item_id] of ["shard", "emblem", null].entries()) {
      f.insert("acquisition_inputs", {
        id: `component-${ordinal}`,
        cost_group_id: "merge-cost",
        ordinal,
        resource_kind: "item",
        item_id,
        amount: 1,
        role: "component",
        withheld: item_id === null ? 1 : 0,
      });
    }
    f.output("merge-output", "merge", "key");
    expect((await getItemSources(f.db, "key")).merges).toMatchObject([
      {
        component_item_ids: ["shard", "emblem", ""],
        component_item_names: ["shard", "emblem", "Unpublished component"],
      },
    ]);
    expect(
      (await getItemUsages(f.db, "shard")).merges[0].all_components,
    ).toEqual([
      { item_id: "shard", item_name: "shard" },
      { item_id: "emblem", item_name: "emblem" },
      { item_id: "", item_name: "Unpublished component" },
    ]);
  } finally {
    f.db.close();
  }
});

test("seasonal sources carry drop, quest and containing-pack seasons", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const drops = (await getItemSources(db, "spook_token")).monsters;
    expect(drops.map((row) => row.monster_id).sort()).toEqual([
      "pumpkin_head",
      "witch",
    ]);
    expect(drops.every((row) => row.seasons.join(",") === "halloween")).toBe(
      true,
    );
    const quests = (await getItemSources(db, "pack_3_festival_token")).quests;
    expect(quests).toHaveLength(3);
    expect(quests.every((row) => row.seasons.join(",") === "christmas")).toBe(
      true,
    );
    expect(
      quests.some((row) => row.quest_id === "a_wish_for_the_winter_heart"),
    ).toBe(true);
    const packs = (await getItemSources(db, "winter_festival_coin")).packs;
    expect(packs).toMatchObject([
      {
        pack_item_id: "pack_3_winter_festival_coin",
        amount: 3,
        seasons: ["christmas"],
      },
    ]);
  } finally {
    db.close();
  }
});

test("drop rows name the zones whose placements carry the drop", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const templarRows = async (itemId: string) =>
      (await getItemSources(db, itemId)).monsters
        .filter((row) => row.monster_id === "fire_templar")
        .map((row) => ({
          zones: row.zones.map((zone) => zone.zone_name),
          rate: row.drop_rate,
        }));
    expect(await templarRows("black_pearl")).toEqual([
      { zones: ["Despair"], rate: expect.closeTo(0.1, 2) },
      { zones: ["Molten Sanctuary"], rate: expect.closeTo(0.01, 2) },
    ]);
    expect(await templarRows("ashen_key_shard")).toEqual([
      { zones: ["Molten Sanctuary"], rate: expect.closeTo(0.01, 2) },
    ]);
  } finally {
    db.close();
  }
});

test("gather rows name every zone that holds the resource", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const gathers = (await getItemSources(db, "black_pearl")).gathers;
    const zones = (resourceId: string) =>
      gathers
        .filter((row) => row.resource_id === resourceId)
        .map((row) => row.zones.map((zone) => zone.zone_name));
    expect(zones("beryllium_ore")).toEqual([
      [
        "Abandoned Mines",
        "Despair",
        "The Molten Summit",
        "Vault of the Vanished",
      ],
    ]);
    // A fishing row stands for one spot, so it names only that spot's zone.
    const fishing = (await getItemSources(db, "blue_dartfish")).gathers.filter(
      (row) => row.is_fishing_spot,
    );
    expect(fishing.length).toBeGreaterThan(1);
    expect(fishing.every((row) => row.zones.length === 1)).toBe(true);
  } finally {
    db.close();
  }
});

test("seasonal shop and currency uses share projected offer seasons", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const sources = await getItemSources(db, "pack_10_skyflares");
    expect(sources.vendors).toEqual([]);
    expect(sources.seasonal.map((row) => row.season)).toEqual([
      "halloween",
      "christmas",
    ]);
    const usages = await getItemUsages(db, "festival_token");
    const offers = usages.currency.filter(
      (row) => row.purchasable_item_id === "pack_10_skyflares",
    );
    expect([...new Set(offers.map((row) => row.season))].sort()).toEqual([
      "christmas",
      "halloween",
    ]);
  } finally {
    db.close();
  }
});
