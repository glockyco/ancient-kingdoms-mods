import type { Skill } from "$lib/utils/formatSkillEffect";

/**
 * One golden parity case for the BetterBestiary C# `formatSkillEffect` port.
 *
 * Produced by `scripts/gen-skill-effect-parity.ts` from the live compendium and
 * consumed by the C# parity test (`tests/BetterBestiary.Tests`). `expected` is
 * `formatSkillEffect`'s no-context (skill-intrinsic) output for the skill.
 *
 * `input` is the formatter input **compacted to only the fields that affect the
 * output** — null/undefined values, `false` flags and zero LinearValue columns
 * are dropped, since the formatter treats all of those as "no value". This keeps
 * the committed corpus small and its diff auditable (one line per skill) without
 * changing any `expected`. The C# DTO fills the dropped fields with the same
 * defaults, so the port still reproduces `expected` for every case.
 */
export interface SkillEffectParityCase {
  skill_id: string;
  input: Partial<Skill>;
  expected: string;
}
