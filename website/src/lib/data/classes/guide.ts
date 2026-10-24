import type { ClassName } from "$lib/utils/classes";
import type { ClassGuide } from "$lib/types/classes";

// Each fact carries its own Source citation, which the citation check reads from this file.
export const CLASS_GUIDES: Record<ClassName, ClassGuide> = {
  warrior: {
    attributes: {
      text: "Each Strength point adds 1 Attack Power and 10 maximum Rage. Each Constitution point adds 25 maximum Hit Points and 0.03% Block Chance. Constitution adds no Health Regeneration.",
      source:
        "Source: server-scripts/Strength.cs:15-18,80-83; server-scripts/Constitution.cs:13-25,73-76; server-scripts/Health.cs:28-44 — Constitution adds maximum health, not recovery",
    },
    equipment: {
      text: "Your off-hand holds a shield. You cannot use a shield with a two-handed weapon.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Taking off your shield immediately ends Relentless Guard and Avatar of War.",
        source:
          "Source: server-scripts/PlayerEquipment.cs:322-328 — shield removal clears both buffs",
      },
      {
        text: "You gain Rage when your auto attacks deal damage and when a single-target physical melee hit damages you.",
        source:
          "Source: server-scripts/Combat.cs:1183-1197,1386-1410 — Rage gain from targeted physical melee hits and auto attacks",
        href: "/mechanics/combat#rage-generation",
        linkText: "Rage formulas",
      },
    ],
  },
  cleric: {
    attributes: {
      text: "Each Wisdom point adds 0.4% to direct heals, up to a 500% bonus. Buffs that raise maximum Hit Points gain 2 maximum Hit Points per Wisdom point. Armor Class and Magic Resist buffs each gain 15% of your Wisdom, rounded. Intelligence adds 20 maximum Mana per point and 150% of your Intelligence as Spell Power, rounded.",
      source:
        "Source: server-scripts/Wisdom.cs:107-114; server-scripts/Buff.cs:47-60,113-150; server-scripts/Intelligence.cs:21-39 — Wisdom scales heals and protective buffs; Intelligence increases maximum mana and magic damage",
    },
    equipment: {
      text: "Your off-hand holds a shield. You cannot use a shield with a two-handed weapon.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Resurrection works on a player's remains or on a dead mercenary.",
        source:
          "Source: server-scripts/TargetHealSkill.cs:CorrectedTarget — resurrection target selection",
        href: "/mechanics/death#death",
        linkText: "Death and remains",
      },
      {
        text: "Cleanse removes only poison and disease effects. A debuff with Cleanse Resist above 0% can need more than one cast. At 100% Cleanse Resist it cannot be cleansed.",
        source:
          "Source: server-scripts/TargetBuffSkill.cs:137-161,321-340 — matching debuff types and cleanse counters; server-scripts/BuffSkill.cs:GetCleanseCountersRemoved — resistance changes counters removed",
        href: "/mechanics/combat#cleanse",
        linkText: "Cleanse rules",
      },
    ],
  },
  druid: {
    attributes: {
      text: "Each Wisdom point adds 0.4% to direct heals, up to a 500% bonus. Buffs that raise maximum Hit Points gain 2 maximum Hit Points per Wisdom point. Armor Class and Magic Resist buffs each gain 15% of your Wisdom, rounded. Intelligence adds 20 maximum Mana per point and 150% of your Intelligence as Spell Power, rounded.",
      source:
        "Source: server-scripts/Wisdom.cs:107-114; server-scripts/Buff.cs:47-60,113-150; server-scripts/Intelligence.cs:21-39 — Wisdom scales heals and protective buffs; Intelligence increases maximum mana and magic damage",
    },
    equipment: {
      text: "Your off-hand holds a shield. You cannot use a shield with a two-handed weapon.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "You cannot cast Spirit of Wolf in a dungeon, and entering a dungeon ends it.",
        source:
          "Source: server-scripts/PlayerSkills.cs:814-819,1052-1055; server-scripts/Player.cs:11318-11324 — dungeon casting restriction and buff removal",
      },
      {
        text: "Companion Spirit cannot summon its bear while you already have an active pet.",
        source:
          "Source: server-scripts/SummonSkill.cs:44-61,112-119 — an occupied active-pet slot prevents Druid summoning",
        href: "/summons#how-summons-work",
        linkText: "Pet rules",
      },
    ],
  },
  ranger: {
    attributes: {
      text: "Each Dexterity point adds 0.05% Accuracy and 0.03% Critical Strike. Bow damage gains 150% of your Dexterity, rounded. Each Strength point adds 1 Attack Power. Direct heals gain 1.2% per Wisdom point, up to a 500% bonus.",
      source:
        "Source: server-scripts/Dexterity.cs:59-71,89-92; server-scripts/Strength.cs:15-18; server-scripts/Wisdom.cs:107-114 — attribute effects and Ranger multiplier",
    },
    equipment: {
      text: "Your bow goes in the off-hand slot. Your main-hand weapon stays available for melee skills.",
      source:
        "Source: server-scripts/ScriptableSkill.cs:120-143; server-scripts/PlayerEquipment.cs:856-900 — bow slot and main-hand weapon",
    },
    rules: [
      {
        text: "A bow attack needs the ammunition type of your bow in your inventory.",
        source:
          "Source: server-scripts/TargetProjectileSkill.cs:32-48,103-109 — Ranger ammunition check",
      },
      {
        text: "Wild Strike turns your next melee or bow auto attack into magic damage.",
        source:
          "Source: server-scripts/DamageSkill.cs:49-65 — a Ranger follow-up attack consumes Wild Strike and becomes Magic damage",
        href: "/mechanics/combat#wild-strike",
        linkText: "Wild Strike damage",
      },
    ],
  },
  rogue: {
    attributes: {
      text: "Each Dexterity point adds 0.05% Accuracy and 0.03% Critical Strike. Poison damage from your attacks gains 250% of your Dexterity, rounded. Each Strength point adds 1 Attack Power and 10 maximum Rage.",
      source:
        "Source: server-scripts/Dexterity.cs:59-71,89-96; server-scripts/Strength.cs:15-18,80-83 — attribute effects",
    },
    equipment: {
      text: "Your off-hand holds a second weapon. Weapon skills still need a weapon in your main hand.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:790-795,834-839; server-scripts/ScriptableSkill.cs:139-143 — dual wield and main-hand check",
    },
    rules: [
      {
        text: "Rogue skills need a light one-handed weapon, such as a dagger or spear, in your main hand.",
        source:
          "Source: server-scripts/ScriptableSkill.cs:102-145 — a required weapon category prevents casting with the wrong weapon",
      },
      {
        text: "Rage does not regenerate on its own. You gain it when your auto attacks deal damage and when a single-target physical melee hit damages you. Passive skills and buffs can add regeneration.",
        source:
          "Source: server-scripts/Energy.cs:17,41-51; server-scripts/Skills.cs:440-458; server-scripts/Combat.cs:1183-1197,1386-1410 — Rage recovery from passive skills and buffs; targeted physical melee hits and auto attacks",
        href: "/mechanics/character#resources",
        linkText: "Resource rules",
      },
    ],
  },
  wizard: {
    attributes: {
      text: "Intelligence adds 20 maximum Mana per point and 150% of your Intelligence as Spell Power, rounded. Each Dexterity point adds 0.05% Accuracy and 0.03% Critical Strike.",
      source:
        "Source: server-scripts/Intelligence.cs:21-39; server-scripts/Dexterity.cs:59-71 — Intelligence increases maximum mana and magic damage",
    },
    equipment: {
      text: "Your off-hand holds a shield. You cannot use a shield with a two-handed weapon.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Mystic Spark costs no Mana and gives back 35% of its damage as Mana, rounded down. Damage beyond the target's remaining Hit Points does not count.",
        source:
          "Source: server-scripts/Combat.cs:1235-1244,1245-1294 — Mystic Spark caps mana return by target health and restores it before ward absorption",
      },
      {
        text: "Mana Shield spends 1 Mana per damage point absorbed. Damage beyond your remaining Mana reaches your Hit Points and ends the shield.",
        source:
          "Source: server-scripts/Combat.cs:1295-1325 — mana.current >= num absorbs damage without removal; insufficient mana removes Mana Shield",
        href: "/skills/mana_shield",
        linkText: "Mana Shield",
      },
      {
        text: "Damaging a target that Enthrall put to sleep wakes it up.",
        source:
          "Source: server-scripts/Combat.cs:773-776; server-scripts/Skills.cs:1622-1639 — damage ends movement-lock sleep effects",
      },
    ],
  },
  bard: {
    attributes: {
      text: "Each Charisma point makes your songs and Final Cadence 0.1% stronger, up to a 200% bonus, and subtracts 0.02% from the chance that a target resists your charm. Wisdom and Intelligence do not change your songs or Final Cadence.",
      source:
        "Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:27-40; server-scripts/BardCharmSongSkill.cs:66-71; server-scripts/BardSongSkill.cs:Apply; server-scripts/BardFinalCadenceSkill.cs:Apply — Charisma scales songs and Final Cadence and reduces charm resistance",
    },
    equipment: {
      text: "Your off-hand holds your instrument. Songs need it, so you cannot use a two-handed weapon.",
      source:
        "Source: server-scripts/ScriptableSkill.cs:130-138; server-scripts/EquipmentItem.cs:107-120,130-140 — instrument casting and two-handed restriction",
    },
    rules: [
      {
        text: "You can keep two songs active at once. Polyphony removes this limit.",
        source:
          "Source: server-scripts/PlayerSkills.cs:1662-1677 — base two-song limit plus passive slots, removed by an unlimited passive",
        href: "/mechanics/bard#songs",
        linkText: "Song rules",
      },
      {
        text: "Without Polyphony, a new song replaces the oldest one when both slots are full.",
        source:
          "Source: server-scripts/PlayerSkills.cs:1345-1379 — active songs refresh or displace the oldest while a limit applies",
      },
      {
        text: "Virtuosity and Final Cadence need at least three active songs, so they require Polyphony.",
        source:
          "Source: server-scripts/BardVirtuositySkill.cs:IsDamageBonusActive; server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive — both check for three active songs",
        href: "/mechanics/bard#cadence",
        linkText: "Final Cadence",
      },
    ],
  },
  necromancer: {
    attributes: {
      text: "Intelligence adds 20 maximum Mana per point and 150% of your Intelligence as Spell Power, rounded. It also strengthens Bone Aegis's Ward, Mend Undead's Health Regeneration, Ossuary Bulwark's Armor Class, and Death Bloom's healing. Each tick of your damage-over-time spells gains 125% of your Intelligence as damage, rounded. Constitution adds 25 maximum Hit Points per point but no Health Regeneration.",
      source:
        "Source: server-scripts/Intelligence.cs:21-39; server-scripts/Constitution.cs:13-25; server-scripts/BuffSkill.cs:464-527; server-scripts/Buff.cs:47-60,113-150; server-scripts/NecromancerDeathBloomSkill.cs:19-25,47-50 — Intelligence powers protective buffs, damage-over-time and Death Bloom; Constitution increases maximum health",
    },
    equipment: {
      text: "Your off-hand holds a shield. You cannot use a shield with a two-handed weapon.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-148 — Shield slot; two-handed restrictions and requiredClass check",
    },
    rules: [
      {
        text: "You can have one active pet. Summoning a different undead companion replaces your current pet. Using the active companion's summon skill commands it to attack.",
        source:
          "Source: server-scripts/SummonSkill.cs:12-32,56,106-118 — Necromancer UsesPetAttackCommand checks MatchesPet; a different non-familiar summon destroys and replaces NetworkactivePet",
        href: "/summons#how-summons-work",
        linkText: "Pet rules",
      },
      {
        // Source: server-scripts/NecromancerPetStats.cs:38; SummonSkill.cs:99 — companion level clamps to Level.max, exported as 50 for every undead pet in the export's pets.json.
        text: "Your undead companion follows your level, up to level 50. Each of your total veteran points adds 1% of its base Attack Power and Spell Power and 0.25% of its base maximum Hit Points, Armor Class and every resist, rounded to whole points. These bonuses stop growing at 200 total veteran points.",
        source:
          "Source: server-scripts/NecromancerPetStats.cs:RefreshFromOwner,GetVeteranBonus,GetDamageBonus,GetMagicDamageBonus,GetHealthBonus — RefreshFromOwner caps pet level at Level.max and veteran points at 200; damage and magic damage use 0.01 and the other base stats 0.0025, each with RoundToInt",
        href: "/summons?summons.class=necromancer",
        linkText: "Undead companions",
      },
      {
        // Exported skills.blood_pact: max_level 5; health_cost_percent and mana_restored_percent each { base_value: 0.05, bonus_per_level: 0.05 }.
        text: "Blood Pact trades Hit Points for Mana, from 5% of each maximum at rank 1 to 25% at rank 5. You must have more Hit Points than the cost. You pay the full cost even if you need less Mana than it restores.",
        source:
          "Source: server-scripts/NecromancerBloodPactSkill.cs:13-31,53-62 — GetHealthCost uses CeilToInt of health.max; GetManaRestored uses FloorToInt of mana.max; CanConvert requires health.current > healthCost; Apply caps mana gain but pays full health cost",
        href: "/skills/blood_pact",
        linkText: "Blood Pact costs by rank",
      },
      {
        text: "Death Bloom spends 50% of your maximum Hit Points, rounded up, to heal another player, companion or mercenary. With a monster selected, it heals the one that monster is attacking. You must have more Hit Points than the cost. It cannot heal you or a familiar.",
        source:
          "Source: server-scripts/NecromancerDeathBloomSkill.cs:7-17,28-45,52-59; server-scripts/TargetHealSkill.cs:CorrectedTarget — healthCostPercent is 0.5; GetHealthCost rounds up; CheckSelf requires health above cost; CorrectedTarget follows a selected monster's target and excludes self and familiars",
        href: "/skills/death_bloom",
        linkText: "Death Bloom healing",
      },
    ],
  },
};
