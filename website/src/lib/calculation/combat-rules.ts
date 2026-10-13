import type { Calculation } from "$lib/types/calculation";
import {
  addF32,
  multiplyF32,
  iround,
  ceilToInt,
  floorToInt,
  clamp,
} from "$lib/planner/engine-math";
import {
  formatNumber as number,
  formatPercent as percent,
  formatSeconds as seconds,
} from "$lib/calculation/format";
import { mitigate } from "$lib/calculation/combat";

// Source: server-scripts/Combat.cs:damage,magicDamage; Strength.cs:GetDamageBonus; Intelligence.cs:GetMagicDamageBonus — percentage damage applies to the full flat stat; only the Intelligence addition and percentage addition round, not the flat-stat sum.
export function characterDamage(flat: number, bonus: number) {
  return Math.max(0, flat + iround(multiplyF32(flat, bonus)));
}
export const characterDamageCalculation: Calculation = {
  steps: [
    {
      name: "Flat Damage",
      expression:
        "Level-based base Damage + non-negative Strength + flat physical damage from working equipment, learned skills, and buffs",
    },
    {
      name: "Flat Magic Damage",
      expression:
        "Level-based base Magic Damage + 150% of non-negative Intelligence, rounded, + flat magic damage from working equipment, learned skills, and buffs",
    },
    {
      name: "Percentage bonus",
      expression:
        "Sum of active learned passive bonuses and buff bonuses. A resource-dependent physical passive scales with current Rage ÷ maximum Rage. A resource-dependent magic passive scales with current Mana ÷ maximum Mana",
    },
    {
      name: "Extra damage",
      expression: "Corresponding flat damage × percentage bonus",
      rounding: "nearest",
    },
    {
      name: "Character window stat",
      expression: "Corresponding flat damage + extra damage",
      limit: "at least 0",
    },
  ],
  example: () => {
    const extra = iround(multiplyF32(201, 0.5));
    const result = characterDamage(201, 0.5);
    return {
      given: ["201 flat Damage", "50% total physical damage bonus"],
      result: `${number(result)} Damage in the character window`,
      working: [
        `Extra damage: 201 × 50% = ${number(extra)}, rounded`,
        `Character window stat: 201 + ${number(extra)} = ${number(result)}`,
      ],
    };
  },
};

