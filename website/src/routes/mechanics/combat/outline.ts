import Crosshair from "@lucide/svelte/icons/crosshair";
import Flame from "@lucide/svelte/icons/flame";
import HeartPulse from "@lucide/svelte/icons/heart-pulse";
import Lock from "@lucide/svelte/icons/lock";
import Shapes from "@lucide/svelte/icons/shapes";
import Shield from "@lucide/svelte/icons/shield";
import Sparkles from "@lucide/svelte/icons/sparkles";
import Swords from "@lucide/svelte/icons/swords";
import Timer from "@lucide/svelte/icons/timer";
import type { ReferenceOutline } from "$lib/components/reference/outline";

/**
 * The combat page's chapters and topics, in page order. Headings and both
 * contents lists read their text from here, and every id is a URL fragment that
 * skill pages and other pages link to, so renaming an id means updating those
 * links (combat-anchors.test.ts finds them).
 */
export const COMBAT_OUTLINE = [
  {
    id: "targeting",
    title: "Targets and Casting",
    description: "Who your skills can reach and what a cast needs.",
    icon: Crosshair,
    topics: [
      { id: "targets", title: "Valid Targets" },
      { id: "casting", title: "Casting Requirements" },
      { id: "follow-up-attacks", title: "Follow-Up Auto Attacks" },
    ],
  },
  {
    id: "damage",
    title: "Damage",
    description: "How the game turns an attack into damage.",
    icon: Swords,
    topics: [
      { id: "damage-pipeline", title: "Damage Pipeline" },
      { id: "damage-formulas", title: "Starting Damage" },
      { id: "critical-hits", title: "Critical Hits" },
      { id: "combat-advantage", title: "Combat Advantage" },
      { id: "weapon-on-hit-effects", title: "Weapon On-Hit Effects" },
      { id: "ground-area-damage", title: "Ground Area Damage" },
    ],
  },
  {
    id: "defense",
    title: "Defense",
    description: "What avoids, reduces and absorbs incoming damage.",
    icon: Shield,
    topics: [
      { id: "resistance", title: "Defense by Damage Type" },
      { id: "avoidance", title: "Block, Miss and Resist" },
      { id: "mitigation", title: "Damage Reduction" },
      { id: "ward-and-mana-shield", title: "Ward and Mana Shield" },
      { id: "damage-shields", title: "Damage Shields" },
    ],
  },
  {
    id: "healing",
    title: "Healing",
    description: "How much a heal restores and when it is critical.",
    icon: HeartPulse,
    topics: [
      { id: "heal-bonus", title: "Wisdom Heal Bonus" },
      { id: "critical-heals", title: "Critical Heals" },
      { id: "lifetap", title: "Lifetap" },
    ],
  },
  {
    id: "buffs-and-debuffs",
    title: "Buffs and Debuffs",
    description:
      "How long effects last, how strong they are and how they are removed.",
    icon: Sparkles,
    topics: [
      { id: "duration-and-stacking", title: "Duration and Stacking" },
      { id: "buffs", title: "Buff Strength" },
      { id: "songs", title: "Song Strength" },
      { id: "debuff-landing", title: "Landing a Debuff" },
      { id: "debuffs", title: "Debuff Strength" },
      { id: "damage-over-time", title: "Damage over Time" },
      { id: "cleanse", title: "Cleanse" },
      { id: "dispel", title: "Dispel" },
    ],
  },
  {
    id: "crowd-control",
    title: "Crowd Control",
    description: "Stun, fear, knockback, root and sleep.",
    icon: Lock,
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
    title: "Attack and Cast Speed",
    description: "What Haste and Spell Casting Haste change.",
    icon: Timer,
    topics: [
      { id: "haste", title: "What Haste Affects" },
      { id: "attack-speed", title: "Auto-Attack Speed" },
      { id: "cast-speed", title: "Spell Casting Haste" },
    ],
  },
  {
    id: "threat",
    title: "Threat",
    description: "How much threat each hit adds.",
    icon: Flame,
    topics: [],
  },
  {
    id: "class-mechanics",
    title: "Class Mechanics",
    description: "Rules that belong to one class.",
    icon: Shapes,
    topics: [
      { id: "rage-generation", title: "Rage Generation" },
      { id: "wild-strike", title: "Wild Strike" },
      { id: "parry", title: "Parry" },
      { id: "assassination", title: "Assassination" },
      { id: "reaper-form", title: "Reaper Form" },
    ],
  },
] as const satisfies ReferenceOutline;
