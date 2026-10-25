import { test } from "vitest";
import assert from "node:assert/strict";
import {
  chestDescription,
  gatheringResourceDescription,
  itemDescription,
  monsterDescription,
  questDescription,
  recipeDescription,
  skillDescription,
} from "./meta-description.ts";
import type { Item } from "$lib/queries/items";
import type { ItemUsages } from "$lib/types/item-sources";
import { detailTitle } from "$lib/seo/title";
import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getItemSourcesFromModel, loadItemSourceModel } from "./item-sources";
import { projectItemSeasons } from "$lib/acquisition/projections";

for (const [id, expected] of [
  [
    "festive_cookie",
    [
      "Sold by repair merchants during the Winter Festival for 1 Winter Festival Coin.",
    ],
  ],
  ["spook_token", ["Dropped by Pumpkin Head and Witch during Halloween."]],
  [
    "winter_festival_coin",
    ["Winter Festival", "Pack 3 Winter Festival Coin", "3 per pack"],
  ],
] as const) {
  test(`${id} metadata states its seasonal acquisition`, async () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const item = db
        .prepare("SELECT * FROM items WHERE id = ?")
        .get(id) as Item;
      const model = await loadItemSourceModel(db, [id]);
      const out = itemDescription(item, {
        sources: await getItemSourcesFromModel(db, model, id),
        seasons: projectItemSeasons(model, id),
      });
      for (const phrase of expected) assert.ok(out.includes(phrase), out);
    } finally {
      db.close();
    }
  });
}

const skill = {
  name: "Avatar of War",
  skill_type: "target_buff",
  tier: 4,
  max_level: 1,
  level_required: 1,
  player_classes: ["warrior"],
  required_skill_points: 1,
  required_spent_points: 40,
  prerequisite_skill_name: "Mend",
  prerequisite_level: 5,
  is_veteran: false,
  monster_count: 0,
  mercenary_user_count: 0,
  pet_user_count: 0,
  granted_by: {
    scroll: 0,
    potion_buff: 0,
    food_buff: 0,
    relic_buff: 0,
    weapon_proc: 0,
  },
};

const quest = {
  name: "Quest",
  quest_type: "location",
  level_required: 1,
  is_main_quest: true,
  is_epic_quest: false,
  is_adventurer_quest: false,
  is_repeatable: false,
  is_find_npc_quest: false,
  turn_in_npc_name: "Heleath Iceforged",
  turn_in_npc_zone_name: "The Lone-lands",
};

test("learning metadata preserves tier and prerequisite quantities", () => {
  const out = skillDescription(skill);
  assert.ok(out.includes("Mend"));
  assert.ok(out.includes("40"));
  assert.ok(out.includes("5"));
  assert.ok(out.includes("4"));
  assert.ok(!out.includes("level 1"));
});

test("non-player skills do not inherit learning requirements", () => {
  const out = skillDescription({
    ...skill,
    player_classes: [],
    monster_count: 1,
    monster_names: ["Air Elemental"],
  });
  assert.ok(out.includes("Air Elemental"));
  assert.ok(!out.includes("Mend"));
  assert.ok(!out.includes("40"));
});

test("skill metadata includes resolved ownership and effect data", () => {
  const out = skillDescription({
    ...skill,
    player_classes: [],
    granted_by: { ...skill.granted_by, food_buff: 1 },
    granting_item_names: ["Arcane Dartfish Soup"],
    effect_summary: "+1% Spell Power",
  });
  assert.ok(out.includes("Arcane Dartfish Soup"));
  assert.ok(out.includes("+1%"));
});

test("monster metadata keeps ordinary and special origins together", () => {
  const out = monsterDescription(
    {
      name: "Skeleton",
      type_name: "Undead",
      is_boss: false,
      is_elite: false,
      is_fabled: false,
      is_hunt: false,
      level_min: 3,
      level_max: 29,
      triggered_origins: [
        {
          monster_name: "Large Shade Beast",
          zone_name: "Vault of the Vanished",
          trigger: "death",
        },
      ],
    },
    ["Twilight Forest", "Twilight Forest"],
    { altar_name: "Forgotten Altar", zone_name: "The Lone-lands" },
    null,
  );
  for (const name of [
    "Twilight Forest",
    "Forgotten Altar",
    "The Lone-lands",
    "Large Shade Beast",
    "Vault of the Vanished",
  ]) {
    assert.ok(out.includes(name), name);
  }
  assert.equal(out.split("Twilight Forest").length - 1, 1);
});

test("location metadata keeps both the objective and turn-in locations", () => {
  const out = questDescription(quest, [
    {
      type: "discover",
      name: "Inner Sanctum",
      zone_name: "Despair",
      amount: 1,
    },
  ]);
  for (const name of [
    "Inner Sanctum",
    "Despair",
    "Heleath Iceforged",
    "The Lone-lands",
  ])
    assert.ok(out.includes(name));
});

test("find metadata preserves the target zone without a duplicate turn-in", () => {
  const out = questDescription({ ...quest, is_find_npc_quest: true }, [
    {
      type: "find",
      name: "Heleath Iceforged",
      zone_name: "The Lone-lands",
      amount: 1,
    },
  ]);
  assert.equal(out.split("Heleath Iceforged").length - 1, 1);
  assert.ok(out.includes("The Lone-lands"));
});

