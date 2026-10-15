import type { Skill } from "$lib/utils/formatSkillEffect";

/**
 * One golden parity case for the BetterBestiary C# `formatSkillEffect` port.
 *
 * Produced by `scripts/gen-skill-effect-parity.ts` from the live compendium and
 * consumed by the C# parity test (`tests/BetterBestiary.Tests`). `expected` is
 * `formatSkillEffect`'s output without a monster context.
 *
 * `input` is the formatter input compacted to only the fields that affect the
 * output: null and undefined values, `false` flags, empty term lists and empty
 * note maps are dropped, since the formatter treats all of those as "no value".
 * The C# input fills the dropped fields with the same defaults.
 */
export interface SkillEffectParityCase {
  skill_id: string;
  input: Partial<Skill>;
  expected: string;
}
