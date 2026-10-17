import { statName } from "$lib/stats";
import type { ReferenceChapterText } from "$lib/components/reference/outline";

/**
 * The combat page's chapters and topics, in page order. Headings, both
 * contents lists and site search read their text from here, and every id is a
 * URL fragment that skill pages and other pages link to, so renaming an id
 * means updating those links (combat-anchors.test.ts finds them). The page
 * adds each chapter's icon in its own outline.
 */
export const COMBAT_CHAPTERS = [
  {
    id: "targeting",
    title: "Targets and casting",
    description: "Who your skills can reach and what a cast needs.",
    topics: [
      { id: "targets", title: "Valid targets" },
      { id: "casting", title: "Casting requirements" },
      { id: "follow-up-attacks", title: "Follow-up auto attacks" },
    ],
  },
  {
    id: "damage",
    title: "Damage",
    description: "How the game turns an attack into damage.",
    topics: [
      { id: "damage-pipeline", title: "Damage steps" },
      { id: "damage-formulas", title: "Starting damage" },
      { id: "critical-hits", title: "Critical hits" },
      { id: "combat-advantage", title: "Combat Advantage" },
      { id: "weapon-on-hit-effects", title: "Weapon on-hit effects" },
      { id: "ground-area-damage", title: "Ground area damage" },
    ],
  },
  {
    id: "defense",
    title: "Defense",
    description: "What avoids, reduces and absorbs incoming damage.",
    topics: [
      { id: "resistance", title: "Defense by damage type" },
      { id: "avoidance", title: "Block, miss and resist" },
      { id: "mitigation", title: "Damage reduction" },
      { id: "ward-and-mana-shield", title: "Ward and Mana Shield" },
      { id: "damage-shields", title: "Damage shields" },
    ],
  },
  {
    id: "healing",
    title: "Healing",
    description: "How much a heal restores and when it is critical.",
    topics: [
      { id: "heal-bonus", title: "Wisdom heal bonus" },
      { id: "critical-heals", title: "Critical heals" },
      { id: "lifetap", title: "Lifetap" },
    ],
  },
  {
    id: "buffs-and-debuffs",
    title: "Buffs and debuffs",
    description:
      "How long effects last, how strong they are and how they are removed.",
    topics: [
      { id: "duration-and-stacking", title: "Duration and stacking" },
      { id: "buffs", title: "Buff strength" },
      { id: "songs", title: "Song strength" },
      { id: "debuff-landing", title: "Landing a debuff" },
      { id: "debuffs", title: "Debuff strength" },
      { id: "damage-over-time", title: "Damage over time" },
      { id: "cleanse", title: "Cleanse" },
      { id: "dispel", title: "Dispel" },
    ],
  },
  {
    id: "crowd-control",
    title: "Crowd control",
    description: "Stun, fear, knockback, root and sleep.",
    topics: [
      { id: "stun", title: "Stun" },
      { id: "fear", title: "Fear" },
      { id: "knockback", title: "Knockback" },
      { id: "root", title: "Root" },
      { id: "sleep", title: "Sleep" },
    ],
  },
  {
    id: "timing",
    title: "Attack and cast speed",
    description: "What Haste and Spell Casting Haste change.",
    topics: [
      { id: "haste", title: "What Haste affects" },
      { id: "attack-speed", title: "Auto-attack speed" },
      { id: "cast-speed", title: statName("spell_haste") },
    ],
  },
  {
    id: "threat",
    title: "Threat",
    description: "How much threat each hit adds.",
    topics: [],
  },
  {
    id: "class-mechanics",
    title: "Class mechanics",
    description: "Rules that belong to one class.",
    topics: [
      { id: "rage-generation", title: "Rage generation" },
      { id: "wild-strike", title: "Wild Strike" },
      { id: "parry", title: "Parry" },
      { id: "assassination", title: "Assassination" },
      { id: "reaper-form", title: "Reaper Form" },
    ],
  },
] as const satisfies readonly ReferenceChapterText[];

export type CombatChapterId = (typeof COMBAT_CHAPTERS)[number]["id"];
