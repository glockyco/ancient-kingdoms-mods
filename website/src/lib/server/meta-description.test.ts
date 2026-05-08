import { test } from "vitest";
import assert from "node:assert/strict";
import {
  itemDescription,
  questDescription,
  skillDescription,
} from "./meta-description.ts";
import type { Item } from "$lib/queries/items";

const baseQuest = {
  name: "Quest",
  quest_type: "kill",
  level_required: 10,
  is_main_quest: false,
  is_epic_quest: false,
  is_adventurer_quest: false,
  is_repeatable: false,
  is_find_npc_quest: false,
  turn_in_npc_name: null as string | null,
  turn_in_npc_zone_name: null as string | null,
};

// =============================================================================
// Skeleton — name lead-in dropped; description starts with the tier.
// =============================================================================

test("questDescription: name is NOT echoed in the description body", () => {
  // Regression: descriptions used to start with "{quest.name} — ", which
  // duplicated the page <title> and burned ~30 chars of SERP budget on a
  // signal Google already had from the title.
  const out = questDescription(
    { ...baseQuest, name: "Some Long Quest Name", quest_type: "general" },
    [],
  );
  assert.ok(!out.includes("Some Long Quest Name"));
  assert.equal(out, "Quest for level 10+.");
});

test("questDescription: tier flags routed in priority order", () => {
  const main = questDescription(
    {
      ...baseQuest,
      quest_type: "general",
      is_main_quest: true,
      is_epic_quest: true,
      is_adventurer_quest: true,
      is_repeatable: true,
    },
    [],
  );
  assert.equal(main, "Main story quest for level 10+.");

  const epic = questDescription(
    {
      ...baseQuest,
      quest_type: "general",
      is_epic_quest: true,
      is_repeatable: true,
    },
    [],
  );
  assert.equal(epic, "Epic quest for level 10+.");

  const adv = questDescription(
    {
      ...baseQuest,
      quest_type: "general",
      is_adventurer_quest: true,
    },
    [],
  );
  assert.equal(adv, "Adventurer task for level 10+.");

  const rep = questDescription(
    {
      ...baseQuest,
      quest_type: "general",
      is_repeatable: true,
    },
    [],
  );
  assert.equal(rep, "Repeatable quest for level 10+.");
});

test("questDescription: level 0 omits the level phrase", () => {
  const out = questDescription(
    { ...baseQuest, quest_type: "general", level_required: 0 },
    [],
  );
  assert.equal(out, "Quest.");
});

test("questDescription: general quest_type skips the objective sentence", () => {
  // Even if the loader pushed objectives, a 'general' quest is just a
  // talk-to-NPC story beat — there's nothing mechanical to summarize.
  const out = questDescription({ ...baseQuest, quest_type: "general" }, [
    { type: "kill", name: "ignored", amount: 1 },
  ]);
  assert.equal(out, "Quest for level 10+.");
});

// =============================================================================
// kill quests (KillQuest.cs)
// =============================================================================

test("questDescription: kill — single target with destination", () => {
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "kill",
      turn_in_npc_name: "Captain Volkar",
      turn_in_npc_zone_name: "Stoneholm",
    },
    [{ type: "kill", name: "Gray Wolf", amount: 5 }],
  );
  assert.equal(
    out,
    "Quest for level 10+. Defeat 5 Gray Wolf. Report to Captain Volkar in Stoneholm.",
  );
});

test("questDescription: kill — boss line drops the '1' and includes destination", () => {
  // The Fall of Grimlok pattern: 50 grunts + 1 named boss.
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "kill",
      is_main_quest: true,
      level_required: 17,
      turn_in_npc_name: "Hunter Mira",
      turn_in_npc_zone_name: "Trollmire Outpost",
    },
    [
      { type: "kill", name: "Troll", amount: 50 },
      { type: "kill", name: "Troll King Grimlok", amount: 1 },
    ],
  );
  assert.equal(
    out,
    "Main story quest for level 17+. Defeat 50 Troll and Troll King Grimlok. Report to Hunter Mira in Trollmire Outpost.",
  );
});

