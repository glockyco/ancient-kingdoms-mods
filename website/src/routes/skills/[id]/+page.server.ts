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
  familiarSkills: { id: string; name: string; max_level: number }[];
  usedByMonsters: SkillMonster[];
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

// Source: server-scripts/ScriptableSkill.cs:387-402 — name, level, costs, range, cast time and cooldown use the selected skill level.
// Source: server-scripts/DamageSkill.cs:69-98 — damage and aggro use base values plus player-specific bonuses, while crowd control uses the skill level.
// Source: server-scripts/BonusSkill.cs:85-116 — bonus tokens use signed attributes and absolute stat magnitudes.
// Source: server-scripts/BuffSkill.cs:249-283 — Charisma-scaled buff tooltips include player-specific bonuses.
// Source: server-scripts/PassiveSkill.cs:65-90 — passive percentage tokens use percentage points.
// Source: server-scripts/NecromancerBloodPactSkill.cs:64-66 — health and mana percentages take their percent sign from the template.
// Source: server-scripts/NecromancerDeathBloomSkill.cs:61-82 — health and healing percentage tokens supply their own percent sign.
export function _fillSkillTooltip(skill: SkillDetailView): string {
  const format = (value: number) => String(Number(value.toFixed(2)));
  const percentFields = new Set([
    "damage_percent",
    "lifetap_percent",
    "knockback_chance",
    "stun_chance",
    "fear_chance",
    "health_cost_percent",
    "mana_restored_percent",
    "healing_percent",
    "charmed_damage_percent",
    "health_max_percent_bonus",
    "mana_max_percent_bonus",
    "damage_percent_bonus",
    "magic_damage_percent_bonus",
    "haste_bonus",
    "spell_haste_bonus",
    "critical_chance_bonus",
    "critical_resist_bonus",
    "accuracy_bonus",
    "block_chance_bonus",
    "fear_resist_chance_bonus",
    "health_percent_per_second_bonus",
    "mana_percent_per_second_bonus",
    "energy_percent_per_second_bonus",
    "cooldown_reduction_percent",
    "heal_on_hit_percent",
    "lifetap_healing_percent_bonus",
    "damage_over_time_execute_bonus",
  ]);
  const values: Record<string, string> = {
    NAME: skill.name,
    LEVEL: "1",
    PETLEVEL: "1",
  };
  for (const [field, value] of Object.entries(skill)) {
    if (value && typeof value === "object" && "base_value" in value) {
      let number = value.base_value as number;
      if (percentFields.has(field)) number *= 100;
      if (
        [
          "damage_percent",
          "lifetap_percent",
          "knockback_chance",
          "stun_chance",
          "fear_chance",
        ].includes(field) ||
        (skill.skill_type === "passive" &&
          ["damage_percent_bonus", "magic_damage_percent_bonus"].includes(
            field,
          ))
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
      values[field.replaceAll("_", "").toUpperCase()] = format(number);
    }
  }
  Object.assign(values, {
    MANACOSTS: values.MANACOST,
    ENERGYCOSTS: values.ENERGYCOST,
    COOLDOWN: prettySeconds(skill.cooldown?.base_value ?? 0),
    BUFFTIME: prettySeconds(skill.duration_base),
    FEARRESISTBONUS: values.FEARRESISTCHANCEBONUS,
    FEARRESISTBONUSCAP: format(skill.fear_resist_chance_bonus_cap * 100),
    COOLDOWNREDUCTION: values.COOLDOWNREDUCTIONPERCENT,
    LIFETAPHEALINGBONUS: values.LIFETAPHEALINGPERCENTBONUS,
    DOTEXECUTEBONUS: values.DAMAGEOVERTIMEEXECUTEBONUS,
    BARDSONGDURATIONBONUS: format(
      skill.bard_song_duration_bonus_per_level * 100,
    ),
    FOODANDDRINKBUFFDURATIONBONUS: format(
      skill.food_and_drink_buff_duration_bonus_per_level * 100,
    ),
    CADENCEDAMAGE: values.DAMAGE,
    CADENCEHEAL: values.HEALSHEALTH,
  });
  // Source: server-scripts/ChanneledTargetDamageSkill.cs:24-47 — channel damage includes the damage multiplier before player bonuses.
  if (skill.damage) {
    const multiplier = skill.damage_percent?.base_value ?? 0;
    values.CHANNELDAMAGE = format(
      roundTooltipInteger(
        skill.damage.base_value * (multiplier > 0 ? multiplier : 1),
      ),
    );
  }
  // Base attacks depend on the equipped weapon, so their damage line cannot be resolved here.
  if (skill.base_skill) delete values.DAMAGE;
  const castTime = skill.cast_time?.base_value ?? 0;
  const castText =
    castTime <= 0.001 ? "Instant cast" : `${prettySeconds(castTime)} cast`;
  let text = (skill.tooltip_template ?? "")
    .replaceAll("{CASTTIME} cast", castText)
    .replaceAll("{CASTTIME}", castText);
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

export const load: PageServerLoad = ({ params }): SkillDetailPageData => {
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
  const playerClasses = skillDetailFromRow(skillRaw).player_classes;

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
  const skillCategories = [
    ...new Set(
      playerClasses.map((classId) => {
        const classSkills = query<{
          id: string;
          base_skill: number;
          is_veteran: number;
          tier: number;
          class_skill_position: number;
        }>(
          `SELECT id, base_skill, is_veteran, tier,
        json_extract(class_skill_positions, '$.' || ?) AS class_skill_position
       FROM skills WHERE EXISTS (SELECT 1 FROM json_each(player_classes) WHERE value = ?)`,
          [classId, classId],
        );
        const subject = classSkills.find((entry) => entry.id === params.id)!;
        const lastTierPosition = Math.max(
          ...classSkills
            .filter((entry) => entry.tier > 0 && !entry.is_veteran)
            .map((entry) => entry.class_skill_position),
        );
        return getSkillCategoryKey(subject, lastTierPosition);
      }),
    ),
  ];
  // Source: server-scripts/SummonSkill.cs:Apply; server-scripts/PetSkills.cs:RefreshSkillLevels — summon rank sets familiar level and each skill rank, capped by that skill's maximum.
  const familiarSkills = skillRaw.is_familiar
    ? query<SkillDetailPageData["familiarSkills"][number]>(
        `SELECT s.id, s.name, s.max_level FROM skills s
     JOIN pet_skills ps ON ps.skill_id = s.id
     JOIN pets p ON p.id = ps.pet_id
     WHERE p.is_familiar = 1 AND lower(p.name) = lower(?) ORDER BY s.name`,
        [skillRaw.pet_prefab_name as string],
      )
    : [];

  const skill: SkillDetailView = {
    ...skillDetailFromRow(skillRaw),
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

  // Get pets/mercenaries that use this skill. A familiar takes its rank from the skill that
  // summons it, joined by prefab name as the pets pages do.
  const usedByPets = query<SkillPet>(
    `SELECT DISTINCT p.id, p.name, p.is_mercenary, p.is_familiar, p.type_monster, ps.skill_index,
      summon.id AS summon_skill_id, summon.name AS summon_skill_name
    FROM pet_skills ps
    JOIN pets p ON p.id = ps.pet_id
    LEFT JOIN skills summon
      ON p.is_familiar = 1 AND lower(summon.pet_prefab_name) = lower(p.name)
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
    gameTooltip: _fillSkillTooltip(skill),
    effectSummary,
    grantedByItems,
    scrollItems,
    skillCategories,
    familiarSkills,
    usedByMonsters,
    usedByPets,
    appliedByTraps,
    description,
    visualAsset,
    mechanicsSpec: skillMechanicsSpec(skill, casters),
  };
};
