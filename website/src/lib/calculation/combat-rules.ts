import { statName } from "$lib/stats";
import type { Calculation } from "$lib/types/calculation";
import {
  addF32,
  divideF32,
  multiplyF32,
  iround,
  ceilToInt,
  floorToInt,
  clamp,
} from "$lib/calculation/unity-math";
import {
  formatNumber as number,
  formatPercent as percent,
} from "$lib/utils/format";
import { formatSeconds as seconds } from "$lib/calculation/format";
import { mitigate } from "$lib/calculation/combat";

// Source: server-scripts/Combat.cs:damage,magicDamage; Strength.cs:GetDamageBonus; Intelligence.cs:GetMagicDamageBonus — percentage damage applies to the full flat stat; only the Intelligence addition and percentage addition round, not the flat-stat sum.
// Source: website/data/compendium.db classes.base_damage_value,base_damage_per_level,base_magic_damage_value,base_magic_damage_per_level: all player classes have zero base Attack Power and Spell Power.
// Source: exported-data/skills.json tooltip_template for Razor of Wrath and Arcane Edge; server-scripts/Combat.cs:damage,magicDamage: their percentage bonuses scale with current Rage and Mana respectively.
export function characterDamage(flat: number, bonus: number) {
  return Math.max(0, flat + iround(multiplyF32(flat, bonus)));
}
export const characterDamageCalculation: Calculation = {
  steps: [
    {
      name: `Flat ${statName("attack_power")}`,
      expression:
        "Strength above 0 + flat Attack Power from working equipment, learned skills and buffs",
    },
    {
      name: `Flat ${statName("spell_power")}`,
      expression:
        "150% of Intelligence above 0, rounded, + flat Spell Power from working equipment, learned skills and buffs",
    },
    {
      name: "Percentage Bonus",
      expression:
        "Sum of percentage bonuses from your learned passive skills whose conditions you meet and your buffs. Razor of Wrath scales with current Rage ÷ maximum Rage, and Arcane Edge with current Mana ÷ maximum Mana",
    },
    {
      name: "Extra Amount",
      expression: "Flat Attack Power or Flat Spell Power × Percentage Bonus",
      rounding: "nearest",
    },
    {
      name: "Character Window Stat",
      expression: "Flat Attack Power or Flat Spell Power + Extra Amount",
      limit: "at least 0",
    },
  ],
  example: () => {
    const extra = iround(multiplyF32(201, 0.5));
    const result = characterDamage(201, 0.5);
    return {
      given: ["201 flat Attack Power", "50% total Attack Power bonus"],
      result: `${number(result)} Attack Power in the character window`,
      working: [
        `Extra Amount: 201 × 50% = ${number(extra)}, rounded`,
        `Character Window Stat: 201 + ${number(extra)} = ${number(result)}`,
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
      name: "Starting Damage",
      expression:
        "Damage from the attack's own calculation, before the target's defenses",
    },
    {
      name: "Moving-Player Damage",
      expression:
        "Apply the moving-player adjustment from Combat Advantage, before the avoidance roll",
    },
    {
      name: "Avoidance",
      expression:
        "Roll the block, miss or resist chance, adjusted by Combat Advantage. A successful block, miss or resist ends the hit",
    },
    {
      name: "Variance",
      expression: "Damage × a random percentage between 90% and 110%",
      rounding: "nearest",
    },
    {
      name: "From-Behind Damage",
      expression: "Apply the from-behind damage bonus from Combat Advantage",
    },
    {
      name: "Level Adjustment",
      expression:
        "Damage × 2% per level above the target, or −2% per level below it. Limit the percentage to −20% through +20% before multiplying",
      rounding: "up",
    },
    {
      name: "Damage After Level Adjustment",
      expression: "Damage + Level Adjustment",
    },
    {
      name: "Slayer Reduction",
      expression:
        "From 10% Slayer mastery, bosses and elites deal 0.1% less damage to you and your mercenaries, companions and familiars per 1% mastery, up to 10% less at 100%. Mercenaries, companions and familiars use their owner's mastery",
      rounding: "up",
    },
    {
      name: "Rampage Damage",
      expression:
        "A monster or NPC with Rampage adds damage × a random 50% to 75% on a non-spell hit while below 10% of its maximum Hit Points",
      rounding: "up",
    },
    {
      name: "Reduced Damage",
      expression:
        "Subtract the damage Armor Class prevents from physical hits, or the damage Magic, Fire, Cold, Disease or Poison Resist prevents from its damage type, as in Damage Reduction",
    },
    {
      name: statName("critical_resist"),
      expression: "Target Critical Resist",
      limit: "between 0% and 100%",
    },
    {
      name: "Critical Extra Percentage",
      expression: "50% × (100% − Critical Resist)",
    },
    {
      name: "Critical Damage",
      expression:
        "On a critical hit, Reduced Damage × (100% + Critical Extra Percentage)",
      rounding: "nearest",
    },
    {
      name: "On-Hit Effects",
      expression:
        "The target's Heal on Hit heals the melee attacker, then its damage shields hurt the attacker. Neither changes this hit's damage",
    },
    {
      name: "Resource Gains",
      expression:
        "Warriors and Rogues gain auto-attack and received-hit Rage. Mystic Spark restores Mana to its Wizard caster. These gains happen before shields absorb the hit",
    },
    {
      name: "Damage After Shields",
      expression:
        "Subtract Ward absorption, then Mana Shield absorption, from the hit",
    },
    {
      name: "Lifetap",
      expression:
        "Use remaining positive damage for the lifetap calculation in Healing",
    },
    {
      name: `${statName("health")} Damage`,
      expression:
        "Only the damage remaining after shields reduces Hit Points. An active eligible Parry blocks it and counterattacks instead",
    },
  ],
  example: () => {
    const result = hitPipelineExample();
    return {
      given: [
        "201 starting damage",
        "a moving player hit from behind",
        "a successful hit and a 105% variance roll",
        "attacker 2 levels higher",
        "100 target Armor Class",
        "a critical hit with 20% Critical Resist",
        "20 Ward left and Mana Shield active with 10 Mana",
        "no Slayer reduction, Rampage, on-hit effects or Parry",
      ],
      result: `${number(result.healthDamage)} Hit Points lost`,
      working: [
        `Moving-Player Damage: 201 + 20 = ${number(result.moving)}`,
        `Variance: ${number(result.moving)} × 105% = ${number(result.variance)}, rounded`,
        `From-Behind Damage: ${number(result.variance)} + ${number(ceilToInt(multiplyF32(result.variance, 0.1)))} + 1 = ${number(result.behind)}`,
        `Level Adjustment: ${number(result.behind)} × 4% = ${number(ceilToInt(multiplyF32(result.behind, 0.04)))}, rounded up`,
        `Damage After Level Adjustment: ${number(result.behind)} + ${number(ceilToInt(multiplyF32(result.behind, 0.04)))} = ${number(result.leveled)}`,
        `Reduced Damage: ${number(result.leveled)} − ${number(result.mitigation.prevented)} = ${number(result.mitigation.taken)}`,
        `Critical Extra Percentage: 50% × (100% − 20%) = ${percent(multiplyF32(0.5, addF32(1, -0.2)), { decimals: 2, preserveNonzero: true })}`,
        `Critical Damage: ${number(result.mitigation.taken)} × 140% = ${number(result.critical)}, rounded`,
        `Damage After Shields: ${number(result.critical)} − 20 − 10 = ${number(result.healthDamage)}`,
      ],
    };
  },
};

// Source: server-scripts/Combat.cs:718-745,837-842 — moving avoidance adjusts after from-behind avoidance, moving damage adjusts before variance.
export const advantageCalculation: Calculation = {
  steps: [
    {
      name: "From-Behind Avoidance",
      expression: "Avoidance chance × 80%",
    },
    {
      name: "Moving-Player Avoidance",
      expression:
        "Avoidance chance after the from-behind adjustment, if attacking from behind, − 25 percentage points",
      limit: "at least 0%",
    },
    {
      name: "Moving-Player Extra Damage",
      expression: "10% of Starting Damage, before Variance",
      rounding: "down",
    },
    {
      name: "Damage After Variance",
      expression:
        "(Starting Damage + any Moving-Player Extra Damage) × Variance",
      rounding: "nearest",
    },
    {
      name: "From-Behind Extra Damage",
      expression:
        "10% of Damage After Variance, or 25% for Improved Backstab and Rogue mercenaries",
      rounding: "up",
    },
    {
      name: "From-Behind Damage",
      expression: "Damage After Variance + From-Behind Extra Damage + 1",
    },
  ],
  note: "Attacking from behind means a single-target attack with attacker and target facing the same direction. Moving-player bonuses apply when the target is a moving player.",
  example: () => {
    const behindChance = multiplyF32(0.5, 0.8);
    const movingChance = Math.max(0, addF32(behindChance, -0.25));
    const movingBonus = floorToInt(multiplyF32(201, 0.1));
    const damage = 201 + movingBonus;
    const extra = ceilToInt(multiplyF32(damage, 0.1));
    return {
      given: [
        "50% initial avoidance",
        "201 starting damage",
        "a moving player hit from behind",
        "100% variance",
        "no Improved Backstab",
      ],
      result: `${number(damage + extra + 1)} damage before level adjustment and damage reduction, with ${percent(movingChance, { decimals: 2, preserveNonzero: true })} avoidance`,
      working: [
        `From-Behind Avoidance: 50% × 80% = ${percent(behindChance, { decimals: 2, preserveNonzero: true })}`,
        `Moving-Player Avoidance: ${percent(behindChance, { decimals: 2, preserveNonzero: true })} − 25 percentage points = ${percent(movingChance, { decimals: 2, preserveNonzero: true })}`,
        `Moving-Player Extra Damage: 201 × 10% = ${number(movingBonus)}, rounded down`,
        `Damage After Variance: (201 + ${number(movingBonus)}) × 100% = ${number(damage)}, rounded`,
        `From-Behind Extra Damage: ${number(damage)} × 10% = ${number(extra)}, rounded up`,
        `From-Behind Damage: ${number(damage)} + ${number(extra)} + 1 = ${number(damage + extra + 1)}`,
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
// Source: server-scripts/BuffSkill.cs:damageOverTimeBonusPerIntelligencePoint,GetDamageOverTimeAttributeBonus; Skills.cs:GetFinalDamageDoT: the example adds the rounded 125%-of-Intelligence bonus before matching-resist damage reduction.
export const damageOverTimeCalculation: Calculation = {
  steps: [
    {
      name: "Flat Tick",
      expression:
        "Listed damage each second + the rounded Attribute Addition from Debuff Strength",
    },
    {
      name: "Reduced Tick",
      expression:
        "Flat Tick − damage prevented by Armor Class for physical damage, or by Magic, Fire, Cold, Disease or Poison Resist for its damage type, as in Damage Reduction",
    },
    {
      name: "Tick After Cleanse",
      expression:
        "Reduced Tick × 100% with 3 layers, 85% with 2, or 70% with 1",
      rounding: "up",
    },
    {
      name: "Reaper Form Tick",
      expression:
        "Tick After Cleanse × (100% + caster's active Reaper Form Spell Power bonus)",
      rounding: "nearest",
    },
    {
      name: "Deathly Focus Tick",
      expression:
        "Reaper Form Tick × (100% + caster's Deathly Focus bonus), only while the target is below 30% of its maximum Hit Points",
      rounding: "nearest",
    },
    {
      name: "Critical Tick",
      expression:
        "On a critical tick: Deathly Focus Tick × (100% + 50% × (100% − target's Critical Resist)). Critical Resist is limited to 0% through 100%",
      rounding: "nearest",
    },
    {
      name: "Final Tick",
      expression:
        "Critical Tick + the debuff's percentage of the target's maximum Hit Points, rounded",
    },
  ],
  note: "The example uses an Intelligence-scaled magic debuff applied by an online player.",
  example: () => {
    const attributeAddition = iround(multiplyF32(100, 1.25));
    const flatTick = 100 + attributeAddition;
    const reduction = mitigate(flatTick, 100);
    const result = damageOverTimeBonuses(reduction.taken, 2, 0.5, 0.1);
    return {
      given: [
        "100 listed magic damage each second",
        "100 caster Intelligence, with 125% of Intelligence added to the listed tick",
        "100 target Magic Resist",
        "2 remaining layers",
        "50% active Reaper Form bonus",
        "10% Deathly Focus bonus and target below 30% of its maximum Hit Points",
        "a non-critical tick",
        "no damage from a percentage of maximum Hit Points",
        "no Ward on the target",
      ],
      result: `${number(result.total)} damage each second`,
      working: [
        `Flat Tick: 100 + round(100 × 125%) = ${number(flatTick)}`,
        `Reduced Tick: ${number(flatTick)} − ${number(reduction.prevented)} = ${number(reduction.taken)}`,
        `Tick After Cleanse: ${number(reduction.taken)} × 85% = ${number(result.layered)}, rounded up`,
        `Reaper Form Tick: ${number(result.layered)} × 150% = ${number(result.transformed)}, rounded`,
        `Deathly Focus Tick: ${number(result.transformed)} × 110% = ${number(result.total)}, rounded`,
      ],
    };
  },
};

// Source: server-scripts/TargetDamageSkill.cs:249,291; AreaDamageSkill.cs:141,155-160; Combat.cs:633-644 — targeted and direct area hits add one third of maximum Health, rounded, to positive listed threat. That skill threat counts in full, while pre-pipeline damage and control threat are capped by current victim Health.
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
  const health = aggro > 0 ? iround(divideF32(maximumHealth, 3)) : 0;
  const stun = iround(multiplyF32(multiplyF32(stunChance, stunTime), 10));
  const fear = iround(multiplyF32(multiplyF32(fearChance, fearTime), 10));
  const capped = Math.min(victimHealth, damage + stun + fear);
  return {
    health,
    stun,
    fear,
    capped,
    total: aggro + health + capped,
  };
}
export const threatCalculation: Calculation = {
  steps: [
    {
      name: "Skill Threat",
      expression:
        "Single-target or area damage skills without projectiles also add one third of the caster's maximum Hit Points, rounded, when they add extra threat",
    },
    {
      name: "Stun Threat",
      expression: "Stun chance × stun duration × 10",
      rounding: "nearest",
    },
    {
      name: "Fear Threat",
      expression: "Fear chance × fear duration × 10",
      rounding: "nearest",
    },
    {
      name: "Control Threat",
      expression: "Stun Threat + Fear Threat",
    },
    {
      name: "Damage and Control Threat",
      expression: "Starting Damage + Control Threat",
      limit: "at most the target's current Hit Points",
    },
    {
      name: "Threat Gained",
      expression: "Skill Threat + Damage and Control Threat",
    },
  ],
  example: () => {
    const result = hitThreat(10, 2000, 201, 0.5, 3, 0.1, 5, 150);
    const skillThreat = 10 + result.health;
    const control = result.stun + result.fear;
    return {
      given: [
        "10 extra threat from a single-target skill",
        `${number(2000)} attacker maximum Hit Points`,
        "201 starting damage",
        `50% stun chance for ${seconds(3)}`,
        `10% fear chance for ${seconds(5)}`,
        "150 target current Hit Points",
      ],
      result: `${number(result.total)} threat gained`,
      working: [
        `Skill Threat: 10 + ${number(2000)} ÷ 3 = 10 + ${number(result.health)} = ${number(skillThreat)}, with the Hit Points share rounded`,
        `Stun Threat: 50% × ${seconds(3)} × 10 = ${number(result.stun)}, rounded`,
        `Fear Threat: 10% × ${seconds(5)} × 10 = ${number(result.fear)}, rounded`,
        `Control Threat: ${number(result.stun)} + ${number(result.fear)} = ${number(control)}`,
        `Damage and Control Threat: 201 + ${number(control)} = ${number(201 + control)}, limited to ${number(result.capped)}`,
        `Threat Gained: ${number(skillThreat)} + ${number(result.capped)} = ${number(result.total)}`,
      ],
    };
  },
};

// Source: server-scripts/BuffSkill.cs:546-568; TargetBuffSkill.cs:338-352 — a debuff whose probIgnoreCleanse is 1 (100% Cleanse Resist) is skipped, so no layers are removed.
export function extraCleanseChance(resist: number, accuracy: number) {
  return clamp(multiplyF32(addF32(1, -resist), addF32(1, accuracy)), 0, 1);
}
export const cleanseCalculation: Calculation = {
  steps: [
    {
      name: "Extra-Layer Chance",
      expression: "(100% − debuff Cleanse Resist) × (100% + caster Accuracy)",
      limit: "between 0% and 100%",
    },
    {
      name: "Layers Removed",
      expression:
        "Below 100% Cleanse Resist, one layer is always removed and two separate rolls at the Extra-Layer Chance can each remove one more. At 0% Cleanse Resist, all three layers are removed. At 100% Cleanse Resist, none are",
    },
  ],
  example: () => {
    const chance = extraCleanseChance(0.5, 0.2);
    return {
      given: ["50% debuff Cleanse Resist", "20% caster Accuracy"],
      result: `1 guaranteed layer removed, with ${percent(chance, { decimals: 2, preserveNonzero: true })} chance for each of 2 extra layers`,
      working: [
        `Extra-Layer Chance: (100% − 50%) × (100% + 20%) = ${percent(chance, { decimals: 2, preserveNonzero: true })}`,
      ],
    };
  },
};

// Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — monster buffs roll removal against probIgnoreCleanse, shown as Cleanse Resist on this site's skill pages.
export const dispelCalculation: Calculation = {
  steps: [
    {
      name: "Cleanse Resist Reduction",
      expression:
        "50% of caster Accuracy for a single-target spell, 1% per scroll rank for a single-target scroll, or 0 for an area dispel",
    },
    {
      name: "Buff Removal Chance",
      expression:
        "100% − the monster buff's Cleanse Resist + Cleanse Resist Reduction",
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
      result: `${percent(chance, { decimals: 2, preserveNonzero: true })} chance to remove that buff after the spell lands`,
      working: [
        `Cleanse Resist Reduction: 20% × 50% = ${percent(reduction, { decimals: 2, preserveNonzero: true })}`,
        `Buff Removal Chance: 100% − 50% + ${percent(reduction, { decimals: 2, preserveNonzero: true })} = ${percent(chance, { decimals: 2, preserveNonzero: true })}`,
      ],
    };
  },
};

// Source: server-scripts/Combat.cs:DealDamageAt — dealt-hit Rage counts auto-attack damage after mitigation and critical hits, before Ward and Mana Shield, capped at current target Health.
export const dealtRageCalculation: Calculation = {
  steps: [
    {
      name: "Damage Counted",
      expression:
        "Auto attack damage after the target's damage reduction and critical hits, before Ward and Mana Shield",
      limit: "at most the target's current Hit Points",
    },
    {
      name: `${statName("rage")} Gained`,
      expression: "Damage Counted × 25%",
      rounding: "down",
    },
  ],
  example: () => {
    const damage = Math.min(201, 150);
    const rage = floorToInt(multiplyF32(damage, 0.25));
    return {
      given: [
        "201 auto attack damage before shields",
        "150 target current Hit Points",
      ],
      result: `${number(rage)} Rage gained`,
      working: [
        `Damage Counted: smaller of 201 and 150 = ${number(damage)}`,
        `Rage Gained: ${number(damage)} × 25% = ${number(rage)}, rounded down`,
      ],
    };
  },
};