test("questDescription: turn-in NPC without zone still renders cleanly", () => {
  // Defensive: zone is missing but NPC name is known. No "in <zone>" suffix,
  // no double space, no trailing comma.
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "kill",
      turn_in_npc_name: "Captain Volkar",
      turn_in_npc_zone_name: null,
    },
    [{ type: "kill", name: "Gray Wolf", amount: 5 }],
  );
  assert.equal(
    out,
    "Quest for level 10+. Defeat 5 Gray Wolf. Report to Captain Volkar.",
  );
});

test("questDescription: no turn-in NPC at all — no destination suffix", () => {
  const out = questDescription({ ...baseQuest, quest_type: "kill" }, [
    { type: "kill", name: "Gray Wolf", amount: 5 },
  ]);
  assert.equal(out, "Quest for level 10+. Defeat 5 Gray Wolf.");
});

// =============================================================================
// gather quests (GatherQuest.cs — progress counter, NOT inventory)
// =============================================================================

test("questDescription: gather — single item uses 'Collect' verb", () => {
  // GatherQuest is a progress counter; "Collect" disambiguates from the
  // inventory-gated gather_inventory ("Bring").
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "gather",
      level_required: 5,
      turn_in_npc_name: "Smith Aldric",
      turn_in_npc_zone_name: "Ironforge",
    },
    [{ type: "gather", name: "Iron Ore", amount: 10 }],
  );
  assert.equal(
    out,
    "Quest for level 5+. Collect 10 Iron Ore. Report to Smith Aldric in Ironforge.",
  );
});

test("questDescription: gather — three amount-1 items list with no counts", () => {
  // Vestige of Valor pattern: 3 distinct armor pieces, each amount=1.
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "gather",
      level_required: 1,
      turn_in_npc_name: "Quartermaster Brun",
      turn_in_npc_zone_name: "The Outskirts",
    },
    [
      { type: "gather", name: "Rusted Watcher's Helm", amount: 1 },
      { type: "gather", name: "Weathered Iron Cuirass", amount: 1 },
      { type: "gather", name: "Forgotten Iron Greaves", amount: 1 },
    ],
  );
  assert.equal(
    out,
    "Quest for level 1+. Collect Rusted Watcher's Helm, Weathered Iron Cuirass, and Forgotten Iron Greaves. Report to Quartermaster Brun in The Outskirts.",
  );
});

// =============================================================================
// gather_inventory quests (GatherInventoryQuest.cs)
// =============================================================================

test("questDescription: gather_inventory — single item uses 'Bring' with destination", () => {
  // The Alchemist Apprentice I: 6 Bellflower, removeItemsOnComplete=false.
  const out = questDescription(
    {
      ...baseQuest,
      name: "The Alchemist Apprentice I",
      quest_type: "gather_inventory",
      is_adventurer_quest: true,
      level_required: 1,
      turn_in_npc_name: "Master Eliphas",
      turn_in_npc_zone_name: "Moontide Hamlet",
    },
    [{ type: "have", name: "Bellflower", amount: 6 }],
  );
  assert.equal(
    out,
    "Adventurer task for level 1+. Bring 6 Bellflower to Master Eliphas in Moontide Hamlet.",
  );
});

test("questDescription: gather_inventory — two same-verb objectives use 'and' not 'then'", () => {
  // Regression: previously joined with " then ", implying sequence.
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "gather_inventory",
      is_main_quest: true,
      turn_in_npc_name: "Aelindis Gemweaver",
      turn_in_npc_zone_name: "The Molten Summit",
    },
    [
      { type: "have", name: "Fragment of Resilience", amount: 3 },
      { type: "have", name: "Fragment of Serenity", amount: 3 },
    ],
  );
  assert.ok(!out.includes(" then "), `expected no 'then', got: ${out}`);
  assert.equal(
    out,
    "Main story quest for level 10+. Bring 3 Fragment of Resilience and 3 Fragment of Serenity to Aelindis Gemweaver in The Molten Summit.",
  );
});

