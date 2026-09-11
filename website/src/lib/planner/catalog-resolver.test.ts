import { describe, expect, it } from "vitest";
import type { BuildEnvelope } from "./build-envelope";
import { buildCasterStatSheet } from "./caster";
import { adaptCompleteCapture, parseCaptureBuildRecord } from "./capture-build";
import { createDefaultEvaluationScenario } from "./scenario";
import { evaluateLogicalBuild, resolveLogicalBuild } from "./catalog-resolver";

const zero = { base_value: 0, bonus_per_level: 0 };
const attributeKeys = [
  "strength",
  "constitution",
  "dexterity",
  "intelligence",
  "wisdom",
  "charisma",
] as const;
const buildEnvelope = {
  serializedSchemaVersion: 3,
  modelVersion: "1",
  gameData: {
    gameVersion: "0.9.31.1",
    steamBuildId: "24986533",
    assemblySha256: "catalog-sha",
  },
} satisfies BuildEnvelope;

function attributes(
  values: Partial<Record<(typeof attributeKeys)[number], number>> = {},
) {
  return Object.fromEntries(
    attributeKeys.map((key) => [key, values[key] ?? 0]),
  );
}

function itemStats(values: Record<string, unknown> = {}) {
  return {
    ...attributes(),
    health_bonus: 0,
    mana_bonus: 0,
    energy_bonus: 0,
    damage: 0,
    magic_damage: 0,
    defense: 0,
    magic_resist: 0,
    poison_resist: 0,
    fire_resist: 0,
    cold_resist: 0,
    disease_resist: 0,
    accuracy: 0,
    block_chance: 0,
    critical_chance: 0,
    critical_resist: 0,
    haste: 0,
    spell_haste: 0,
    max_durability: 10,
    hp_regen_bonus: 0,
    mana_regen_bonus: 0,
    has_serenity: false,
    speed_bonus: 0,
    resist_fear_chance: 0,
    is_costume: false,
    ...values,
  };
}

function skill(
  id: string,
  skillType: string,
  overrides: Record<string, unknown> = {},
) {
  const effectFields = [
    "strength_bonus",
    "constitution_bonus",
    "dexterity_bonus",
    "intelligence_bonus",
    "wisdom_bonus",
    "charisma_bonus",
    "health_max_bonus",
    "health_max_percent_bonus",
    "mana_max_bonus",
    "mana_max_percent_bonus",
    "energy_max_bonus",
    "damage_bonus",
    "magic_damage_bonus",
    "defense_bonus",
    "magic_resist_bonus",
    "poison_resist_bonus",
    "fire_resist_bonus",
    "cold_resist_bonus",
    "disease_resist_bonus",
    "block_chance_bonus",
    "accuracy_bonus",
    "critical_chance_bonus",
    "critical_resist_bonus",
    "haste_bonus",
    "spell_haste_bonus",
    "damage_percent_bonus",
    "magic_damage_percent_bonus",
    "mana_percent_per_second_bonus",
    "energy_percent_per_second_bonus",
    "mana_per_second_bonus",
    "energy_per_second_bonus",
  ];
  return {
    id,
    name: id,
    skill_type: skillType,
    player_classes: ["warrior"],
    tier: 1,
    max_level: 1,
    learn_default: false,
    is_veteran: false,
    level_requirement: { base_value: 1, bonus_per_level: 0 },
    skill_point_cost: { base_value: 1, bonus_per_level: 0 },
    required_spent_points: 0,
    prerequisite_skill_id: null,
    prerequisite_level: 0,
    prerequisite2_skill_id: null,
    prerequisite2_level: 0,
    damage: zero,
    damage_percent: zero,
    damage_type: "Physical",
    is_spell: false,
    required_weapon_category: "",
    required_weapon_category2: "",
    is_scroll: false,
    is_manaburn_skill: false,
    is_assassination_skill: false,
    followup_default_attack: false,
    base_skill: false,
    cast_time: zero,
    cooldown: zero,
    mana_cost: zero,
    energy_cost: zero,
    ...Object.fromEntries(effectFields.map((field) => [field, zero])),
    ...overrides,
  };
}

