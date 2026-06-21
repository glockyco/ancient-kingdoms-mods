/**
 * Bakes skill-intrinsic effect summaries for the BetterBestiary mod.
 *
 * Reuses the EXACT same building blocks as the website `/skills` overview —
 * `query`, `SKILLS_LIST_QUERY`, `skillRowToEffectInput`, and `formatSkillEffect`
 * (with no monsterContext) — so the mod's bundled summaries always match what
 * the site renders. Output: `mods/BetterBestiary/Resources/skill-summaries.json`
 * as a stable, sorted `{ skill_id: summary }` map.
 *
 * Run: `pnpm --filter website gen:skill-summaries` (needs website/static/compendium.db).
 * The lefthook pre-commit drift guard re-runs this and fails on any diff.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "$lib/db.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillRowToEffectInput } from "$lib/skills/skillRowToEffectInput";
import { SKILLS_LIST_QUERY } from "$lib/skills/skillsListQuery";

const rows = query<Record<string, unknown>>(SKILLS_LIST_QUERY);

const summaries: Record<string, string> = {};
for (const row of rows) {
  const id = String(row.id);
  summaries[id] = formatSkillEffect(skillRowToEffectInput(row));
}

// Stable, sorted output so the drift guard diffs cleanly.
const sorted: Record<string, string> = {};
for (const key of Object.keys(summaries).sort()) {
  sorted[key] = summaries[key];
}

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  here,
  "../../mods/BetterBestiary/Resources/skill-summaries.json",
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(sorted, null, 2) + "\n", "utf8");

console.log(
  `Wrote ${Object.keys(sorted).length} skill summaries to ${outPath}`,
);