// Source: server-scripts/Combat.cs:DealDamageAt; Database.cs:CalculateSlayerLevelForAccount — level adjustment limits its percentage before rounding damage up. Slayer reduction starts at 10% mastery and reaches 10% at 100% mastery. Rampage scales non-spell hits below 10% Health. On-hit effects act on the attacker before shields spend Ward and Mana.
export function hitPipelineExample() {
  const moving = 201 + floorToInt(multiplyF32(201, 0.1));
  const variance = iround(multiplyF32(moving, 1.05));
  const behind = variance + ceilToInt(multiplyF32(variance, 0.1)) + 1;
  const leveled = behind + ceilToInt(multiplyF32(behind, 0.04));
  const mitigation = mitigate(leveled, 100);
  const criticalExtra = multiplyF32(0.5, addF32(1, -0.2));
  const critical = iround(
    multiplyF32(mitigation.taken, addF32(1, criticalExtra)),
  );
  return {
    moving,
    variance,
    behind,
    leveled,
    mitigation,
    critical,
    healthDamage: Math.max(0, critical - 20 - 10),
  };
}
export const pipelineCalculation: Calculation = {
  steps: [
    {
      name: "Skill damage",
      expression:
        "Damage from the attack's own calculation, before the target's defenses",
    },
    {
      name: "Moving-player damage",
      expression:
        "Apply the moving-player adjustment from Combat Advantage, before the avoidance roll",
    },
    {
      name: "Avoidance",
      expression:
        "Roll the chance from Resistance and Mitigation, adjusted by Combat Advantage. A successful block, miss, or resist ends the hit",
    },
    {
      name: "Variance",
      expression: "Damage × a random percentage between 90% and 110%",
      rounding: "nearest",
    },
    {
      name: "Advantage damage",
      expression: "Apply the from-behind damage bonus from Combat Advantage",
    },
    {
      name: "Level adjustment",
      expression:
        "Damage × 2% per level above the target, or −2% per level below it. Limit the percentage to −20% through +20% before multiplying",
      rounding: "up",
    },
    {
      name: "Damage after level adjustment",
      expression: "Damage + level adjustment",
    },
    {
      name: "Slayer reduction",
      expression:
        "At 10% Slayer mastery or more, reduce a boss or elite monster's damage to a player or pet by 1% per 10 percentage points of mastery, up to 10%. Use the owner's mastery for a pet",
      rounding: "up",
    },
    {
      name: "Rampage damage",
      expression:
        "A monster or NPC with the Rampage passive below 10% Health adds damage × a random 50% to 75% on a non-spell hit",
      rounding: "up",
    },
    {
      name: "Mitigated damage",
      expression:
        "Subtract damage prevented by the matching stat, using Resistance and Mitigation",
    },
    {
      name: "Critical Resist",
      expression: "Target Critical Resist",
      limit: "between 0% and 100%",
    },
    {
      name: "Critical extra percentage",
      expression: "50% × (100% − Critical Resist)",
    },
    {
      name: "Critical damage",
      expression:
        "On a critical hit, mitigated damage × (100% + critical extra percentage)",
      rounding: "nearest",
    },
    {
      name: "On-hit effects",
      expression:
        "The target's Heal on Hit heals the melee attacker, then its damage shields hurt the attacker. Neither changes this hit's damage",
    },
    {
      name: "Resource gains",
      expression:
        "Grant eligible auto-attack Rage, received-hit Rage, and Mystic Spark Mana before shields absorb the hit",
    },
    {
      name: "Damage after shields",
      expression:
        "Subtract Ward absorption, then Mana Shield absorption, from the hit",
    },
    {
      name: "Lifetap",
      expression:
        "Use remaining positive damage for the lifetap calculation in Healing",
    },
    {
      name: "Health damage",
      expression:
        "Only the damage remaining after shields reduces Health. An active eligible Parry blocks it and counterattacks instead",
    },
  ],
  example: () => {
    const result = hitPipelineExample();
    return {
      given: [
        "201 skill damage",
        "a moving player hit from behind",
        "a successful hit and a 105% variance roll",
        "attacker 2 levels higher",
        "100 target Defense",
        "a critical hit with 20% Critical Resist",
        "20 Ward left and Mana Shield active with 10 Mana",
        "no Slayer reduction, Rampage, on-hit effects, or Parry",
      ],
      result: `${number(result.healthDamage)} Health damage`,
      working: [
        `Moving-player damage: 201 + 20 = ${number(result.moving)}`,
        `Variance: ${number(result.moving)} × 105% = ${number(result.variance)}, rounded`,
        `Advantage damage: ${number(result.variance)} + ${number(ceilToInt(multiplyF32(result.variance, 0.1)))} + 1 = ${number(result.behind)}`,
        `Level adjustment: ${number(result.behind)} × 4% = ${number(ceilToInt(multiplyF32(result.behind, 0.04)))}, rounded up`,
        `Damage after level adjustment: ${number(result.behind)} + ${number(ceilToInt(multiplyF32(result.behind, 0.04)))} = ${number(result.leveled)}`,
        `Mitigated damage: ${number(result.leveled)} − ${number(result.mitigation.prevented)} = ${number(result.mitigation.taken)}`,
        `Critical extra percentage: 50% × (100% − 20%) = ${percent(multiplyF32(0.5, addF32(1, -0.2)))}`,
        `Critical damage: ${number(result.mitigation.taken)} × 140% = ${number(result.critical)}, rounded`,
        `Damage after shields: ${number(result.critical)} − 20 − 10 = ${number(result.healthDamage)}`,
      ],
    };
  },
};

// Source: server-scripts/Combat.cs:673-698,776-781 — moving avoidance adjusts after from-behind avoidance, moving damage adjusts before variance.
export const advantageCalculation: Calculation = {
  steps: [
    {
      name: "From-behind avoidance",
      expression:
        "For a hit from behind: avoidance chance × 80%. Otherwise keep the original chance",
    },
    {
      name: "Moving-player avoidance",
      expression:
        "For a moving player: avoidance chance after any applicable from-behind adjustment − 25 percentage points",
      limit: "at least 0%",
    },
    {
      name: "Moving-player extra damage",
      expression:
        "Only when the target is a moving player: 10% of incoming skill damage, before variance",
      rounding: "down",
    },
    {
      name: "From-behind extra damage",
      expression:
        "For a hit from behind: 10% of damage after variance, or 25% for Improved Backstab and Rogue mercenaries",
      rounding: "up",
    },
    {
      name: "From-behind damage",
      expression:
        "For a hit from behind: damage after variance + from-behind extra damage + 1",
    },
  ],
  example: () => {
    const behindChance = multiplyF32(0.5, 0.8);
    const movingChance = Math.max(0, addF32(behindChance, -0.25));
    const movingBonus = floorToInt(multiplyF32(201, 0.1));
    const damage = 201 + movingBonus;
    const extra = ceilToInt(multiplyF32(damage, 0.1));
    return {
      given: [
        "50% initial avoidance",
        "201 skill damage",
        "a moving player hit from behind",
        "100% variance",
        "no Improved Backstab",
      ],
      result: `${number(damage + extra + 1)} damage before level adjustment and mitigation, with ${percent(movingChance)} avoidance`,
      working: [
        `From-behind avoidance: 50% × 80% = ${percent(behindChance)}`,
        `Moving-player avoidance: ${percent(behindChance)} − 25 percentage points = ${percent(movingChance)}`,
        `Moving-player extra damage: 201 × 10% = ${number(movingBonus)}, rounded down`,
        `From-behind extra damage: ${number(damage)} × 10% = ${number(extra)}, rounded up`,
        `From-behind damage: ${number(damage)} + ${number(extra)} + 1 = ${number(damage + extra + 1)}`,
      ],
    };
  },
};

