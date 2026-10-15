/**
 * Bakes the BetterBestiary skill-effect parity corpus.
 *
 * Reuses the building blocks of the website `/skills` overview,
 * `SKILLS_LIST_QUERY`, `skillEffectInputs` and `formatSkillEffect` without a
 * monster context, to emit, per skill, the formatter `input` and its
 * `expected` output. The mod computes summaries at runtime via a C# port of
 * `formatSkillEffect`, and this corpus is the golden oracle its parity test
 * asserts against, so the port cannot silently diverge from the TypeScript
 * source.
 *
 * `input` is compacted to only the fields that affect the output (see
 * `compactInput`) and each case is written on its own line, so the committed
 * file stays small and its diff reads as one line per skill.
 *
 * Output: `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json`
 * (a stable, sorted `SkillEffectParityCase[]`).
 *
 * Run: `pnpm --filter website gen:skill-effect-parity` (needs website/data/compendium.db).
 * The lefthook pre-commit drift guard re-runs this and fails on any diff.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "$lib/db.server";
import { formatSkillEffect, type Skill } from "$lib/utils/formatSkillEffect";
import { skillEffectInputs } from "$lib/skills/skillEffects.server";
import { SKILLS_LIST_QUERY } from "$lib/skills/skillsListQuery";
import type { SkillEffectParityCase } from "$lib/skills/skillEffectParity";

/** Numeric fields whose 0 the formatter reads differently from an absent value. */
const MEANINGFUL_ZEROS = new Set<string>([
  "summon_count_per_cast",
  "summoned_monster_level",
  "max_active_summons",
]);

/**
 * Drop fields the formatter treats as "no value": null/undefined, `false`
 * flags, empty strings, zeros it reads as absent, empty term lists and empty
 * note maps. Omitting these never changes `formatSkillEffect`'s output but
 * shrinks the corpus to the handful of fields that matter.
 */
function compactInput(input: Skill): Partial<Skill> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) =>
        value !== null &&
        value !== undefined &&
        value !== false &&
        value !== "" &&
        !(value === 0 && !MEANINGFUL_ZEROS.has(key)) &&
        !(Array.isArray(value) && value.length === 0) &&
        !(
          typeof value === "object" &&
          !Array.isArray(value) &&
          Object.keys(value).length === 0
        ),
    ),
  );
}

const ids = query<{ id: string }>(SKILLS_LIST_QUERY).map((row) => row.id);
const inputs = skillEffectInputs(ids.map((id) => ({ id })));

const cases: SkillEffectParityCase[] = ids.map((id, index) => ({
  skill_id: id,
  input: compactInput(inputs[index]),
  expected: formatSkillEffect(inputs[index]),
}));

// Stable, sorted output so the drift guard diffs cleanly.
cases.sort((a, b) =>
  a.skill_id < b.skill_id ? -1 : a.skill_id > b.skill_id ? 1 : 0,
);

// One case per line: a valid JSON array whose diff reads as one line per skill.
const json = `[\n${cases.map((c) => "  " + JSON.stringify(c)).join(",\n")}\n]\n`;

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  here,
  "../../tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json",
);
if (process.argv.includes("--check")) {
  if (readFileSync(outPath, "utf8") !== json) {
    throw new Error("Skill-effect parity corpus is stale; regenerate it.");
  }
  console.log(`Checked ${cases.length} skill-effect parity cases`);
} else {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json, "utf8");
  console.log(`Wrote ${cases.length} skill-effect parity cases to ${outPath}`);
}
