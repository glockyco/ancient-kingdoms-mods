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
      name: "Percentage bonus",
      expression:
        "Sum of percentage bonuses from your learned passive skills whose conditions you meet and your buffs. Razor of Wrath scales with current Rage ÷ maximum Rage, and Arcane Edge with current Mana ÷ maximum Mana",
    },
    {
      name: "Extra amount",
      expression: "Flat Attack Power or flat Spell Power × percentage bonus",
      rounding: "nearest",
    },
    {
      name: "Character window stat",
      expression: "Flat Attack Power or flat Spell Power + extra amount",
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
        `Extra amount: 201 × 50% = ${number(extra)}, rounded`,
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
      name: "Starting damage",
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
        "Roll the block, miss or resist chance, adjusted by Combat Advantage. A successful block, miss or resist ends the hit",
    },
    {
      name: "Variance",
      expression: "Damage × a random percentage between 90% and 110%",
      rounding: "nearest",
    },
    {
      name: "From-behind damage",
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
        "From 10% Slayer mastery, bosses and elites deal 0.1% less damage to you and your mercenaries, companions and familiars per 1% mastery, up to 10% less at 100%. Mercenaries, companions and familiars use their owner's mastery",
      rounding: "up",
    },
    {
      name: "Rampage damage",
      expression:
        "A monster or NPC with Rampage adds damage × a random 50% to 75% on a non-spell hit while below 10% of its maximum Hit Points",
      rounding: "up",
    },
    {
      name: "Reduced damage",
      expression:
        "Subtract the damage Armor Class prevents from physical hits, or the damage Magic, Fire, Cold, Disease or Poison Resist prevents from its damage type, as in Damage reduction",
    },
    {
      name: statName("critical_resist"),
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
        "On a critical hit, reduced damage × (100% + critical extra percentage)",
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
        "Warriors and Rogues gain auto-attack and received-hit Rage. Mystic Spark restores Mana to its Wizard caster. These gains happen before shields absorb the hit",
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
      name: `${statName("health")} damage`,
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
        `Moving-player damage: 201 + 20 = ${number(result.moving)}`,
        `Variance: ${number(result.moving)} × 105% = ${number(result.variance)}, rounded`,
        `From-behind damage: ${number(result.variance)} + ${number(ceilToInt(multiplyF32(result.variance, 0.1)))} + 1 = ${number(result.behind)}`,
        `Level adjustment: ${number(result.behind)} × 4% = ${number(ceilToInt(multiplyF32(result.behind, 0.04)))}, rounded up`,
        `Damage after level adjustment: ${number(result.behind)} + ${number(ceilToInt(multiplyF32(result.behind, 0.04)))} = ${number(result.leveled)}`,
        `Reduced damage: ${number(result.leveled)} − ${number(result.mitigation.prevented)} = ${number(result.mitigation.taken)}`,
        `Critical extra percentage: 50% × (100% − 20%) = ${percent(multiplyF32(0.5, addF32(1, -0.2)), { decimals: 2, preserveNonzero: true })}`,
        `Critical damage: ${number(result.mitigation.taken)} × 140% = ${number(result.critical)}, rounded`,
        `Damage after shields: ${number(result.critical)} − 20 − 10 = ${number(result.healthDamage)}`,
      ],
    };
  },
};

// Source: server-scripts/Combat.cs:684-709,787-792 — moving avoidance adjusts after from-behind avoidance, moving damage adjusts before variance.
export const advantageCalculation: Calculation = {
  steps: [
    {
      name: "From-behind avoidance",
      expression: "Avoidance chance × 80%",
    },
    {
      name: "Moving-player avoidance",
      expression:
        "Avoidance chance after any applicable from-behind adjustment − 25 percentage points",
      limit: "at least 0%",
    },
    {
      name: "Moving-player extra damage",
      expression: "10% of starting damage, before variance",
      rounding: "down",
    },
    {
      name: "Damage after variance",
      expression:
        "(Starting damage + any moving-player extra damage) × variance",
      rounding: "nearest",
    },
    {
      name: "From-behind extra damage",
      expression:
        "10% of damage after variance, or 25% for Improved Backstab and Rogue mercenaries",
      rounding: "up",
    },
    {
      name: "From-behind damage",
      expression: "Damage after variance + from-behind extra damage + 1",
    },
  ],
  note: "The from-behind and moving-player adjustments apply only when the hit meets the condition in the step's name.",
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
        `From-behind avoidance: 50% × 80% = ${percent(behindChance, { decimals: 2, preserveNonzero: true })}`,
        `Moving-player avoidance: ${percent(behindChance, { decimals: 2, preserveNonzero: true })} − 25 percentage points = ${percent(movingChance, { decimals: 2, preserveNonzero: true })}`,
        `Moving-player extra damage: 201 × 10% = ${number(movingBonus)}, rounded down`,
        `Damage after variance: (201 + ${number(movingBonus)}) × 100% = ${number(damage)}, rounded`,
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
// Source: server-scripts/BuffSkill.cs:damageOverTimeBonusPerIntelligencePoint,GetDamageOverTimeAttributeBonus; Skills.cs:GetFinalDamageDoT: the example adds the rounded 125%-of-Intelligence bonus before matching-resist damage reduction.
export const damageOverTimeCalculation: Calculation = {
  steps: [
    {
      name: "Flat tick",
      expression:
        "Listed damage each second + the rounded attribute addition from Debuff strength",
    },
    {
      name: "Reduced tick",
      expression:
        "Flat tick − damage prevented by the matching stat, as in Damage reduction",
    },
    {
      name: "Tick after Cleanse",
      expression:
        "Reduced tick × 100% with 3 layers, 85% with 2, or 70% with 1",
      rounding: "up",
    },
    {
      name: "Reaper Form tick",
      expression:
        "Tick after Cleanse × (100% + caster's active Reaper Form Spell Power bonus)",
      rounding: "nearest",
    },
    {
      name: "Deathly Focus tick",
      expression:
        "Reaper Form tick × (100% + caster's Deathly Focus bonus), only while the target is below 30% of its maximum Hit Points",
      rounding: "nearest",
    },
    {
      name: "Critical tick",
      expression:
        "On a critical tick: Deathly Focus tick × (100% + 50% × (100% − target's Critical Resist)). Critical Resist is limited to 0% through 100%",
      rounding: "nearest",
    },
    {
      name: "Final tick",
      expression:
        "Critical tick + the debuff's percentage of the target's maximum Hit Points, rounded",
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
        `Flat tick: 100 + round(100 × 125%) = ${number(flatTick)}`,
        `Reduced tick: ${number(flatTick)} − ${number(reduction.prevented)} = ${number(reduction.taken)}`,
        `Tick after Cleanse: ${number(reduction.taken)} × 85% = ${number(result.layered)}, rounded up`,
        `Reaper Form tick: ${number(result.layered)} × 150% = ${number(result.transformed)}, rounded`,
        `Deathly Focus tick: ${number(result.transformed)} × 110% = ${number(result.total)}, rounded`,
      ],
    };
  },
};

