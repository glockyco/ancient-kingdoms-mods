import { test } from "vitest";
import assert from "node:assert/strict";
import {
  chestDescription,
  gatheringResourceDescription,
  itemDescription,
  monsterDescription,
  questDescription,
  skillDescription,
} from "./meta-description.ts";
import type { Item } from "$lib/queries/items";
import type { ItemUseView } from "$lib/acquisition/types";
import { detailTitle } from "$lib/seo/title";
import type { PrimaryReward } from "$lib/utils/primary-rewards";

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

test("chest metadata retains evaluated gold bounds and every reward alternative", () => {
  const rewards: PrimaryReward[] = [
    {
      resourceKind: "gold",
      itemId: null,
      itemName: null,
      withheld: false,
      quantity: { kind: "range", min: 5, max: 14 },
      delivery: "inventory",
      methodIds: ["one"],
      variants: [],
    },
    {
      resourceKind: "item",
      itemId: "flower",
      itemName: "Bellflower",
      withheld: false,
      quantity: { kind: "range", min: 1, max: 4 },
      delivery: "inventory",
      methodIds: ["two"],
      variants: [],
    },
  ];
  const out = chestDescription({
    zone_name: "Everfrost",
    keys: [],
    primaryRewards: rewards,
    respawn_time: 0,
  });
  assert.ok(out.includes("5-14 gold"));
  assert.ok(out.includes("1-4 Bellflower"));
});

test("gathering metadata retains canonical yield ranges without inventing unknown quantities", () => {
  const rewards: PrimaryReward[] = [
    {
      resourceKind: "item",
      itemId: "lily",
      itemName: "Lily",
      withheld: false,
      quantity: { kind: "range", min: 1, max: 4 },
      delivery: "inventory",
      methodIds: ["one", "two"],
      variants: [],
    },
    {
      resourceKind: "item",
      itemId: null,
      itemName: null,
      withheld: true,
      quantity: { kind: "unknown" },
      delivery: "quest_progress",
      methodIds: ["three"],
      variants: [],
    },
  ];
  const out = gatheringResourceDescription(
    {
      name: "Lily",
      is_plant: true,
      is_fishing_spot: false,
      is_mineral: false,
      is_radiant_spark: false,
      level: 0,
      primaryRewards: rewards,
    },
    ["Twilight Forest"],
  );
  assert.ok(out.includes("1-4 Lily"));
  assert.ok(out.includes("unknown amount"));
  assert.ok(out.includes("quest progress"));
});

test("treasure map metadata uses its actual reward", () => {
  const out = itemDescription({ item_type: "treasure_map" } as Item, {
    treasureLocation: { zone_name: "Everfrost", reward_name: "Red Scabbard" },
  });
  assert.ok(out.includes("Red Scabbard"));
  assert.ok(out.includes("Everfrost"));
});

test("currency metadata counts purchasable items rather than merchant listings", () => {
  const usages = ["one", "one", "two"].map((itemId) => ({
    kind: "cost",
    method: {
      kind: "vendor",
      methodId: `vendor:${itemId}`,
      outputs: [{ item_id: itemId }],
    },
  })) as unknown as ItemUseView[];
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

test("non-equipment metadata retains canonical use restrictions", () => {
  const out = itemDescription({ item_type: "general", quality: 0 } as Item, {
    requirements: [
      {
        phase: "use",
        subject: "player",
        enforcement: "both",
        expression: {
          kind: "predicate",
          predicate: {
            kind: "metric_at_least",
            subject: "player",
            metric: "level",
            amount: 12,
            unit: "level",
          },
        },
      },
    ],
  });
  assert.ok(out.includes("12"));
  assert.ok(out.includes("Requirements:"));
});
