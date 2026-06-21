/**
 * Bakes the BetterBestiary skill-effect parity corpus.
 *
 * Reuses the EXACT building blocks of the website `/skills` overview —
 * `SKILLS_LIST_QUERY`, `skillRowToEffectInput`, and `formatSkillEffect` (no
 * monsterContext) — to emit, per skill, the formatter `input` and its `expected`
 * output. The mod computes summaries at runtime via a C# port of
 * `formatSkillEffect`; this corpus is the golden oracle its parity test asserts
 * against, so the port can never silently diverge from the TypeScript source.
 *
 * `input` is compacted to only the fields that affect the output (see
 * `compactInput`) and each case is written on its own line, so the committed
 * file stays small and its diff reads as "one line per skill".
 *
 * Output: `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json`
 * (a stable, sorted `SkillEffectParityCase[]`).
 *
 * Run: `pnpm --filter website gen:skill-effect-parity` (needs website/static/compendium.db).
 * The lefthook pre-commit drift guard re-runs this and fails on any diff.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "$lib/db.server";
import { formatSkillEffect, type Skill } from "$lib/utils/formatSkillEffect";
import { skillRowToEffectInput } from "$lib/skills/skillRowToEffectInput";
import { SKILLS_LIST_QUERY } from "$lib/skills/skillsListQuery";
import type { SkillEffectParityCase } from "$lib/skills/skillEffectParity";

/**
 * Drop fields the formatter treats as "no value": null/undefined, `false` flags,
 * and zero LinearValue columns (a JSON string whose base and bonus are both 0,
 * which `parseLinearValue` collapses to null). Numbers (including 0) and strings
 * are kept verbatim because 0 is meaningful for some (e.g. `summon_count_per_cast`).
 * Omitting these never changes `formatSkillEffect`'s output but shrinks the corpus
 * from ~90 fields per skill to only the handful that matter.
 */
function compactInput(input: Skill): Partial<Skill> {
  const compact: Partial<Skill> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === false) continue;
    if (typeof value === "string" && value.startsWith("{")) {
      try {
        const linear = JSON.parse(value) as {
          base_value?: number;
          bonus_per_level?: number;
        };
        if (
          (linear.base_value ?? 0) === 0 &&
          (linear.bonus_per_level ?? 0) === 0
        )
          continue;
      } catch {
        // Not a LinearValue JSON string; keep it.
      }
    }
    (compact as Record<string, unknown>)[key] = value;
  }
  return compact;
}

const rows = query<Record<string, unknown>>(SKILLS_LIST_QUERY);

const cases: SkillEffectParityCase[] = rows.map((row) => {
  const input = skillRowToEffectInput(row);
  return {
    skill_id: String(row.id),
    input: compactInput(input),
    expected: formatSkillEffect(input),
  };
});

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
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, json, "utf8");

console.log(`Wrote ${cases.length} skill-effect parity cases to ${outPath}`);
