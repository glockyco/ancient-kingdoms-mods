import { expect, test, vi } from "vitest";
import { queryOne } from "$lib/db.server";
import type { PetStatCurves, PetStatId } from "$lib/types/pets";
import {
  petDescription,
  type PetDescriptionInput,
} from "$lib/server/meta-description";
import {
  getPetById,
  getPetStatSnapshots,
  MERCENARY_COMPANION_VETERAN_RATES,
  UNDEAD_VETERAN_RATES,
  type PetVeteranRates,
} from "./pets.server";

vi.mock("$lib/db.server", () => ({
  query: vi.fn(() => []),
  queryOne: vi.fn(),
}));

function curves(overrides: Partial<PetStatCurves> = {}): PetStatCurves {
  const ids = [
    "health",
    "damage",
    "magic_damage",
    "defense",
    "magic_resist",
    "poison_resist",
    "fire_resist",
    "cold_resist",
    "disease_resist",
    "block_chance",
    "critical_chance",
  ];
  return {
    ...Object.fromEntries(
      ids.flatMap((id) => [
        [`${id}_base`, 0],
        [`${id}_per_level`, 0],
      ]),
    ),
    health_multiplier: 1,
    ...overrides,
  } as PetStatCurves;
}

const stat = (
  values: PetStatCurves,
  cap: number,
  id: PetStatId,
  veteran: PetVeteranRates = {},
) =>
  getPetStatSnapshots(values, cap, veteran).find((entry) => entry.id === id)!;

test("linear stats scale through the supplied cap", () => {
  const values = curves({ damage_base: 7, damage_per_level: 3 });
  expect(stat(values, 4, "attack_power")).toMatchObject({
    level1: 7,
    atCap: 16,
  });
  expect(stat(values, 9, "attack_power").atCap).toBe(31);
});

test("zero-growth stats stay fixed at every level, including float chances", () => {
  const values = curves({ health_base: 40, block_chance_base: 0.2 });
  for (const cap of [1, 4, 19]) {
    expect(
      getPetStatSnapshots(values, cap, {}).every(
        (entry) => entry.level1 === entry.atCap,
      ),
    ).toBe(true);
  }
});

test("200-point veteran bonuses round half values to even and exclude chances", () => {
  const values = curves({
    damage_base: 1,
    defense_base: 1,
    magic_resist_base: 3,
    block_chance_base: 0.2,
    critical_chance_base: 0.1,
  });
  expect(
    stat(values, 1, "attack_power", UNDEAD_VETERAN_RATES).withVeteran,
  ).toBe(3);
  expect(stat(values, 1, "armor_class", UNDEAD_VETERAN_RATES).withVeteran).toBe(
    1,
  );
  expect(
    stat(values, 1, "magic_resist", UNDEAD_VETERAN_RATES).withVeteran,
  ).toBe(5);
  for (const id of ["block_chance", "critical_chance"] as const) {
    const chance = stat(values, 1, id, UNDEAD_VETERAN_RATES);
    expect(chance.withVeteran).toBe(chance.atCap);
  }
});

test("a mercenary companion's veteran bonus raises Attack Power and resists but not Armor Class or Hit Points", () => {
  const values = curves({
    health_base: 400,
    damage_base: 50,
    defense_base: 200,
    fire_resist_base: 30,
  });
  const rates = MERCENARY_COMPANION_VETERAN_RATES;
  expect(stat(values, 1, "attack_power", rates).withVeteran).toBe(150);
  expect(stat(values, 1, "fire_resist", rates).withVeteran).toBe(45);
  expect(stat(values, 1, "armor_class", rates).withVeteran).toBe(200);
  expect(stat(values, 1, "health", rates).withVeteran).toBe(400);
});

test("Hit Points round their multiplier separately from the veteran bonus", () => {
  const values = curves({
    health_base: 4,
    health_per_level: 2,
    health_multiplier: 1.3,
  });
  expect(stat(values, 1, "health", UNDEAD_VETERAN_RATES)).toMatchObject({
    level1: 5,
    atCap: 5,
    withVeteran: 8,
  });
  expect(stat(values, 2, "health").atCap).toBe(8);
  expect(
    stat(curves({ health_base: 3, health_multiplier: 1.5 }), 1, "health").atCap,
  ).toBe(4);
  expect(stat(curves({ health_base: 16777217 }), 1, "health").atCap).toBe(
    16777216,
  );
});

test.each([false, true])(
  "familiar=%s selects the skill rank cap only for familiars",
  (is_familiar) => {
    vi.mocked(queryOne).mockReset();
    vi.mocked(queryOne)
      .mockReturnValueOnce({
        ...curves({ health_base: 10, health_per_level: 2 }),
        id: "test_pet",
        name: "Test Pet",
        is_mercenary: false,
        is_familiar,
        level: 1,
        level_max: 5,
      })
      .mockReturnValueOnce({
        skill_id: "test_summon",
        skill_name: "Test Summon",
        class_id: "wizard",
        mercenary_id: null,
        mercenary_name: null,
        form: null,
      });
    if (is_familiar) vi.mocked(queryOne).mockReturnValueOnce({ max_level: 9 });
    const pet = getPetById("test_pet")!;
    expect(pet.effective_max_level).toBe(is_familiar ? 9 : 5);
    expect(pet.stats.find((entry) => entry.id === "health")?.atCap).toBe(
      is_familiar ? 26 : 18,
    );
  },
);

test.each([
  ["necromancer", null],
  ["druid", null],
  [null, null],
  [null, "Necromancer Mercenary"],
])(
  "companion metadata uses its supplied cap for class %s, mercenary %s",
  (summoning_class_id, summoning_mercenary_name) => {
    const input: PetDescriptionInput = {
      name: "Test Pet",
      kind: "Companion",
      type_monster: "Test",
      has_buffs: false,
      has_heals: false,
      level_max: 37,
      effective_max_level: 9,
      summoning_skill_name: "Test Summon",
      summoning_class_id,
      summoning_mercenary_name,
    };
    expect(petDescription(input)).toContain("up to level 37");
    expect(petDescription({ ...input, kind: "Familiar" })).toContain(
      "up to rank 9",
    );
  },
);
