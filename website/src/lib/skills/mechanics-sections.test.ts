import { describe, expect, test } from "vitest";
import type {
  LinearValue,
  SkillDetailView,
  SkillMechanicsSpec,
  SkillPet,
} from "$lib/types/skills";
import { mechanicsSections } from "./mechanics-sections";
import { skillFacts } from "./skill-facts";

const flat = (value: number): LinearValue => ({
  base_value: value,
  bonus_per_level: 0,
});

function skill(overrides: Partial<SkillDetailView> = {}): SkillDetailView {
  return {
    id: "test",
    skill_type: "target_damage",
    player_classes: [],
    channel_pulses: 0,
    max_level: 5,
    required_skill_points: 1,
    aggro: null,
    speed_bonus: null,
    fear_resist_chance_bonus: null,
    ...overrides,
  } as SkillDetailView;
}

const bardMercenary: SkillPet = {
  id: "bard",
  name: "Bard",
  is_mercenary: true,
  is_familiar: false,
  type_monster: "Bard",
};

/** The sections a skill page shows, from facts derived the way the page derives them. */
function sections(
  overrides: Partial<SkillDetailView>,
  spec: Partial<SkillMechanicsSpec> = {},
  pets: SkillPet[] = [],
) {
  const fullSpec: SkillMechanicsSpec = {
    damageContexts: [],
    healContexts: [],
    buffContexts: [],
    debuffContexts: [],
    timingContexts: [],
    ...spec,
  };
  const subject = skill(overrides);
  return mechanicsSections({
    skill: subject,
    spec: fullSpec,
    facts: skillFacts(subject, pets, fullSpec, []),
  });
}

const playerDamage: Partial<SkillMechanicsSpec> = {
  damageContexts: [
    {
      casters: [{ kind: "player", classId: "necromancer" }],
      formula: "normal",
    },
  ],
};

describe("mechanics sections", () => {
  test("lists a skill's sections in display order", () => {
    expect(
      sections(
        {
          player_classes: ["necromancer"],
          damage: flat(20),
          lifetap_percent: flat(0.25),
          fear_chance: flat(0.1),
        },
        playerDamage,
      ),
    ).toEqual(["damage", "fear", "lifetap"]);
  });

  test("a skill with no mechanic shows no section, so the card is hidden", () => {
    expect(sections({ skill_type: "target_buff" })).toEqual([]);
  });

  test("Parry shows its mechanics although it deals no damage of its own", () => {
    expect(
      sections({ id: "parry", skill_type: "target_buff" }, playerDamage),
    ).toEqual(["parry"]);
  });

  test("a song a Bard mercenary uses gets the mercenary section instead of the player one", () => {
    const mercenarySong = sections(
      { skill_type: "area_buff", is_bard_song: true },
      {},
      [bardMercenary],
    );
    expect(mercenarySong).toContain("mercenary-song");
    expect(mercenarySong).not.toContain("song");
    const playerSong = sections({
      skill_type: "area_buff",
      is_bard_song: true,
    });
    expect(playerSong).toContain("song");
    expect(playerSong).not.toContain("mercenary-song");
  });

  test("Balance Health replaces the healing section", () => {
    const heal: Partial<SkillMechanicsSpec> = {
      healContexts: [
        {
          casters: [{ kind: "player", classId: "druid" }],
          bonusKind: "player_other",
          canCrit: true,
        },
      ],
    };
    expect(
      sections({ skill_type: "area_heal", is_balance_health: true }, heal),
    ).toEqual(["balance-health"]);
    expect(sections({ skill_type: "area_heal" }, heal)).toEqual(["healing"]);
  });

  test("Wild Strike and Final Cadence explain their damage without the generic damage section", () => {
    expect(
      sections(
        { id: "wild_strike", player_classes: ["ranger"], damage: flat(5) },
        playerDamage,
      ),
    ).toEqual(["wild-strike"]);
    expect(
      sections(
        {
          skill_type: "area_damage",
          is_bard_final_cadence: true,
          damage: flat(50),
        },
        playerDamage,
      ),
    ).toEqual(["final-cadence"]);
  });

  test("an aggro-only skill shows its threat calculation but no damage", () => {
    expect(
      sections({ player_classes: ["warrior"], aggro: flat(300) }, playerDamage),
    ).toEqual(["aggro"]);
  });

  test("a slow from -10 roots and a slow from -50 is sleep", () => {
    expect(sections({ speed_bonus: flat(-9) })).toEqual([]);
    expect(sections({ speed_bonus: flat(-10) })).toEqual(["root"]);
    expect(sections({ speed_bonus: flat(-49) })).toEqual(["root"]);
    expect(sections({ speed_bonus: flat(-50) })).toEqual(["sleep"]);
  });

  test("Charm and cleanses do not show the target's debuff resistance", () => {
    expect(
      sections({ skill_type: "target_debuff", is_magic_debuff: true }),
    ).toContain("debuff-resistance");
    expect(
      sections({
        skill_type: "target_debuff",
        is_magic_debuff: true,
        is_bard_charm: true,
      }),
    ).not.toContain("debuff-resistance");
    expect(
      sections({
        skill_type: "target_debuff",
        is_magic_debuff: true,
        is_cleanse: true,
      }),
    ).not.toContain("debuff-resistance");
  });
});
