import { formatNumber } from "$lib/utils/format";
import { STAT_FIELDS } from "$lib/generated/stat-vocabulary";
import { formatStat, formatStatField } from "$lib/stats";

const skillStatFields = new Map(
  STAT_FIELDS.filter((field) => field.source === "skill").map((field) => [
    field.field,
    field,
  ]),
);
import { query, queryOne } from "$lib/db.server";
import { error } from "@sveltejs/kit";
import { skillDescription } from "$lib/server/meta-description";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type {
  SkillDetailView,
  SkillItemSource,
  SkillMonster,
  SkillPet,
  SkillTrapUsage,
  SkillMechanicsSpec,
} from "$lib/types/skills";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillEffectInput } from "$lib/skills/skillEffectInput";
import {
  SKILL_DETAIL_COLUMNS,
  SKILL_DETAIL_JOINS,
  skillCastersFromRow,
  skillDetailFromRow,
} from "$lib/skills/skillDetail";
import { skillMechanicsSpec } from "$lib/utils/skillMechanics";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import { getSkillCategoryKey } from "$lib/utils/skill-category";
import { skillLearningAtRank } from "$lib/acquisition/conditions";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return query<{ id: string }>("SELECT id FROM skills").map((skill) => ({
    id: skill.id,
  }));
};

export interface SkillDetailPageData {
  skill: SkillDetailView;
  gameTooltip: string;
  effectSummary: string;
  grantedByItems: SkillItemSource[];
  scrollItems: {
    id: string;
    name: string;
    cooldown: number;
    cooldown_category: string;
  }[];
  skillCategories: string[];
  /** Other skills whose effects share this skill's overwrite group. */
  categorySkills: { id: string; name: string; mercenaryAreaBuff: boolean }[];
  familiarSkills: { id: string; name: string; max_level: number }[];
  usedByMonsters: SkillMonster[];
  usedByNpcs: { id: string; name: string }[];
  learningRanks: { rank: number; requiredLevel: number; pointCost: number }[];
  usedByPets: SkillPet[];
  appliedByTraps: SkillTrapUsage[];
  description: string;
  mechanicsSpec: SkillMechanicsSpec;
  visualAsset: EntityVisualAsset | null;
}

// Source: server-scripts/Utils.cs:423-451 — tooltip durations use days, hours, minutes and tenths of seconds.
function prettySeconds(seconds: number): string {
  const milliseconds = Math.trunc(seconds * 1000);
  const parts = [
    [Math.trunc(milliseconds / 86400000), "d"],
    [Math.trunc(milliseconds / 3600000) % 24, "h"],
    [Math.trunc(milliseconds / 60000) % 60, "m"],
  ]
    .filter(([value]) => Number(value) > 0)
    .map(([value, unit]) => `${value}${unit}`);
  const remainder = milliseconds % 60000;
  if (remainder > 0) {
    parts.push(
      `${Math.trunc(remainder / 1000)}${remainder % 1000 > 0 ? `.${Math.trunc((remainder % 1000) / 100)}` : ""}s`,
    );
  }
  return parts.join(" ") || "0s";
}

function roundTooltipInteger(value: number): number {
  const lower = Math.floor(value);
  return value - lower === 0.5
    ? lower % 2 === 0
      ? lower
      : lower + 1
    : Math.round(value);
}

const tooltipPercentFields: Readonly<Record<string, true>> = {
  damage_percent: true,
  lifetap_percent: true,
  knockback_chance: true,
  stun_chance: true,
  fear_chance: true,
  health_cost_percent: true,
  mana_restored_percent: true,
  healing_percent: true,
  charmed_damage_percent: true,
  lifetap_healing_percent_bonus: true,
  damage_over_time_execute_bonus: true,
};
const tooltipTokenDependencies: Readonly<Record<string, string>> = {
  MANACOSTS: "MANACOST",
  ENERGYCOSTS: "ENERGYCOST",
  FEARRESISTBONUS: "FEARRESISTCHANCEBONUS",
  COOLDOWNREDUCTION: "COOLDOWNREDUCTIONPERCENT",
  LIFETAPHEALINGBONUS: "LIFETAPHEALINGPERCENTBONUS",
  DOTEXECUTEBONUS: "DAMAGEOVERTIMEEXECUTEBONUS",
  CADENCEDAMAGE: "DAMAGE",
  CADENCEHEAL: "HEALSHEALTH",
};