test("questDescription: gather_inventory — three same-verb objectives list all", () => {
  // Three fragments listed in full (no aggregation under the 4-item bar).
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "gather_inventory",
      turn_in_npc_name: "NPC",
      turn_in_npc_zone_name: "Zone",
    },
    [
      { type: "have", name: "Fragment of Resilience", amount: 3 },
      { type: "have", name: "Fragment of Serenity", amount: 3 },
      { type: "have", name: "Fragment of Eternity", amount: 3 },
    ],
  );
  assert.equal(
    out,
    "Quest for level 10+. Bring 3 Fragment of Resilience, 3 Fragment of Serenity, and 3 Fragment of Eternity to NPC in Zone.",
  );
});

test("questDescription: gather_inventory — Chronicles IV (4+ items, real production data)", () => {
  // 3 fragments at 3 each + 1 Restored Crown (requiredItem) = 4 distinct,
  // total amount 10. Chronicles IV's start_npc_id = end_npc_id = aelindis_gemweaver,
  // so the loader passes the start NPC as the turn-in NPC.
  const out = questDescription(
    {
      ...baseQuest,
      name: "Chronicles of the Lost Crown IV",
      quest_type: "gather_inventory",
      is_main_quest: true,
      level_required: 20,
      turn_in_npc_name: "Aelindis Gemweaver",
      turn_in_npc_zone_name: "The Molten Summit",
    },
    [
      { type: "have", name: "Fragment of Resilience", amount: 3 },
      { type: "have", name: "Fragment of Serenity", amount: 3 },
      { type: "have", name: "Fragment of Eternity", amount: 3 },
      { type: "deliver", name: "Restored Crown of King Vaeril", amount: 1 },
    ],
  );
  assert.equal(
    out,
    "Main story quest for level 20+. Bring 10 items to Aelindis Gemweaver in The Molten Summit.",
  );
});

test("questDescription: gather_inventory — Path of Scales (5 items, real production data)", () => {
  // Path of Scales: 5 distinct rare materials, all amount=1. Turn-in NPC is
  // Thargrim Stoneforge (resolved via end_npc_id = start_npc_id fallback).
  const out = questDescription(
    {
      ...baseQuest,
      name: "Path of Scales",
      quest_type: "gather_inventory",
      level_required: 30,
      turn_in_npc_name: "Thargrim Stoneforge",
      turn_in_npc_zone_name: "The Molten Summit",
    },
    [
      { type: "have", name: "Ethereal Hide", amount: 1 },
      { type: "have", name: "Ancient Cyclops Bones", amount: 1 },
      { type: "have", name: "Black Dragon Scales", amount: 1 },
      { type: "have", name: "Pure Essence of Fire", amount: 1 },
      { type: "have", name: "Savage Blood", amount: 1 },
    ],
  );
  assert.equal(
    out,
    "Quest for level 30+. Bring 5 items to Thargrim Stoneforge in The Molten Summit.",
  );
});

test("questDescription: gather_inventory — combines have + deliver buckets", () => {
  // Both objective types map to the "Bring" sentence because gameplay-wise
  // they're the same player action (be holding/wearing this at turn-in).
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "gather_inventory",
      turn_in_npc_name: "NPC",
      turn_in_npc_zone_name: "Zone",
    },
    [
      { type: "have", name: "Bellflower", amount: 5 },
      { type: "deliver", name: "Royal Seal", amount: 1 },
    ],
  );
  assert.equal(
    out,
    "Quest for level 10+. Bring 5 Bellflower and Royal Seal to NPC in Zone.",
  );
});

test("questDescription: gather_inventory — quest_type filter ignores stray types", () => {
  // The loader is generic: a kill objective leaking into a gather_inventory
  // quest must not pollute the description. Dispatch is on quest_type.
  const out = questDescription(
    { ...baseQuest, quest_type: "gather_inventory" },
    [
      { type: "kill", name: "Wolf", amount: 5 },
      { type: "have", name: "Pelt", amount: 3 },
    ],
  );
  assert.equal(out, "Quest for level 10+. Bring 3 Pelt.");
});

