import type { ClassName } from "$lib/utils/classes";
import type { ClassGuide } from "$lib/types/classes";

// Each fact carries its own Source citation, which the citation check reads from this file.
export const CLASS_GUIDES: Record<ClassName, ClassGuide> = {
  warrior: {
    attributes: {
      text: "Strength raises physical damage and maximum rage. Constitution raises health and block chance.",
      source:
        "Source: server-scripts/Strength.cs:15-18,80-83; server-scripts/Constitution.cs:13-16,73-76 — attribute effects",
    },
    equipment: {
      text: "Holds a shield. A two-handed weapon uses both hands, so you cannot combine it with a shield.",
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
        text: "You gain rage when your auto attacks deal damage and when you take Normal damage.",
        source:
          "Source: server-scripts/Combat.cs:1364-1388 — rage gain from hits and follow-up attacks",
        href: "/mechanics/combat#rage-generation",
        linkText: "Rage formulas",
      },
    ],
  },
  cleric: {
    attributes: {
      text: "Wisdom increases your healing and some protective buffs. Intelligence raises mana and magic damage.",
      source:
        "Source: server-scripts/Wisdom.cs:107-114,129-156; server-scripts/Intelligence.cs:21-39 — attribute effects",
    },
    equipment: {
      text: "Holds a shield. A two-handed weapon uses both hands, so you cannot combine it with a shield.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Resurrection works on a player's remains or on a dead mercenary.",
        source:
          "Source: server-scripts/TargetHealSkill.cs:17-35 — resurrection target selection",
        href: "/mechanics/death#death",
        linkText: "Death and remains",
      },
      {
        text: "Cleanse removes only poison and disease effects. An effect with high resistance can need more than one cast.",
        source:
          "Source: server-scripts/TargetBuffSkill.cs:134-158,318-337 — matching debuff types and cleanse counters; server-scripts/BuffSkill.cs:GetCleanseCountersRemoved — resistance changes counters removed",
        href: "/mechanics/combat#effects-and-control",
        linkText: "Cleanse rules",
      },
    ],
  },
  druid: {
    attributes: {
      text: "Wisdom increases your healing and some protective buffs. Intelligence raises mana and magic damage.",
      source:
        "Source: server-scripts/Wisdom.cs:107-114,129-156; server-scripts/Intelligence.cs:21-39 — attribute effects",
    },
    equipment: {
      text: "Holds a shield. A two-handed weapon uses both hands, so you cannot combine it with a shield.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Spirit of Wolf does not work inside dungeons.",
        source:
          "Source: server-scripts/PlayerSkills.cs:405-412,645-650 — skills without allowDungeon cannot be cast in dungeons",
      },
      {
        text: "Companion Spirit cannot summon its bear while you already have an active pet.",
        source:
          "Source: server-scripts/SummonSkill.cs:22-41,79-86 — an occupied active-pet slot prevents summoning",
        href: "/summons#pets-and-familiars",
        linkText: "Pet rules",
      },
    ],
  },
  ranger: {
    attributes: {
      text: "Dexterity adds bow damage, accuracy, and critical chance. Strength raises physical damage. Wisdom counts three times for your healing, before the healing cap applies.",
      source:
        "Source: server-scripts/Dexterity.cs:59-71,89-92; server-scripts/Strength.cs:15-18; server-scripts/Wisdom.cs:107-114 — attribute effects and Ranger multiplier",
    },
    equipment: {
      text: "Holds your bow, not a shield. Your main-hand weapon stays available for melee skills.",
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
        text: "Wild Strike turns your next sword or bow auto attack into Magic damage.",
        source:
          "Source: server-scripts/DamageSkill.cs:49-65 — a Ranger follow-up attack consumes Wild Strike and becomes Magic damage",
        href: "/mechanics/combat#wild-strike",
        linkText: "Wild Strike damage",
      },
    ],
  },
  rogue: {
    attributes: {
      text: "Dexterity raises accuracy, critical chance, and poison damage. Strength raises physical damage and maximum rage.",
      source:
        "Source: server-scripts/Dexterity.cs:59-71,89-96; server-scripts/Strength.cs:15-18,80-83 — attribute effects",
    },
    equipment: {
      text: "Holds a second weapon, so you fight with two. Weapon skills still need a weapon in your main hand.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:790-795,834-839; server-scripts/ScriptableSkill.cs:139-143 — dual wield and main-hand check",
    },
    rules: [
      {
        text: "Rogue skills need a dagger in your main hand.",
        source:
          "Source: server-scripts/ScriptableSkill.cs:102-145 — a required weapon category prevents casting with the wrong weapon",
      },
      {
        text: "Rage does not regenerate on its own. You gain it when your auto attacks deal damage and when you take Normal damage. Equipment and buffs can add regeneration.",
        source:
          "Source: server-scripts/Energy.cs:17,41-51; server-scripts/Combat.cs:1364-1388 — recovery bonus and combat rage gain",
        href: "/mechanics/character#resources",
        linkText: "Resource rules",
      },
    ],
  },
  wizard: {
    attributes: {
      text: "Intelligence raises mana and magic damage. Dexterity raises accuracy and critical chance.",
      source:
        "Source: server-scripts/Intelligence.cs:21-39; server-scripts/Dexterity.cs:59-71 — attribute effects",
    },
    equipment: {
      text: "Holds a shield. A two-handed weapon uses both hands, so you cannot combine it with a shield.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Mystic Spark costs no mana and gives back 35% of its damage as mana, rounded down. Damage beyond the target's remaining health does not count.",
        source:
          "Source: server-scripts/Combat.cs:1221-1229,1231-1278 — Mystic Spark caps mana return by target health and restores it before ward absorption",
      },
      {
        text: "Mana Shield absorbs incoming damage by spending one mana per point. It ends when you run out of mana.",
        source:
          "Source: server-scripts/Combat.cs:1281-1310 — shield drains mana and ends when depleted",
      },
      {
        text: "Damaging a target that Enthrall put to sleep wakes it up.",
        source:
          "Source: server-scripts/Combat.cs:760-763; server-scripts/Skills.cs:1547-1564 — damage ends movement-lock sleep effects",
      },
    ],
  },
  bard: {
    attributes: {
      text: "Each point of Charisma adds 0.1% song power, up to +200%, and lowers the chance that a target resists your charm by 0.02 percentage points.",
      source:
        "Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:27-40; server-scripts/BardCharmSongSkill.cs:66-71 — Charisma scales songs and reduces charm resistance",
    },
    equipment: {
      text: "Holds your instrument. Songs need it, so you cannot use a two-handed weapon.",
      source:
        "Source: server-scripts/ScriptableSkill.cs:130-138; server-scripts/EquipmentItem.cs:107-120,130-140 — instrument casting and two-handed restriction",
    },
    rules: [
      {
        text: "You can keep two songs active at once. Polyphony raises this to three.",
        source:
          "Source: server-scripts/PlayerSkills.cs:1204-1215 — base two-song limit plus passive slots",
        href: "/mechanics/bard#songs",
        linkText: "Song rules",
      },
      {
        text: "When all song slots are full, a new song replaces the oldest one.",
        source:
          "Source: server-scripts/PlayerSkills.cs:940-974 — active songs refresh or displace the oldest",
      },
    ],
  },
};