// Source: server-scripts/ScriptableSkill.cs:410-425 — name, level, costs, range, cast time and cooldown use the selected skill level.
// Source: server-scripts/DamageSkill.cs:69-91 — damage and aggro use base values plus player-specific bonuses, while crowd control uses the skill level.
// Source: server-scripts/BonusSkill.cs:85-116 — bonus tokens use signed attributes and absolute stat magnitudes.
// Source: server-scripts/BuffSkill.cs:252-286 — Charisma-scaled buff tooltips include player-specific bonuses.
// Source: server-scripts/PassiveSkill.cs:65-90 — passive percentage tokens use percentage points.
// Source: server-scripts/NecromancerBloodPactSkill.cs:64-66 — health and mana percentages take their percent sign from the template.
// Source: server-scripts/NecromancerDeathBloomSkill.cs:61-82 — health and healing percentage tokens supply their own percent sign.
export function _fillSkillTooltip(skill: SkillDetailView): string {
  const template = skill.tooltip_template ?? "";
  if (!template) return "";
  // Only format the values this template displays, including native token aliases.
  const tokens = new Set<string>();
  for (const match of template.matchAll(/\{([A-Z0-9_]+)\}/g))
    tokens.add(match[1]);
  for (const token of tokens) {
    const dependency = tooltipTokenDependencies[token];
    if (dependency) tokens.add(dependency);
  }
  const values: Record<string, string> = {
    NAME: skill.name,
    LEVEL: "1",
    PETLEVEL: "1",
  };
  for (const [field, value] of Object.entries(skill)) {
    if (value && typeof value === "object" && "base_value" in value) {
      const token = field.replaceAll("_", "").toUpperCase();
      if (!tokens.has(token)) continue;
      let number = value.base_value as number;
      if (tooltipPercentFields[field]) number *= 100;
      if (
        [
          "damage_percent",
          "lifetap_percent",
          "knockback_chance",
          "stun_chance",
          "fear_chance",
        ].includes(field)
      ) {
        number = roundTooltipInteger(number);
      }
      if (field === "aggro") number = Math.abs(number);
      if (
        field.endsWith("_bonus") &&
        ![
          "strength_bonus",
          "dexterity_bonus",
          "charisma_bonus",
          "constitution_bonus",
          "intelligence_bonus",
          "wisdom_bonus",
        ].includes(field)
      ) {
        number = Math.abs(number);
      }
      const mapped = skillStatFields.get(field);
      values[token] = mapped
        ? formatStatField(mapped, number).replace("%", "")
        : formatNumber(number, {
            decimals: 2,
            grouping: false,
          });
    }
  }
  Object.assign(values, {
    MANACOSTS: values.MANACOST,
    ENERGYCOSTS: values.ENERGYCOST,
    COOLDOWN: prettySeconds(skill.cooldown?.base_value ?? 0),
    BUFFTIME: prettySeconds(skill.duration_base),
    FEARRESISTBONUS: values.FEARRESISTCHANCEBONUS,
    FEARRESISTBONUSCAP: formatStat(
      "fear_resist",
      skill.fear_resist_chance_bonus_cap,
    ).replace("%", ""),
    COOLDOWNREDUCTION: values.COOLDOWNREDUCTIONPERCENT,
    LIFETAPHEALINGBONUS: values.LIFETAPHEALINGPERCENTBONUS,
    DOTEXECUTEBONUS: values.DAMAGEOVERTIMEEXECUTEBONUS,
    BARDSONGDURATIONBONUS: formatNumber(
      skill.bard_song_duration_bonus_per_level * 100,
      { decimals: 2, grouping: false },
    ),
    FOODANDDRINKBUFFDURATIONBONUS: formatNumber(
      skill.food_and_drink_buff_duration_bonus_per_level * 100,
      { decimals: 2, grouping: false },
    ),
    CADENCEDAMAGE: values.DAMAGE,
    CADENCEHEAL: values.HEALSHEALTH,
  });
  // Source: server-scripts/ChanneledTargetDamageSkill.cs:24-47 — channel damage includes the damage multiplier before player bonuses.
  if (skill.damage) {
    const multiplier = skill.damage_percent?.base_value ?? 0;
    values.CHANNELDAMAGE = formatNumber(
      roundTooltipInteger(
        skill.damage.base_value * (multiplier > 0 ? multiplier : 1),
      ),
      { decimals: 2, grouping: false },
    );
  }
  // Base attacks depend on the equipped weapon, so their damage line cannot be resolved here.
  if (skill.base_skill) delete values.DAMAGE;
  const castTime = skill.cast_time?.base_value ?? 0;
  const castText =
    castTime <= 0.001 ? "Instant cast" : `${prettySeconds(castTime)} cast`;
  let text = template
    .replaceAll("{CASTTIME} cast", castText)
    .replaceAll("{CASTTIME}", castText);
  // Source: server-scripts/ScriptableSkill.cs:359-367 — resource-cost tooltips pad the range token.
  if (/\{(?:MANACOSTS|ENERGYCOSTS)\}/.test(text)) {
    text = text.replace(/(\S)(\{CASTRANGE\})/g, "$1 $2");
  }
  // Death Bloom supplies its own percent sign. Other percent tokens take it from the template.
  if (skill.is_necromancer_death_bloom) {
    values.HEALTHCOSTPERCENT += "%";
    values.HEALINGPERCENT += "%";
  }
  text = text.replace(
    /\{([A-Z0-9_]+)\}/g,
    (token, name: string) => values[name] ?? token,
  );
  return text
    .split("\n")
    .filter((line) => !/\{[^{}]+\}/.test(line))
    .join("\n");
}

