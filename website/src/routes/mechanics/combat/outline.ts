import type { Component } from "svelte";
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
import {
  COMBAT_CHAPTERS,
  type CombatChapterId,
} from "$lib/data/combat-outline";

const ICONS: Record<CombatChapterId, Component> = {
  targeting: Crosshair,
  damage: Swords,
  defense: Shield,
  healing: HeartPulse,
  "buffs-and-debuffs": Sparkles,
  "crowd-control": Lock,
  timing: Timer,
  threat: Flame,
  "class-mechanics": Shapes,
};

/** The combat page's outline: its chapters with their icons. */
export const COMBAT_OUTLINE: ReferenceOutline = COMBAT_CHAPTERS.map(
  (chapter) => ({ ...chapter, icon: ICONS[chapter.id] }),
);
