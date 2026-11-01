/**
 * Bakes Pocket Compendium's skill-effect parity corpus.
 *
 * Reuses the website's skill inputs and formatter for formula cases and one
 * resolved case per monster skill. Monster cases carry the caster's exported
 * combat stats and delivery data for the pure Bestiary model tests.
 *
 * `input` is compacted to only the fields that affect the output (see
 * `compactInput`) and each case is written on its own line, so the committed
 * file stays small and its diff reads as one line per skill.
 *
 * Output: `tests/PocketCompendium.Tests/Fixtures/skill-effect-parity.json`
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

interface MonsterSkillRow {
  monster_id: string;
  monster_level: number;
  damage: number;
  magic_damage: number;
  skill_id: string;
  skill_index: number;
  runtime_level: number;
  cast_time: string;
  cooldown: string;
  cast_range: string;
  is_aura: number;
  area_object_delay_damage: number;
}

function atRank(json: string, rank: number): number {
  const curve = JSON.parse(json) as {
    base_value: number;
    bonus_per_level: number;
  };
  return curve.base_value + curve.bonus_per_level * (rank - 1);
}

const monsterSkills = query<MonsterSkillRow>(`SELECT
  ms.monster_id, m.level AS monster_level, m.damage, m.magic_damage,
  ms.skill_id, ms.skill_index, ms.runtime_level,
  s.cast_time, s.cooldown, s.cast_range, s.is_aura, s.area_object_delay_damage
  FROM monster_skills ms
  JOIN monsters m ON m.id = ms.monster_id
  JOIN skills s ON s.id = ms.skill_id`);
const monsterInputs = skillEffectInputs(
  monsterSkills.map((row) => ({
    id: row.skill_id,
    runtimeLevel: row.runtime_level,
  })),
);
for (const [index, row] of monsterSkills.entries()) {
  const input = monsterInputs[index];
  const monster = { damage: row.damage, magicDamage: row.magic_damage };
  cases.push({
    skill_id: row.skill_id,
    monster_id: row.monster_id,
    monster_level: row.monster_level,
    runtime_level: row.runtime_level,
    monster,
    delivery: {
      skill_index: row.skill_index,
      cast_time: atRank(row.cast_time, row.runtime_level),
      cooldown: atRank(row.cooldown, row.runtime_level),
      cast_range: atRank(row.cast_range, row.runtime_level),
      is_aura: row.is_aura !== 0,
      area_object_delay_damage: row.area_object_delay_damage,
    },
    input: compactInput(input),
    expected: formatSkillEffect(input, { monster }),
  });
}

// Stable, sorted output so the drift guard diffs cleanly.
cases.sort((a, b) => {
  const key = (c: SkillEffectParityCase) =>
    `${c.skill_id}\\0${c.monster_id ?? ""}\\0${c.delivery?.skill_index ?? -1}`;
  return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
});

// One case per line: a valid JSON array whose diff reads as one line per skill.
const json = `[\n${cases.map((c) => "  " + JSON.stringify(c)).join(",\n")}\n]\n`;

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  here,
  "../../tests/PocketCompendium.Tests/Fixtures/skill-effect-parity.json",
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