// Source: server-scripts/Skills.cs:GetFinalDamageDoT,ApplyDamageOverTimeBonuses — layers round up, then online player-caster Reaper Form and Deathly Focus each round; target maximum-Health damage is added after critical scaling, before Ward.
export function damageOverTimeBonuses(
  damage: number,
  counters: number,
  reaper: number,
  execute: number,
) {
  const layered =
    counters === 2
      ? ceilToInt(multiplyF32(damage, 0.85))
      : counters === 1
        ? ceilToInt(multiplyF32(damage, 0.7))
        : damage;
  const transformed = iround(multiplyF32(layered, addF32(1, reaper)));
  return {
    layered,
    transformed,
    total:
      execute > 0
        ? iround(multiplyF32(transformed, addF32(1, execute)))
        : transformed,
  };
}
export const damageOverTimeCalculation: Calculation = {
  steps: [
    {
      name: "Flat tick",
      expression:
        "Base tick + the rounded attribute addition from the effect table",
    },
    {
      name: "Mitigated tick",
      expression:
        "Flat tick − damage prevented by the matching stat, using Resistance and Mitigation",
    },
    {
      name: "Tick after Cleanse",
      expression:
        "Mitigated tick × 100% with 3 layers, 85% with 2, or 70% with 1",
      rounding: "up",
    },
    {
      name: "Reaper Form tick",
      expression:
        "Tick after Cleanse × (100% + caster's active Reaper Form magic damage bonus)",
      rounding: "nearest",
    },
    {
      name: "Deathly Focus tick",
      expression:
        "Reaper Form tick × (100% + caster's Deathly Focus bonus), only below 30% target Health",
      rounding: "nearest",
    },
    {
      name: "Critical tick",
      expression:
        "Apply critical extra damage using the hit pipeline's Critical Resist rule, with a 50% base extra percentage",
      rounding: "nearest",
    },
    {
      name: "Final tick",
      expression:
        "Add the debuff's percentage of the target's maximum Health, rounded, then Ward absorbs damage before Health is lost",
    },
  ],
  example: () => {
    const result = damageOverTimeBonuses(101, 2, 0.5, 0.1);
    return {
      given: [
        "101 damage after mitigation",
        "2 remaining layers",
        "50% active Reaper Form bonus",
        "10% Deathly Focus bonus and target below 30% Health",
        "a non-critical tick with no percentage-health damage or Ward",
      ],
      result: `${number(result.total)} damage each second`,
      working: [
        `Tick after Cleanse: 101 × 85% = ${number(result.layered)}, rounded up`,
        `Reaper Form tick: ${number(result.layered)} × 150% = ${number(result.transformed)}, rounded`,
        `Deathly Focus tick: ${number(result.transformed)} × 110% = ${number(result.total)}, rounded`,
      ],
    };
  },
};

// Source: server-scripts/TargetDamageSkill.cs:249,291; AreaDamageSkill.cs:135,149-154; Combat.cs:602-613 — targeted and direct area hits add maximum Health to positive listed threat, while threat uses pre-pipeline damage and is capped by current victim Health.
export function hitThreat(
  aggro: number,
  maximumHealth: number,
  damage: number,
  stunChance: number,
  stunTime: number,
  fearChance: number,
  fearTime: number,
  victimHealth: number,
) {
  const stun = iround(multiplyF32(multiplyF32(stunChance, stunTime), 10));
  const fear = iround(multiplyF32(multiplyF32(fearChance, fearTime), 10));
  return {
    stun,
    fear,
    total: Math.min(
      victimHealth,
      aggro + (aggro > 0 ? maximumHealth : 0) + damage + stun + fear,
    ),
  };
}
export const threatCalculation: Calculation = {
  steps: [
    {
      name: "Skill threat",
      expression:
        "Listed skill threat + attacker maximum Health for a targeted damage skill or direct area damage without a spawned projectile, when listed threat is positive. Other damage handlers do not add this Health bonus",
    },
    {
      name: "Stun threat",
      expression: "Stun chance × stun duration × 10",
      rounding: "nearest",
    },
    {
      name: "Fear threat",
      expression: "Fear chance × fear duration × 10",
      rounding: "nearest",
    },
    {
      name: "Control threat",
      expression: "Stun threat + fear threat",
    },
    {
      name: "Threat gained",
      expression:
        "Skill threat + skill damage before avoidance and mitigation + control threat",
      limit: "at most the victim's current Health",
    },
  ],
  example: () => {
    const result = hitThreat(10, 2000, 201, 0.5, 3, 0.1, 5, 5000);
    return {
      given: [
        "10 positive listed threat on a targeted damage skill",
        "2,000 attacker maximum Health",
        "201 skill damage",
        `50% stun chance for ${seconds(3)}`,
        `10% fear chance for ${seconds(5)}`,
        "5,000 victim current Health",
      ],
      result: `${number(result.total)} threat gained`,
      working: [
        `Skill threat: 10 + 2,000 = ${number(10 + 2000)}`,
        `Stun threat: 50% × ${seconds(3)} × 10 = ${number(result.stun)}, rounded`,
        `Fear threat: 10% × ${seconds(5)} × 10 = ${number(result.fear)}, rounded`,
        `Control threat: ${number(result.stun)} + ${number(result.fear)} = ${number(result.stun + result.fear)}`,
        `Threat gained: ${number(10 + 2000)} + 201 + ${number(result.stun + result.fear)} = ${number(result.total)}`,
      ],
    };
  },
};