function catalog() {
  const combatStats = [
    "health",
    "mana",
    "energy",
    "damage",
    "magic_damage",
    "defense",
    "magic_resist",
    "poison_resist",
    "fire_resist",
    "cold_resist",
    "disease_resist",
    "block_chance",
    "accuracy",
    "critical_chance",
  ];
  const playerCombat = {
    id: "warrior",
    resource_type: "energy",
    base_energy_recovery_rate: 0,
    base_mana_recovery_rate: 1,
    ...Object.fromEntries(
      combatStats.flatMap((name) => [
        [`base_${name}_value`, 0],
        [`base_${name}_per_level`, 0],
      ]),
    ),
  };
  const mercenary = {
    id: "warrior_mercenary",
    class_id: "warrior",
    skill_ids: [],
    innate_skill_ids: [],
    ...Object.fromEntries(
      combatStats.flatMap((name) => [
        [`${name}_base`, 0],
        [`${name}_per_level`, 0],
      ]),
    ),
  };
  return {
    build: buildEnvelope,
    classes: [
      {
        id: "warrior",
        name: "Warrior",
        compatible_races: ["human"],
      },
    ],
    classCombat: [playerCombat],
    equipmentSlots: [
      {
        owner_type: "player",
        owner_id: "warrior",
        slot_index: 12,
        accepted_category: "Weapon",
      },
      {
        owner_type: "mercenary",
        owner_id: "warrior",
        slot_index: 12,
        accepted_category: "Weapon",
      },
    ],
    equipment: [
      {
        id: "training_sword",
        name: "Training Sword",
        item_type: "weapon",
        slot: "WeaponSword",
        weapon_category: "WeaponSword",
        weapon_delay: 20,
        weapon_required_ammo_id: null,
        class_required: ["Warrior"],
        level_required: 1,
        stats: itemStats({ damage: 5 }),
      },
    ],
    augments: [
      {
        id: "strength_rune",
        name: "Strength Rune",
        augment_is_defensive: false,
        augment_armor_set_item_ids: [] as string[],
        augment_skill_bonuses: [],
        stats: itemStats({ strength: 1 }),
      },
    ],
    progression: {
      max_level: 50,
      max_veteran_points: 200,
      attribute_points_per_veteran: 1,
      veteran_skill_points_per_veteran: 1,
      races: [
        {
          id: "human",
          starting_attributes: attributes({ strength: 2 }),
        },
      ],
      class_levels: [
        {
          class_id: "warrior",
          level: 2,
          automatic_attributes: attributes({ strength: 1 }),
        },
      ],
      level_budgets: [
        { level: 2, attribute_points: 1, normal_skill_points: 1 },
      ],
    },
    skills: [
      skill("melee_attack", "target_damage", {
        learn_default: true,
        base_skill: true,
        damage: { base_value: 1, bonus_per_level: 0 },
        required_weapon_category: "Weapon",
      }),
      skill("training", "passive", {
        damage_percent_bonus: { base_value: 0.1, bonus_per_level: 0 },
      }),
    ],
    mercenaryArchetypes: [mercenary],
    consumables: [
      {
        id: "energy_tonic",
        name: "Energy Tonic",
        item_type: "potion",
        potion_buff_id: null,
        potion_buff_level: 0,
        usage_mana: 0,
        usage_energy: 0,
      },
    ],
    ammunition: [{ id: "arrow", name: "Arrow", item_type: "ammo" }],
    learnedBooks: [
      {
        id: "warrior_tome",
        name: "Warrior Tome",
        gains: attributes({ strength: 2 }),
      },
    ],
    effectClassifications: [
      { kind: "item_effect:stats", status: "modelled", reason: "stats" },
      {
        kind: "item_effect:learned_book_attributes",
        status: "modelled",
        reason: "books",
      },
      {
        kind: "skill_type:target_damage",
        status: "modelled",
        reason: "damage",
      },
      {
        kind: "skill_type:passive",
        status: "modelled",
        reason: "passive",
      },
    ],
  };
}