// Source: server-scripts/TargetDamageSkill.cs:249,291; AreaDamageSkill.cs:135,149-154; Combat.cs:613-624 — targeted and direct area hits add one third of maximum Health, rounded, to positive listed threat, while threat uses pre-pipeline damage and is capped by current victim Health.
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
  return {
    health,
    stun,
    fear,
    total: Math.min(victimHealth, aggro + health + damage + stun + fear),
  };
}
export const threatCalculation: Calculation = {
  steps: [
    {
      name: "Skill threat",
      expression:
        "Single-target or area damage skills without projectiles also add one third of the caster's maximum Hit Points, rounded, when they add extra threat",
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
      expression: "Skill threat + starting damage + control threat",
      limit: "at most the target's current Hit Points",
    },
  ],
  example: () => {
    const result = hitThreat(10, 2000, 201, 0.5, 3, 0.1, 5, 5000);
    const skillThreat = 10 + result.health;
    return {
      given: [
        "10 extra threat from a single-target skill",
        "2,000 attacker maximum Hit Points",
        "201 starting damage",
        `50% stun chance for ${seconds(3)}`,
        `10% fear chance for ${seconds(5)}`,
        "5,000 target current Hit Points",
      ],
      result: `${number(result.total)} threat gained`,
      working: [
        `Skill threat: 10 + 2,000 ÷ 3 = 10 + ${number(result.health)} = ${number(skillThreat)}, with the Hit Points share rounded`,
        `Stun threat: 50% × ${seconds(3)} × 10 = ${number(result.stun)}, rounded`,
        `Fear threat: 10% × ${seconds(5)} × 10 = ${number(result.fear)}, rounded`,
        `Control threat: ${number(result.stun)} + ${number(result.fear)} = ${number(result.stun + result.fear)}`,
        `Threat gained: ${number(skillThreat)} + 201 + ${number(result.stun + result.fear)} = ${number(result.total)}`,
      ],
    };
  },
};

// Source: server-scripts/BuffSkill.cs:530-552; TargetBuffSkill.cs:321-334 — a debuff whose probIgnoreCleanse is 1 (100% Cleanse Resist) is skipped, so no layers are removed.
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
        "Below 100% Cleanse Resist, one layer is always removed and two separate rolls at the extra-layer chance can each remove one more. At 0% Cleanse Resist, all three layers are removed. At 100% Cleanse Resist, none are",
    },
  ],
  example: () => {
    const chance = extraCleanseChance(0.5, 0.2);
    return {
      given: ["50% debuff Cleanse Resist", "20% caster Accuracy"],
      result: `1 guaranteed layer removed, with ${percent(chance, { decimals: 2, preserveNonzero: true })} chance for each of 2 extra layers`,
      working: [
        `Extra-layer chance: (100% − 50%) × (100% + 20%) = ${percent(chance, { decimals: 2, preserveNonzero: true })}`,
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
      result: `${percent(chance, { decimals: 2, preserveNonzero: true })} chance to remove that buff after the spell lands`,
      working: [
        `Cleanse Resist reduction: 20% × 50% = ${percent(reduction, { decimals: 2, preserveNonzero: true })}`,
        `Buff removal chance: 100% − 50% + ${percent(reduction, { decimals: 2, preserveNonzero: true })} = ${percent(chance, { decimals: 2, preserveNonzero: true })}`,
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
        "Auto attack damage after the target's damage reduction and critical hits, before Ward and Mana Shield",
      limit: "at most the target's current Hit Points",
    },
    {
      name: `${statName("rage")} gained`,
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
        "150 target current Hit Points",
      ],
      result: `${number(rage)} Rage gained`,
      working: [
        `Damage counted: smaller of 201 and 150 = ${number(damage)}`,
        `Rage gained: ${number(damage)} × 25% = ${number(rage)}, rounded down`,
      ],
    };
  },
};