// Source: server-scripts/BuffSkill.cs:518-540; TargetBuffSkill.cs:321-334 — a debuff whose probIgnoreCleanse is 1 (100% Cleanse Resist) is skipped, so no layers are removed.
export function extraCleanseChance(resist: number, accuracy: number) {
  return clamp(multiplyF32(addF32(1, -resist), addF32(1, accuracy)), 0, 1);
}
export const cleanseCalculation: Calculation = {
  steps: [
    {
      name: "Extra-layer chance",
      expression: "(100% − debuff Cleanse Resist) × (100% + caster Accuracy)",
      limit: "between 0% and 100%",
    },
    {
      name: "Layers removed",
      expression:
        "Below 100% Cleanse Resist, one layer is always removed and two separate rolls at the extra-layer chance can each remove one more. At 0%, all three layers are removed. At 100%, no layers are removed",
    },
  ],
  example: () => {
    const chance = extraCleanseChance(0.5, 0.2);
    return {
      given: ["50% debuff Cleanse Resist", "20% caster Accuracy"],
      result: `1 guaranteed layer removed, with ${percent(chance)} chance for each of 2 extra layers`,
      working: [
        `Extra-layer chance: (100% − 50%) × (100% + 20%) = ${percent(chance)}`,
      ],
    };
  },
};

// Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — monster buffs roll removal against probIgnoreCleanse, shown as Cleanse Resist on this site's skill pages.
export const dispelCalculation: Calculation = {
  steps: [
    {
      name: "Cleanse Resist reduction",
      expression:
        "50% of caster Accuracy for a single-target spell, 1 percentage point per scroll rank for a single-target scroll, or 0 for an area dispel",
    },
    {
      name: "Buff removal chance",
      expression:
        "100% − the monster buff's Cleanse Resist + Cleanse Resist reduction",
      limit: "between 0% and 100%",
    },
  ],
  example: () => {
    const reduction = multiplyF32(0.2, 0.5);
    const chance = clamp(addF32(1, -addF32(0.5, -reduction)), 0, 1);
    return {
      given: [
        "a single-target dispel spell",
        "20% caster Accuracy",
        "50% Cleanse Resist on the monster buff",
      ],
      result: `${percent(chance)} chance to remove that buff after the spell lands`,
      working: [
        `Cleanse Resist reduction: 20% × 50% = ${percent(reduction)}`,
        `Buff removal chance: 100% − 50% + ${percent(reduction)} = ${percent(chance)}`,
      ],
    };
  },
};

// Source: server-scripts/Combat.cs:DealDamageAt — dealt-hit Rage counts auto-attack damage after mitigation and critical hits, before Ward and Mana Shield, capped at current target Health.
export const dealtRageCalculation: Calculation = {
  steps: [
    {
      name: "Damage counted",
      expression:
        "Auto attack damage after the target's mitigation and critical hits, before Ward and Mana Shield",
      limit: "at most the target's current Health",
    },
    {
      name: "Rage gained",
      expression: "Damage counted × 25%",
      rounding: "down",
    },
  ],
  example: () => {
    const damage = Math.min(201, 150);
    const rage = floorToInt(multiplyF32(damage, 0.25));
    return {
      given: [
        "201 auto attack damage before shields",
        "150 target current Health",
      ],
      result: `${number(rage)} Rage gained`,
      working: [
        `Damage counted: smaller of 201 and 150 = ${number(damage)}`,
        `Rage gained: ${number(damage)} × 25% = ${number(rage)}, rounded down`,
      ],
    };
  },
};