// =============================================================================
// equip_item quests (EquipItemQuest.cs)
// =============================================================================

test("questDescription: equip_item — two-piece armor set", () => {
  // Crafting Stalker Armor pattern: armor + leggings worn together.
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "equip_item",
      level_required: 22,
      turn_in_npc_name: "Smith Aldric",
      turn_in_npc_zone_name: "Ironforge",
    },
    [
      { type: "equip", name: "Stalker Tunic", amount: 1 },
      { type: "equip", name: "Stalker Pants", amount: 1 },
    ],
  );
  assert.equal(
    out,
    "Quest for level 22+. Equip Stalker Tunic and Stalker Pants. Report to Smith Aldric in Ironforge.",
  );
});

// =============================================================================
// location quests (LocationQuest.cs) — destination suffix is suppressed.
// =============================================================================

test("questDescription: location — discover a place (no destination)", () => {
  // The discover target IS the destination; appending "to <NPC>" would be
  // tautological. The turn-in NPC name on the input must be ignored.
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "location",
      turn_in_npc_name: "Cartographer Otto",
      turn_in_npc_zone_name: "Atlas Hall",
    },
    [{ type: "discover", name: "the Forgotten Crypt", amount: 1 }],
  );
  assert.equal(out, "Quest for level 10+. Discover the Forgotten Crypt.");
});

test("questDescription: location — isFindNpcQuest finds an NPC (no destination)", () => {
  // Trial of the Ancients: speak with Astral Projection.
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "location",
      is_main_quest: true,
      is_find_npc_quest: true,
      level_required: 25,
      turn_in_npc_name: "Astral Projection",
      turn_in_npc_zone_name: "The Twisted Haunt",
    },
    [{ type: "find", name: "Astral Projection", amount: 1 }],
  );
  assert.equal(out, "Main story quest for level 25+. Find Astral Projection.");
});

// =============================================================================
// alchemy quests (AlchemyQuest.cs)
// =============================================================================

test("questDescription: alchemy — single brew with destination", () => {
  const out = questDescription(
    {
      ...baseQuest,
      quest_type: "alchemy",
      level_required: 5,
      turn_in_npc_name: "Master Eliphas",
      turn_in_npc_zone_name: "Moontide Hamlet",
    },
    [{ type: "brew", name: "Potion of Healing", amount: 5 }],
  );
  assert.equal(
    out,
    "Quest for level 5+. Brew 5 Potion of Healing. Report to Master Eliphas in Moontide Hamlet.",
  );
});

// =============================================================================
// Buff duration on potion / food / relic descriptions
//
// The duration we surface is `skills.duration_base` (LinearFloat baseValue)
// for the linked buff. Per-level scaling exists (PotionItem.cs:127-138 +
// LinearFloat.Get) but depends on Elixir Endurance veteran rank at runtime,
// which we can't predict server-side.
// =============================================================================

/**
 * Build a minimum-shape Item for description-only tests. We cast through
 * Partial<Item> because the Item type pulls in dozens of unrelated columns
 * the description never reads.
 */
function makeItem(overrides: Partial<Item>): Item {
  return overrides as Item;
}

test("potionDescription: buff phrase includes base duration when known", () => {
  // Cold Resistance Potion: buff name == item name, base duration 600s = 10m.
  // Without the duration the sentence would just be "Applies Cold Resistance
  // Potion." which echoes the title and adds nothing.
  const out = itemDescription(
    makeItem({
      name: "Cold Resistance Potion",
      item_type: "potion",
      potion_buff_name: "Cold Resistance Potion",
      potion_buff_allow_dungeon: true,
      cooldown_category: "",
    }),
    { buffDurationSeconds: 600 },
  );
  assert.equal(out, "Potion. Applies Cold Resistance Potion for 10m.");
});

