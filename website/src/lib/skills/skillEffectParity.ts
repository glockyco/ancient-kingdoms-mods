import type { MonsterContext, Skill } from "$lib/utils/formatSkillEffect";

/**
 * One golden parity case for Pocket Compendium's C# `formatSkillEffect` port.
 *
 * Produced by `scripts/gen-skill-effect-parity.ts` from the live compendium and
 * consumed by the C# parity test (`tests/PocketCompendium.Tests`). Monster cases
 * resolve the skill at its runtime rank with that monster's combat stats.
 *
 * `input` is the formatter input compacted to only the fields that affect the
 * output: null and undefined values, `false` flags, empty term lists and empty
 * note maps are dropped, since the formatter treats all of those as "no value".
 * The C# input fills the dropped fields with the same defaults.
 */
export interface SkillEffectParityCase {
  skill_id: string;
  monster_id?: string;
  monster_level?: number;
  runtime_level?: number;
  monster?: MonsterContext;
  delivery?: {
    skill_index: number;
    cast_time: number;
    cooldown: number;
    cast_range: number;
    is_aura: boolean;
    area_object_delay_damage: number;
  };
  input: Partial<Skill>;
  expected: string;
}