function logicalBuild() {
  return {
    schemaVersion: 1,
    player: {
      entityId: "player",
      classId: "warrior",
      raceId: "human",
      level: 2,
      veteranPoints: 0,
      attributes: {
        rawObserved: attributes({ strength: 99 }),
        baseProgression: attributes({ strength: 3 }),
        allocated: attributes({ strength: 1 }),
        derivedObserved: attributes({ strength: 99 }),
      },
      skills: [
        {
          skillId: "training",
          skillName: "training",
          level: 1,
          pool: "normal",
        },
      ],
      equipment: [
        {
          slot: 12,
          itemId: "training_sword",
          itemName: "Training Sword",
          augmentId: "strength_rune" as string | null,
          durability: 10,
          amount: 1,
        },
      ],
    },
    companions: [
      {
        entityId: "mercenary",
        kind: "mercenary",
        archetypeId: "warrior",
        raceId: "human",
        level: 2,
        healthMultiplier: null,
        resourceMultiplier: null,
        baseCombat: null,
        skills: [],
        equipment: [],
      },
    ],
    consumables: [
      { itemId: "energy_tonic", itemName: "Energy Tonic", quantity: 2 },
    ],
    ammunition: [{ itemId: "arrow", itemName: "Arrow", quantity: 10 }],
    learnedBookIds: ["warrior_tome"],
    provenance: { kind: "authored", source: "catalog-resolver.test" },
  };
}

function scenario() {
  const value = createDefaultEvaluationScenario({
    build: buildEnvelope,
    target: {
      id: "dummy",
      level: 2,
      stationary: true,
      defense: 0,
      magicResist: 0,
      poisonResist: 0,
      fireResist: 0,
      coldResist: 0,
      diseaseResist: 0,
      blockChance: 0,
      criticalResist: 0,
      bossOrElite: false,
      immuneDebuffs: false,
    },
    targetMaximumHealth: 1_000,
    roster: ["player", "mercenary"],
    horizonSeconds: 5,
    initialResources: [
      { entityId: "player", resource: "energy", current: 70, maximum: 70 },
    ],
  });
  value.consumables = [
    { entityId: "player", itemId: "energy_tonic", quantity: 1 },
  ];
  value.ammunition = [{ entityId: "player", itemId: "arrow", quantity: 5 }];
  return value;
}