test("potionDescription: bandage subtype shows short heal-over-time window", () => {
  // Bandages: buff_level=0, duration_base=5. Bandage subtype label keeps
  // the cooldown-category signal; duration explains why "Applies Bandages"
  // isn't circular — it persists for 5s as a HoT.
  const out = itemDescription(
    makeItem({
      name: "Bandages",
      item_type: "potion",
      potion_buff_name: "Bandages",
      potion_buff_allow_dungeon: true,
      cooldown_category: "Bandages",
    }),
    { buffDurationSeconds: 5 },
  );
  assert.equal(out, "Bandage. Applies Bandages for 5s.");
});

test("potionDescription: omits duration when buff has no timer", () => {
  // Defensive: skill row missing duration_base falls back to the bare phrase
  // so the description still reports that an effect persists.
  const out = itemDescription(
    makeItem({
      name: "Strange Brew",
      item_type: "potion",
      potion_buff_name: "Mystery Effect",
      potion_buff_allow_dungeon: true,
      cooldown_category: "",
    }),
    { buffDurationSeconds: null },
  );
  assert.equal(out, "Potion. Applies Mystery Effect.");
});

test("foodDescription: buff phrase includes base duration when known", () => {
  const out = itemDescription(
    makeItem({
      name: "Hearty Stew",
      item_type: "food",
      food_type: "Food",
      food_buff_name: "Well Fed",
      food_buff_allow_dungeon: true,
    }),
    { buffDurationSeconds: 1800 },
  );
  assert.equal(out, "Food. Grants Well Fed for 30m.");
});

test("relicDescription: includes buff name with base duration when known", () => {
  const out = itemDescription(
    makeItem({
      name: "Ancient Talisman",
      item_type: "relic",
      quality: 3,
      relic_buff_name: "Ancestral Wrath",
      relic_buff_allow_dungeon: true,
      is_ornamentation_token: false,
    }),
    { buffDurationSeconds: 600 },
  );
  assert.equal(out, "Epic relic. Triggers Ancestral Wrath for 10m.");
});

// =============================================================================
// skillDescription — ownership routing
//
// The dispatch picks the most actionable owner first (veteran > class > merc >
// pet > item-granted > monster > orphan). The level/cost gate only applies to
// veteran (cost in vet points) and class-learned (character level) skills —
// for every other owner the gate lives on the source (item, summoning skill,
// hire NPC), not on this skill row.
// =============================================================================

/** Defaults for the new SkillDescriptionInput shape, overridable per-test. */
const baseSkill = {
  name: "Skill",
  skill_type: "target_buff",
  tier: 0,
  max_level: 1,
  level_required: 0,
  player_classes: [] as string[],
  required_skill_points: 1,
  required_spent_points: 0,
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

test("skillDescription: class-learned skill keeps level gate", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Crush Strike",
    skill_type: "target_damage",
    level_required: 5,
    player_classes: ["warrior"],
  });
  assert.equal(
    out,
    "Single-target damage spell. Warrior skill. Unlocks at level 5.",
  );
});

test("skillDescription: class skill also used by monsters annotates ownership", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Cleave",
    skill_type: "frontal_damage",
    level_required: 10,
    player_classes: ["warrior"],
    monster_count: 3,
  });
  assert.equal(
    out,
    "Frontal cone attack. Warrior skill, also used by 3 monsters. Unlocks at level 10.",
  );
});

test("skillDescription: veteran skill renders cost gate, not character level", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Bone Crusher",
    skill_type: "target_damage",
    level_required: 0,
    player_classes: ["warrior"],
    required_skill_points: 2,
    required_spent_points: 10,
    is_veteran: true,
  });
  assert.equal(
    out,
    "Single-target damage spell. Veteran skill for Warrior. Costs 2 veteran points after 10 spent veteran points.",
  );
});

test("skillDescription: scroll-cast spell drops 'Unlocks at level' filler", () => {
  // Blushburst: scroll-only spell. The skill row's level_required=1 is just
  // the scroll item's level gate; treating it as a skill-tree unlock would
  // mislead the player. We surface the actual obtainability instead.
  const out = skillDescription({
    ...baseSkill,
    name: "Blushburst",
    skill_type: "target_buff",
    level_required: 1,
    granted_by: { ...baseSkill.granted_by, scroll: 1 },
  });
  assert.equal(out, "Single-target buff. Spell cast from a scroll.");
});

