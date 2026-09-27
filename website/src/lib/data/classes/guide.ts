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
      text: "The second slot holds a shield. A two-handed weapon cannot share it with a shield.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Removing a shield ends Relentless Guard and Avatar of War immediately.",
        source:
          "Source: server-scripts/PlayerEquipment.cs:322-328 — shield removal clears both buffs",
      },
      {
        text: "Damaging follow-up attacks and incoming normal hits generate rage.",
        source:
          "Source: server-scripts/Combat.cs:1364-1388 — rage gain from hits and follow-up attacks",
        href: "/mechanics/combat#rage-generation",
        linkText: "Rage formulas",
      },
    ],
  },
  cleric: {
    attributes: {
      text: "Wisdom strengthens healing and eligible protective buffs. Intelligence raises mana and magic damage.",
      source:
        "Source: server-scripts/Wisdom.cs:107-114,129-156; server-scripts/Intelligence.cs:21-39 — attribute effects",
    },
    equipment: {
      text: "The second slot holds a shield. A two-handed weapon cannot share it with a shield.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Resurrection targets a player's remains or a dead mercenary.",
        source:
          "Source: server-scripts/TargetHealSkill.cs:17-35 — resurrection target selection",
        href: "/mechanics/death#death",
        linkText: "Death and remains",
      },
      {
        text: "Cleanse removes poison and disease debuffs only. A resistant effect can require another cast.",
        source:
          "Source: server-scripts/TargetBuffSkill.cs:134-158,318-337 — matching debuff types and cleanse counters; server-scripts/BuffSkill.cs:GetCleanseCountersRemoved — resistance changes counters removed",
        href: "/mechanics/combat#effects-and-control",
        linkText: "Cleanse rules",
      },
    ],
  },
  druid: {
    attributes: {
      text: "Wisdom strengthens healing and eligible protective buffs. Intelligence raises mana and magic damage.",
      source:
        "Source: server-scripts/Wisdom.cs:107-114,129-156; server-scripts/Intelligence.cs:21-39 — attribute effects",
    },
    equipment: {
      text: "The second slot holds a shield. A two-handed weapon cannot share it with a shield.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Spirit of Wolf cannot be used inside a dungeon.",
        source:
          "Source: server-scripts/PlayerSkills.cs:405-412,645-650 — skills without allowDungeon cannot be cast in dungeons",
      },
      {
        text: "Companion Spirit cannot summon a bear while you already have an active pet.",
        source:
          "Source: server-scripts/SummonSkill.cs:22-41,79-86 — an occupied active-pet slot prevents summoning",
        href: "/summons#pets-and-familiars",
        linkText: "Pet rules",
      },
    ],
  },
  ranger: {
    attributes: {
      text: "Dexterity adds bow damage, accuracy, and critical chance. Strength raises physical damage. Ranger healing uses triple Wisdom before the healing cap.",
      source:
        "Source: server-scripts/Dexterity.cs:59-71,89-92; server-scripts/Strength.cs:15-18; server-scripts/Wisdom.cs:107-114 — attribute effects and Ranger multiplier",
    },
    equipment: {
      text: "The second slot holds a bow instead of a shield. A main-hand weapon remains available for melee skills.",
      source:
        "Source: server-scripts/ScriptableSkill.cs:120-143; server-scripts/PlayerEquipment.cs:856-900 — bow slot and main-hand weapon",
    },
    rules: [
      {
        text: "A bow attack needs the bow's specified ammunition in your inventory.",
        source:
          "Source: server-scripts/TargetProjectileSkill.cs:32-48,103-109 — Ranger ammunition check",
      },
      {
        text: "Wild Strike makes your next sword or bow auto attack deal Magic damage.",
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
      text: "The second slot holds another weapon for dual wielding. Weapon skills still need a main-hand weapon.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:790-795,834-839; server-scripts/ScriptableSkill.cs:139-143 — dual wield and main-hand check",
    },
    rules: [
      {
        text: "class skills require a dagger in the main hand.",
        source:
          "Source: server-scripts/ScriptableSkill.cs:102-145 — a required weapon category prevents casting with the wrong weapon",
      },
      {
        text: "Rage has no base recovery. Damaging follow-up attacks and incoming normal hits generate it. Equipment and buffs can add recovery.",
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
      text: "The second slot holds a shield. A two-handed weapon cannot share it with a shield.",
      source:
        "Source: server-scripts/PlayerEquipment.cs:107-114; server-scripts/EquipmentItem.cs:107-120,130-140 — shield slot and two-handed restriction",
    },
    rules: [
      {
        text: "Mystic Spark costs no mana. It restores mana equal to 35% of its damage, rounded down. Damage beyond the target's remaining health does not count.",
        source:
          "Source: server-scripts/Combat.cs:1221-1229,1231-1278 — Mystic Spark caps mana return by target health and restores it before ward absorption",
      },
      {
        text: "Mana Shield spends one mana per point of incoming damage it absorbs. It ends when mana runs out.",
        source:
          "Source: server-scripts/Combat.cs:1281-1310 — shield drains mana and ends when depleted",
      },
      {
        text: "Damaging an enemy ends the sleep from Enthrall.",
        source:
          "Source: server-scripts/Combat.cs:760-763; server-scripts/Skills.cs:1547-1564 — damage ends movement-lock sleep effects",
      },
    ],
  },
  bard: {
    attributes: {
      text: "Charisma adds 0.1% song power per point (up to +200%) and lowers charm resist chance by 0.02 percentage points per point.",
      source:
        "Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:27-40; server-scripts/BardCharmSongSkill.cs:66-71 — Charisma scales songs and reduces charm resistance",
    },
    equipment: {
      text: "The second slot holds an instrument. Songs require it, and a two-handed weapon cannot share the slot with it.",
      source:
        "Source: server-scripts/ScriptableSkill.cs:130-138; server-scripts/EquipmentItem.cs:107-120,130-140 — instrument casting and two-handed restriction",
    },
    rules: [
      {
        text: "Two songs can stay active by default. Polyphony adds a third slot.",
        source:
          "Source: server-scripts/PlayerSkills.cs:1204-1215 — base two-song limit plus passive slots",
        href: "/mechanics/bard#songs",
        linkText: "Song rules",
      },
      {
        text: "A new song replaces the oldest active song when all slots are full.",
        source:
          "Source: server-scripts/PlayerSkills.cs:940-974 — active songs refresh or displace the oldest",
      },
    ],
  },
};