test("recipe metadata preserves ingredient amounts and zero-based tiers", () => {
  const out = recipeDescription(
    { result_item_name: "Armor", type: "Alchemy", level_required: 4 },
    [
      { item_name: "Primal Essence", amount: 2500 },
      { item_name: "Gold Ore", amount: 3 },
      { item_name: "Gem", amount: 1 },
    ],
  );
  assert.ok(out.includes("V"));
  assert.ok(out.includes("2\u202F500"));
  assert.ok(out.includes("Gold Ore"));
  assert.ok(!out.includes("level 4"));
});

test("chest metadata converts exclusive gold bounds exactly once", () => {
  const out = chestDescription({
    zone_name: "Everfrost",
    key_required_name: null,
    gold_min: 5,
    gold_max: 15,
    item_reward_name: null,
    respawn_time: 0,
    chest_reward_probability: 0.75,
  });
  assert.ok(out.includes("5-14"));
  assert.ok(!out.includes("15"));
  assert.ok(out.includes("75%"));
});

test("gathering metadata retains the base yield range", () => {
  const out = gatheringResourceDescription(
    {
      name: "Bellflower",
      is_plant: true,
      is_fishing_spot: false,
      is_mineral: false,
      is_radiant_spark: false,
      level: 0,
      item_reward_name: "Bellflower",
      item_reward_amount: 2,
    },
    ["Twilight Forest"],
  );
  assert.ok(out.includes("1-2"));
});

test("treasure map metadata uses its actual reward", () => {
  const out = itemDescription({ item_type: "treasure_map" } as Item, {
    treasureLocation: { zone_name: "Everfrost", reward_name: "Red Scabbard" },
  });
  assert.ok(out.includes("Red Scabbard"));
  assert.ok(out.includes("Everfrost"));
});

test("currency metadata counts purchasable items rather than merchant listings", () => {
  const usages = {
    recipes: [],
    quests: [],
    currency: [
      { purchasable_item_id: "one" },
      { purchasable_item_id: "one" },
      { purchasable_item_id: "two" },
    ],
    altars: [],
    portals: [],
    chests: [],
    merges: [],
  } as unknown as ItemUsages;
  const out = itemDescription({ item_type: "general", quality: 0 } as Item, {
    usages,
  });
  assert.ok(out.includes("2"));
  assert.ok(!out.includes("3"));
});

test("titles keep loaded context and remove repeated context", () => {
  const out = detailTitle("Skeleton Archer", {
    family: "Companion",
    source: "Necromancer Mercenary",
    className: "Companion",
  });
  assert.ok(out.includes("Skeleton Archer"));
  assert.ok(out.includes("Necromancer Mercenary"));
  assert.equal(out.split("Companion").length - 1, 1);
});

test("base skills do not advertise learning gates", () => {
  const out = skillDescription({ ...skill, base_skill: true });
  assert.ok(!out.includes("Mend"));
  assert.ok(!out.includes("40"));
});

test("NPC-only skill metadata names the caster without player learning gates", () => {
  const out = skillDescription({
    ...skill,
    player_classes: [],
    npc_names: ["Guard"],
    npc_count: 1,
  });
  assert.ok(out.includes("Guard"));
  assert.ok(!out.includes("Mend"));
  assert.ok(!out.includes("40"));
});

test("chest access metadata retains both ways to open a locked chest", () => {
  const out = chestDescription({
    zone_name: "Everfrost",
    key_required_name: "Rusty Chest Key",
    gold_min: 0,
    gold_max: 0,
    item_reward_name: null,
    respawn_time: 0,
  });
  assert.ok(out.includes("Rusty Chest Key"));
  assert.ok(out.includes("Lockpicking"));
});

test("portable chest metadata counts duplicate awards once", () => {
  const out = itemDescription({
    item_type: "chest",
    chest_num_items: 3,
    chest_rewards: JSON.stringify([
      { probability: 1, duplicate_group: 0 },
      { probability: 1, duplicate_group: 0 },
      { probability: 1, duplicate_group: 1 },
    ]),
  } as Item);
  assert.ok(out.includes("2 fixed items"));
  assert.ok(!out.includes("3 fixed items"));
});

test("guaranteed random-wrapper rolls do not claim fixed portable chest contents", () => {
  const out = itemDescription({
    item_type: "chest",
    chest_num_items: 1,
    chest_rewards: JSON.stringify([
      { probability: 1, duplicate_group: 0, resolution: "uniform_child" },
    ]),
  } as Item);
  assert.ok(out.includes("up to 1 item"));
  assert.ok(!out.includes("fixed"));
});

test("scroll metadata credits Scroll Mastery only for spells with several ranks", () => {
  const scroll = {
    item_type: "scroll",
    is_repair_kit: false,
    scroll_skill_name: "Skyflare",
  } as Item;
  assert.equal(
    itemDescription(scroll, { scrollSkillMaxRank: 1 }),
    "Casts Skyflare.",
  );
  assert.ok(
    itemDescription(scroll, { scrollSkillMaxRank: 5 }).includes(
      "Scroll Mastery",
    ),
  );
});
