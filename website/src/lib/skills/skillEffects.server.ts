import { query } from "$lib/db.server";
import { formatSkillEffect, type Skill } from "$lib/utils/formatSkillEffect";
import {
  SKILL_DETAIL_COLUMNS,
  SKILL_DETAIL_JOINS,
  skillCastersFromRow,
  skillDetailFromRow,
} from "./skillDetail";
import { skillEffectInput } from "./skillEffectInput";

/** A skill to summarize, at the runtime level a caster uses when one is fixed. */
export interface SkillEffectRequest {
  id: string;
  runtimeLevel?: number;
}

/**
 * The effect summary inputs of the requested skills, in request order. The
 * skill page, the skills list and the class, pet and monster tables all
 * summarize from these inputs.
 */
export function skillEffectInputs(
  requests: readonly SkillEffectRequest[],
): Skill[] {
  if (requests.length === 0) return [];
  const ids = [...new Set(requests.map((request) => request.id))];
  const rows = new Map(
    query<Record<string, unknown>>(
      `SELECT ${SKILL_DETAIL_COLUMNS}
      FROM skills s
      ${SKILL_DETAIL_JOINS}
      WHERE s.id IN (${ids.map(() => "?").join(",")})`,
      ids,
    ).map((row) => [row.id as string, row]),
  );
  return requests.map(({ id, runtimeLevel }) => {
    const row = rows.get(id);
    if (!row) throw new Error(`Skill ${id} is not in the database`);
    return skillEffectInput(
      skillDetailFromRow(row),
      skillCastersFromRow(row),
      runtimeLevel,
    );
  });
}

/** The effect summaries of the given skills, in the given order. */
export function skillEffectSummaries(ids: readonly string[]): string[] {
  return skillEffectInputs(ids.map((id) => ({ id }))).map((input) =>
    formatSkillEffect(input),
  );
}