describe("catalog logical-build resolver", () => {
  it("derives production evaluator inputs from stable catalog identities", () => {
    const resolved = resolveLogicalBuild(logicalBuild(), catalog());
    const result = evaluateLogicalBuild({
      id: "catalog-build",
      buildData: logicalBuild(),
      catalog: catalog(),
      scenario: scenario(),
    });

    expect(resolved.player.attributePointsSpent).toBe(1);
    expect(resolved.player.attributePointBudget).toBe(1);
    expect(resolved.player.observations.derivedAttributes?.strength).toBe(99);
    expect(
      resolved.player.skills.map((entry) => [entry.id, entry.level]),
    ).toEqual([
      ["melee_attack", 1],
      ["training", 1],
    ]);
    expect(resolved.companions).toHaveLength(1);
    expect(resolved.consumables[0]).toMatchObject({
      quantity: 2,
      buffSkillId: null,
    });
    expect(resolved.ammunition[0]).toMatchObject({ quantity: 10 });
    expect(result.caster.attributes.strength).toBe(7);
    expect(result.caster.damage).toBe(13);
    expect(result.actions.map((action) => action.actionId)).toEqual([
      "melee_attack",
    ]);
    expect(
      evaluateLogicalBuild({
        id: "catalog-build",
        buildData: logicalBuild(),
        catalog: catalog(),
        scenario: scenario(),
      }).caster.attributes.strength,
    ).toBe(7);
  });

  it("evaluates equivalent authored and captured builds identically", () => {
    const authored = logicalBuild();
    const capturedBuild = structuredClone(authored);
    capturedBuild.provenance = {
      kind: "capture",
      source: "character-capture",
    };
    const capture = parseCaptureBuildRecord({
      captureSchemaVersion: 1,
      producer: {
        id: "character-capture",
        version: "1.0.0",
        capturedAtUtc: "2026-09-11T13:07:49Z",
      },
      gameData: buildEnvelope.gameData,
      modelCompatibility: buildEnvelope.modelVersion,
      buildData: capturedBuild,
      completeness: {
        player: "complete",
        "player.attributes": "complete",
        "player.skills": "complete",
        "player.equipment": "complete",
        companions: "complete",
        consumables: "complete",
        ammunition: "complete",
        learnedBookIds: "complete",
      },
      containers: [],
      ownedItems: [],
    });
    const captured = adaptCompleteCapture(capture);
    const sharedScenario = scenario();

    const authoredResult = evaluateLogicalBuild({
      id: "authored",
      buildData: authored,
      catalog: catalog(),
      scenario: sharedScenario,
    });
    const capturedResult = evaluateLogicalBuild({
      id: "captured",
      buildData: captured,
      catalog: catalog(),
      scenario: sharedScenario,
    });

    expect(captured.provenance).toEqual({
      kind: "capture",
      source: "character-capture",
    });
    expect(capture.producer.id).toBe("character-capture");
    expect(authoredResult.fixtureId).toBe("authored");
    expect(capturedResult.fixtureId).toBe("captured");
    expect({ ...capturedResult, fixtureId: "shared" }).toEqual({
      ...authoredResult,
      fixtureId: "shared",
    });
  });

  it("resolves inherent armor sets by exported stable identity", () => {
    const setCatalog = catalog();
    const slots = [
      [0, "Head"],
      [2, "Chest"],
      [5, "Hands"],
    ] as const;
    const members = slots.map(([slot]) => `set_piece_${slot}`);
    setCatalog.equipmentSlots.push(
      ...slots.map(([slot_index, accepted_category]) => ({
        owner_type: "player",
        owner_id: "warrior",
        slot_index,
        accepted_category,
      })),
    );
    setCatalog.equipment.push(
      ...slots.map(([slot, category]) => ({
        ...setCatalog.equipment[0],
        id: `set_piece_${slot}`,
        name: `Set Piece ${slot}`,
        item_type: "equipment",
        slot: category,
        stats: itemStats({
          augment_bonus_set: "Warrior Set",
          augment_bonus_set_id: "warrior_set",
        }),
      })),
    );
    setCatalog.augments.push({
      ...setCatalog.augments[0],
      id: "warrior_set",
      name: "Warrior Set",
      augment_is_defensive: true,
      augment_armor_set_item_ids: members,
      stats: itemStats({ strength: 10 }),
    });
    const setBuild = structuredClone(logicalBuild());
    setBuild.player.equipment = slots.map(([slot]) => ({
      slot,
      itemId: `set_piece_${slot}`,
      itemName: `Set Piece ${slot}`,
      augmentId: null,
      durability: 10,
      amount: 1,
    }));

    const resolved = resolveLogicalBuild(setBuild, setCatalog);

    expect(resolved.player.caster.armorSets?.map((set) => set.id)).toEqual([
      "warrior_set",
    ]);
    expect(
      buildCasterStatSheet(resolved.player.caster).attributes.strength,
    ).toBe(16);
  });

  it("refuses unresolved, duplicate, and unsupported catalog inputs", () => {
    const unknownBook = logicalBuild();
    unknownBook.learnedBookIds = ["missing_tome"];
    expect(() => resolveLogicalBuild(unknownBook, catalog())).toThrow(
      "Catalog cannot resolve learned book 'missing_tome'",
    );

    const duplicateBookCatalog = catalog();
    duplicateBookCatalog.learnedBooks.push({
      ...duplicateBookCatalog.learnedBooks[0],
    });
    expect(() =>
      resolveLogicalBuild(logicalBuild(), duplicateBookCatalog),
    ).toThrow("catalog.learnedBooks has duplicate identity 'warrior_tome'");

    const unsupportedCatalog = catalog();
    unsupportedCatalog.effectClassifications.push({
      kind: "item_effect:weapon_proc",
      status: "unsupported",
      reason: "unsupported",
    });
    expect(() =>
      resolveLogicalBuild(logicalBuild(), unsupportedCatalog),
    ).toThrow("Catalog admits unsupported effect 'item_effect:weapon_proc'");
  });
});