test("skillDescription: scroll-cast spell pluralizes when many scrolls cast it", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Lightning Bolt",
    skill_type: "target_projectile",
    granted_by: { ...baseSkill.granted_by, scroll: 3 },
  });
  assert.equal(out, "Ranged projectile attack. Spell cast from 3 scrolls.");
});

test("skillDescription: potion-applied buff routes to potion source", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Lion's Strength",
    skill_type: "target_buff",
    granted_by: { ...baseSkill.granted_by, potion_buff: 4 },
  });
  assert.equal(out, "Single-target buff. Applied by 4 potions.");
});

test("skillDescription: food-applied buff routes to food source", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Well Fed",
    skill_type: "target_buff",
    granted_by: { ...baseSkill.granted_by, food_buff: 1 },
  });
  assert.equal(out, "Single-target buff. Applied by a food item.");
});

test("skillDescription: relic-triggered buff routes to relic source", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Ancestral Wrath",
    skill_type: "area_damage",
    granted_by: { ...baseSkill.granted_by, relic_buff: 2 },
  });
  assert.equal(out, "Area-of-effect damage spell. Triggered by 2 relics.");
});

test("skillDescription: weapon proc routes to weapon source", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Spectral Burn",
    skill_type: "target_damage",
    granted_by: { ...baseSkill.granted_by, weapon_proc: 5 },
  });
  assert.equal(out, "Single-target damage spell. Procs from 5 weapons.");
});

test("skillDescription: mixed item sources collapse to a generic count", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Mixed Buff",
    skill_type: "target_buff",
    granted_by: { ...baseSkill.granted_by, potion_buff: 1, food_buff: 1 },
  });
  assert.equal(out, "Single-target buff. Granted by 2 items.");
});

test("skillDescription: mercenary ability beats item linkage when both exist", () => {
  // Cleric mercenary spells: used by mercenary pets via pet_skills, no class
  // ownership. Mercenary routing wins over a stray item linkage because the
  // hire flow is the actionable obtain path.
  const out = skillDescription({
    ...baseSkill,
    name: "Healing Light",
    skill_type: "target_heal",
    mercenary_user_count: 1,
    granted_by: { ...baseSkill.granted_by, scroll: 1 },
  });
  assert.equal(out, "Single-target heal. Mercenary ability.");
});

test("skillDescription: veteran flag without classes routes to mercenary, not cost gate", () => {
  // Runebound Aegis: is_veteran=1 but player_classes=[] in the source data.
  // Only a mercenary uses the skill, so the cost-in-veteran-points gate would
  // be misleading — the player can't spend their own veteran points on it.
  const out = skillDescription({
    ...baseSkill,
    name: "Runebound Aegis",
    skill_type: "target_buff",
    is_veteran: true,
    required_skill_points: 1,
    mercenary_user_count: 1,
  });
  assert.equal(out, "Single-target buff. Mercenary ability.");
});

test("skillDescription: pet ability when only familiars/companions use it", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Arcane Bolt",
    skill_type: "target_projectile",
    pet_user_count: 1,
  });
  assert.equal(out, "Ranged projectile attack. Pet ability.");
});

test("skillDescription: monster-only ability lists creature count", () => {
  const out = skillDescription({
    ...baseSkill,
    name: "Acid Spit",
    skill_type: "target_projectile",
    monster_count: 7,
  });
  assert.equal(
    out,
    "Ranged projectile attack. Monster ability used by 7 creatures.",
  );
});

test("skillDescription: truly orphan skill emits only the type label", () => {
  // No class, no pet, no item, no monster. We have no honest signal to
  // attach beyond what the category already says.
  const out = skillDescription({
    ...baseSkill,
    name: "Internal Helper",
    skill_type: "passive",
    level_required: 1,
  });
  assert.equal(out, "Passive ability.");
});