export const load: PageServerLoad = async ({
  params,
}): Promise<SkillDetailPageData> => {
  const skillRaw = queryOne<Record<string, unknown>>(
    `SELECT ${SKILL_DETAIL_COLUMNS}
    FROM skills s
    ${SKILL_DETAIL_JOINS}
    WHERE s.id = ?`,
    [params.id],
  );

  if (!skillRaw) {
    throw error(404, `Skill not found: ${params.id}`);
  }

  const visualAsset = queryOne<EntityVisualAsset>(
    `SELECT public_path, width, height, source_field, source_type
     FROM visual_assets
     WHERE domain = 'skill' AND entity_id = ? AND kind = 'icon'`,
    [params.id],
  );

  const casters = skillCastersFromRow(skillRaw);
  const detail = skillDetailFromRow(skillRaw);
  const playerClasses = detail.player_classes;

  // Parse granted_by_items and fetch item names
  const grantedByItemsRaw: Array<{
    item_id: string;
    type: string;
    probability?: number;
  }> = skillRaw.granted_by_items
    ? JSON.parse(skillRaw.granted_by_items as string)
    : [];

  let grantedByItems: SkillItemSource[] = [];
  if (grantedByItemsRaw.length > 0) {
    const itemIds = grantedByItemsRaw.map((i) => i.item_id);
    const placeholders = itemIds.map(() => "?").join(",");
    const nameMap = new Map(
      query<{ id: string; name: string }>(
        `SELECT id, name FROM items WHERE id IN (${placeholders})`,
        itemIds,
      ).map((i) => [i.id, i.name]),
    );
    grantedByItems = grantedByItemsRaw.map((item) => ({
      item_id: item.item_id,
      item_name: nameMap.get(item.item_id) || item.item_id,
      type: item.type,
      probability: item.probability,
    }));
  }
  // Source: server-scripts/UsableItem.cs:Use — scroll casts use the granting item's cooldown and category, not the skill cooldown.
  const scrollItemIds = grantedByItems
    .filter((item) => item.type === "scroll")
    .map((item) => item.item_id);
  const scrollItems =
    scrollItemIds.length === 0
      ? []
      : query<SkillDetailPageData["scrollItems"][number]>(
          `SELECT id, name, cooldown, cooldown_category FROM items WHERE id IN (${scrollItemIds.map(() => "?").join(",")}) ORDER BY name`,
          scrollItemIds,
        );
  const categoryPositions = playerClasses.length
    ? query<{
        class_id: string;
        class_skill_position: number;
        last_tier_position: number | null;
      }>(
        `SELECT membership.value AS class_id,
          json_extract(?, '$.' || membership.value) AS class_skill_position,
          MAX(CASE WHEN s.tier > 0 AND NOT s.is_veteran
            THEN coalesce(json_extract(s.class_skill_positions, '$.' || membership.value), 0)
          END) AS last_tier_position
        FROM skills s JOIN json_each(s.player_classes) membership
        WHERE membership.value IN (${playerClasses.map(() => "?").join(",")})
        GROUP BY membership.value`,
        [skillRaw.class_skill_positions as string, ...playerClasses],
      )
    : [];
  const positionsByClass = new Map(
    categoryPositions.map((position) => [position.class_id, position]),
  );
  const skillCategories = [
    ...new Set(
      playerClasses.map((classId) => {
        const position = positionsByClass.get(classId);
        if (!position)
          throw new Error(
            `Missing skill category position for ${params.id} in ${classId}`,
          );
        return getSkillCategoryKey(
          {
            base_skill: detail.base_skill,
            is_veteran: detail.is_veteran,
            tier: detail.tier,
            class_skill_position: position.class_skill_position,
          },
          position.last_tier_position ?? -Infinity,
        );
      }),
    ),
  ];
  // Source: server-scripts/SummonSkill.cs:Apply; server-scripts/PetSkills.cs:RefreshSkillLevels — summon rank sets familiar level and each skill rank, capped by that skill's maximum.
  const familiarSkills = skillRaw.is_familiar
    ? query<SkillDetailPageData["familiarSkills"][number]>(
        `SELECT s.id, s.name, s.max_level FROM skills s
     JOIN pet_skills ps ON ps.skill_id = s.id
     WHERE ps.pet_id = ? ORDER BY s.name`,
        [skillRaw.pet_id as string],
      )
    : [];

  const skill: SkillDetailView = {
    ...detail,
    // Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — a dispel tests each TargetBuffSkill or AreaBuffSkill buff on a monster against its probIgnoreCleanse.
    ...(skillRaw.is_dispel
      ? {
          monster_buffs_with_cleanse_resist: query<{
            id: string;
            name: string;
            prob_ignore_cleanse: number;
          }>(
            `SELECT DISTINCT s.id, s.name, s.prob_ignore_cleanse
             FROM skills s JOIN monster_skills ms ON ms.skill_id = s.id
             WHERE s.skill_type IN ('target_buff', 'area_buff')
               AND s.is_cleanse = 0 AND s.prob_ignore_cleanse > 0
             ORDER BY s.prob_ignore_cleanse DESC, s.name`,
          ),
        }
      : {}),
  };

  // Get monsters that use this skill
  const usedByMonsters = query<SkillMonster>(
    `SELECT
      m.id, m.name, m.level_min, m.level_max,
      m.is_boss, m.is_elite, m.is_fabled
    FROM monster_skills ms
    JOIN monsters m ON m.id = ms.monster_id
    WHERE ms.skill_id = ?
    ORDER BY m.is_boss DESC, m.is_elite DESC, m.level_min DESC, m.name`,
    [params.id],
  );
  const usedByNpcs = query<{ id: string; name: string }>(
    `SELECT DISTINCT n.id, n.name FROM npc_skills ns
     JOIN npcs n ON n.id = ns.npc_id
     WHERE ns.skill_id = ? ORDER BY n.name, n.id`,
    [params.id],
  );
  const learningCurve = (field: "level_requirement" | "skill_point_cost") => {
    const raw = skillRaw[field];
    if (typeof raw !== "string")
      throw new Error(`Missing ${field} for ${skill.id}`);
    const value = JSON.parse(raw) as {
      base_value: number;
      bonus_per_level: number;
    };
    if (
      !Number.isFinite(value.base_value) ||
      !Number.isFinite(value.bonus_per_level)
    ) {
      throw new Error(`Invalid ${field} for ${skill.id}`);
    }
    return value;
  };
  const learningDefinition = {
    maxRank: skill.max_level,
    levelRequirement: learningCurve("level_requirement"),
    skillPointCost: learningCurve("skill_point_cost"),
  };
  const firstLearningRank = skill.learn_default ? 2 : 1;
  const learningRanks = playerClasses.length
    ? Array.from(
        { length: Math.max(0, skill.max_level - firstLearningRank + 1) },
        (_, index) => {
          const rank = firstLearningRank + index;
          return { rank, ...skillLearningAtRank(learningDefinition, rank) };
        },
      )
    : [];
  if (learningRanks.length > 0) {
    skill.level_required = learningRanks[0].requiredLevel;
    skill.required_skill_points = learningRanks[0].pointCost;
  }

  // Get pets/mercenaries that use this skill. A familiar takes its rank from the skill that
  // summons it.
  const usedByPets = query<SkillPet>(
    `SELECT DISTINCT p.id, p.name, p.is_mercenary, p.is_familiar, p.type_monster, ps.skill_index,
      summon.id AS summon_skill_id, summon.name AS summon_skill_name
    FROM pet_skills ps
    JOIN pets p ON p.id = ps.pet_id
    LEFT JOIN skills summon ON p.is_familiar = 1 AND summon.pet_id = p.id
    WHERE ps.skill_id = ?
    ORDER BY p.name`,
    [params.id],
  );

  const appliedByTraps = query<SkillTrapUsage>(
    `SELECT
      t.type,
      z.id as zone_id,
      z.name as zone_name,
      COUNT(*) as trap_count
    FROM traps t
    JOIN zones z ON z.id = t.zone_id
    WHERE t.effect_skill_id = ?
    GROUP BY t.type, z.id, z.name
    ORDER BY z.name, t.type`,
    [params.id],
  );

  const effectSummary = formatSkillEffect(skillEffectInput(skill, casters));

  // Mercenaries are pets with is_mercenary=1; familiars/companions are the
  // rest. We split because mercenary ownership is most actionable for the
  // player (hire from a Recruiter NPC) and gets routing priority over the
  // pet-summon path.
  const mercenaryUserCount = usedByPets.filter((p) => p.is_mercenary).length;
  const petUserCount = usedByPets.length - mercenaryUserCount;

  // Counts of items that grant or trigger this skill, grouped by source type.
  // The denormalizer assigns one type per item linkage; we just bucket the
  // pre-resolved entries.
  const grantedByCounts = {
    scroll: 0,
    potion_buff: 0,
    food_buff: 0,
    relic_buff: 0,
    weapon_proc: 0,
  };
  for (const g of grantedByItems) {
    if (g.type in grantedByCounts) {
      grantedByCounts[g.type as keyof typeof grantedByCounts] += 1;
    }
  }

  const description = skillDescription({
    name: skill.name,
    skill_type: skill.skill_type,
    tier: skill.tier,
    max_level: skill.max_level,
    level_required: skill.level_required,
    required_skill_points: skill.required_skill_points,
    required_spent_points: skill.required_spent_points,
    player_classes: skill.player_classes,
    is_veteran: skill.is_veteran,
    base_skill: skill.base_skill,
    prerequisite_skill_name: skill.prerequisite_skill_name,
    prerequisite_level: skill.prerequisite_level,
    prerequisite2_skill_name: skill.prerequisite2_skill_name,
    prerequisite2_level: skill.prerequisite2_level,
    mercenary_names: usedByPets
      .filter((pet) => pet.is_mercenary)
      .map((pet) => pet.name),
    pet_names: usedByPets
      .filter((pet) => !pet.is_mercenary)
      .map((pet) => pet.name),
    monster_names: usedByMonsters.map((monster) => monster.name),
    npc_names: usedByNpcs.map((npc) => npc.name),
    npc_count: usedByNpcs.length,
    granting_item_names: grantedByItems.map((item) => item.item_name),
    effect_summary: effectSummary,
    monster_count: usedByMonsters.length,
    mercenary_user_count: mercenaryUserCount,
    pet_user_count: petUserCount,
    granted_by: grantedByCounts,
    is_necromancer_blood_pact: skill.is_necromancer_blood_pact,
    is_necromancer_death_bloom: skill.is_necromancer_death_bloom,
    is_necromancer_reaper_form: skill.is_necromancer_reaper_form,
    is_necromancer_pet_buff: skill.is_necromancer_pet_buff,
    channel_pulses: skill.channel_pulses,
    is_familiar: skill.is_familiar,
  });

  return {
    skill,
    // Source: server-scripts/Skills.cs:AddOrRefreshBuff — applying a categorized buff expires existing buffs of the same category.
    // Source: server-scripts/AreaBuffSkill.cs:Apply — a pet-cast area buff skips a target that already has a different buff of its category.
    categorySkills: skill.buff_category
      ? query<{ id: string; name: string; mercenary_area_buff: number }>(
          `SELECT s.id, s.name,
             (s.skill_type = 'area_buff' AND EXISTS (
               SELECT 1 FROM pet_skills ps JOIN pets p ON p.id = ps.pet_id
               WHERE ps.skill_id = s.id AND p.is_mercenary = 1
             )) AS mercenary_area_buff
           FROM skills s
           WHERE s.buff_category = ? AND s.id != ?
           ORDER BY s.name`,
          [skill.buff_category, skill.id],
        ).map(({ id, name, mercenary_area_buff }) => ({
          id,
          name,
          mercenaryAreaBuff: mercenary_area_buff === 1,
        }))
      : [],
    gameTooltip: _fillSkillTooltip(skill),
    effectSummary,
    grantedByItems,
    scrollItems,
    skillCategories,
    familiarSkills,
    usedByMonsters,
    usedByNpcs,
    learningRanks,
    usedByPets,
    appliedByTraps,
    description,
    visualAsset,
    mechanicsSpec: skillMechanicsSpec(skill, casters),
  };
};
