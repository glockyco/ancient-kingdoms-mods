import type { SkillDetailView, SkillMechanicsSpec } from "$lib/types/skills";
import type { SkillFacts } from "./skill-facts";
import { hasLinearValue } from "./skill-format";

/** What a mechanics section reads, both to decide whether it shows and to render. */
export interface MechanicsContext {
  skill: SkillDetailView;
  spec: SkillMechanicsSpec;
  facts: SkillFacts;
}

interface MechanicsSectionRule {
  id: string;
  shows: (context: MechanicsContext) => boolean;
}

/**
 * The skill page's mechanics sections in display order, each with the rule for whether a skill
 * shows it. Every id has a component in `$lib/components/skill-mechanics`.
 */
const MECHANICS_SECTIONS = [
  { id: "blood-pact", shows: ({ skill }) => skill.is_necromancer_blood_pact },
  { id: "death-bloom", shows: ({ skill }) => skill.is_necromancer_death_bloom },
  { id: "reaper-form", shows: ({ skill }) => skill.is_necromancer_reaper_form },
  {
    id: "companion-buff",
    shows: ({ skill }) =>
      // Source: server-scripts/TargetBuffSkill.cs:CorrectedTarget — isPetSkill targets the caster's active pet.
      skill.is_necromancer_pet_buff ||
      skill.also_buff_active_pet ||
      (skill.skill_type === "target_buff" && skill.is_pet_skill),
  },
  {
    id: "damage-over-time-execute",
    shows: ({ skill }) => hasLinearValue(skill.damage_over_time_execute_bonus),
  },
  {
    id: "companion-maximum-health",
    shows: ({ skill }) =>
      skill.skill_type === "passive" &&
      skill.is_pet_skill &&
      hasLinearValue(skill.health_max_percent_bonus),
  },
  {
    id: "lifetap-healing-bonus",
    shows: ({ skill }) => hasLinearValue(skill.lifetap_healing_percent_bonus),
  },
  {
    id: "mercenary-ranks",
    shows: ({ skill, facts }) => facts.usedByMercenary && skill.max_level > 1,
  },
  {
    id: "companion-ranks",
    shows: ({ skill, facts }) => facts.usedByCompanion && skill.max_level > 1,
  },
  {
    id: "familiar-ranks",
    shows: ({ skill, facts }) => facts.usedByFamiliar && skill.max_level > 1,
  },
  { id: "scroll-mastery", shows: ({ facts }) => facts.hasScrollMasteryScaling },
  {
    id: "song-capacity",
    shows: ({ skill }) => skill.additional_active_bard_songs > 0,
  },
  {
    id: "song-duration-bonus",
    shows: ({ skill }) => skill.bard_song_duration_bonus_per_level > 0,
  },
  { id: "virtuosity", shows: ({ skill }) => skill.is_bard_virtuosity },
  // A Bard mercenary sings its songs automatically, so a song it uses gets the mercenary
  // section instead of the player one.
  {
    id: "mercenary-song",
    shows: ({ skill, facts }) =>
      skill.is_bard_song && facts.usedByBardMercenary,
  },
  {
    id: "song",
    shows: ({ skill, facts }) =>
      skill.is_bard_song && !facts.usedByBardMercenary,
  },
  {
    id: "song-category",
    shows: ({ skill }) => skill.is_bard_song && Boolean(skill.buff_category),
  },
  { id: "charm", shows: ({ skill }) => skill.is_bard_charm },
  { id: "final-cadence", shows: ({ skill }) => skill.is_bard_final_cadence },
  // Wild Strike and Final Cadence explain their damage in their own sections.
  {
    id: "damage",
    shows: ({ skill, spec, facts }) =>
      facts.isDamageType &&
      !facts.isWildStrike &&
      !skill.is_bard_final_cadence &&
      spec.damageContexts.length > 0 &&
      facts.hasActualDamage,
  },
  // Aggro-only skills deal no damage, yet still show their threat calculation.
  {
    id: "aggro",
    shows: ({ skill, facts }) =>
      facts.isDamageType &&
      // Source: server-scripts/Combat.cs:DealDamageAt — negative listed threat reduces existing monster threat instead of adding damage threat.
      hasLinearValue(skill.aggro) &&
      (skill.player_classes.length > 0 ||
        facts.usedByMercenary ||
        facts.usedByCompanion),
  },
  // Source: server-scripts/PlayerSkills.cs:StartCast — only a player channels; other casters deal the damage in one hit.
  {
    id: "channel",
    shows: ({ skill, spec }) =>
      skill.channel_pulses > 0 &&
      spec.damageContexts.some((context) =>
        context.casters.some(
          (caster) => caster.kind === "player" || caster.kind === "any_player",
        ),
      ),
  },
  // Balance Health sets every target's Health instead of healing, so it replaces the healing
  // section.
  { id: "balance-health", shows: ({ skill }) => skill.is_balance_health },
  {
    id: "healing",
    shows: ({ skill, spec, facts }) =>
      !skill.is_balance_health &&
      facts.isHealType &&
      !skill.is_resurrect_skill &&
      spec.healContexts.length > 0,
  },
  // Passives are excluded: PassiveSkill.Apply applies no buff, so no attribute scales it.
  {
    id: "buff-scaling",
    shows: ({ skill, spec, facts }) =>
      facts.isBuffType &&
      facts.hasAttributeScaledBonuses &&
      // Source: server-scripts/Skills.cs:GetFinalDamageDoT — a non-debuff Health drain gets no attribute bonus.
      (skill.scales_with_charisma ||
        (skill.healing_per_second_bonus?.base_value ?? 0) >= 0 ||
        [
          skill.health_max_bonus,
          skill.defense_bonus,
          skill.ward_bonus,
          skill.magic_resist_bonus,
          skill.poison_resist_bonus,
          skill.fire_resist_bonus,
          skill.cold_resist_bonus,
          skill.disease_resist_bonus,
          skill.damage_shield,
          ...(skill.id === "leadership"
            ? [skill.damage_bonus, skill.magic_damage_bonus]
            : []),
        ].some(hasLinearValue)) &&
      skill.skill_type !== "passive" &&
      spec.buffContexts.length > 0,
  },
  {
    id: "debuff-scaling",
    shows: ({ skill, spec, facts }) =>
      !skill.is_cleanse && facts.isDebuffType && spec.debuffContexts.length > 0,
  },
  {
    id: "debuff-resistance",
    shows: ({ skill, facts }) =>
      facts.isDebuffType && !skill.is_cleanse && !skill.is_bard_charm,
  },
  {
    id: "decrease-resists",
    shows: ({ skill }) => skill.is_decrease_resists_skill,
  },
  {
    id: "cleanse-resistance",
    shows: ({ skill, facts }) =>
      facts.isDebuffType &&
      !skill.is_cleanse &&
      !skill.is_dispel &&
      // Source: server-scripts/Player.cs:CanAttack — player and pet debuffs target monsters/NPCs, which have no cleanse skills in the current data.
      facts.usedByMonster &&
      skill.prob_ignore_cleanse != null,
  },
  { id: "cleanse", shows: ({ skill }) => skill.is_cleanse },
  { id: "dispel", shows: ({ skill }) => skill.is_dispel },
  { id: "wild-strike", shows: ({ facts }) => facts.isWildStrike },
  { id: "parry", shows: ({ skill }) => skill.id === "parry" },
  { id: "assassination", shows: ({ skill }) => skill.is_assassination_skill },
  { id: "mana-shield", shows: ({ skill }) => skill.is_mana_shield },
  { id: "fear", shows: ({ skill }) => hasLinearValue(skill.fear_chance) },
  {
    id: "fear-resist",
    shows: ({ skill }) => skill.fear_resist_chance_bonus !== null,
  },
  { id: "stun", shows: ({ skill }) => hasLinearValue(skill.stun_chance) },
  {
    id: "knockback",
    shows: ({ skill }) => hasLinearValue(skill.knockback_chance),
  },
  // Source: server-scripts/Monster.cs (root threshold speed <= -10f); Skills.cs:1592-1597
  // (BreakMezz, entity.speed <= -50f) — a slow from -10 roots, one from -50 is sleep.
  {
    id: "root",
    shows: ({ skill }) =>
      skill.speed_bonus !== null &&
      skill.speed_bonus.base_value <= -10 &&
      skill.speed_bonus.base_value > -50,
  },
  {
    id: "sleep",
    shows: ({ skill }) =>
      skill.speed_bonus !== null && skill.speed_bonus.base_value <= -50,
  },
  { id: "teleport", shows: ({ skill }) => skill.is_teleport },
  {
    id: "block-chance",
    shows: ({ skill }) => hasLinearValue(skill.block_chance_bonus),
  },
  {
    id: "accuracy",
    shows: ({ skill }) => hasLinearValue(skill.accuracy_bonus),
  },
  {
    id: "critical-chance",
    shows: ({ skill }) => hasLinearValue(skill.critical_chance_bonus),
  },
  {
    id: "critical-resist",
    shows: ({ skill }) => hasLinearValue(skill.critical_resist_bonus),
  },
  {
    id: "lifetap",
    shows: ({ skill }) => hasLinearValue(skill.lifetap_percent),
  },
  { id: "break-armor", shows: ({ skill }) => skill.break_armor_prob > 0 },
  {
    id: "heal-on-hit",
    shows: ({ skill }) => hasLinearValue(skill.heal_on_hit_percent),
  },
  {
    id: "cooldown-reduction",
    shows: ({ skill }) => hasLinearValue(skill.cooldown_reduction_percent),
  },
  {
    id: "damage-shield",
    shows: ({ skill }) => hasLinearValue(skill.damage_shield),
  },
  { id: "blindness", shows: ({ skill }) => skill.is_blindness },
] as const satisfies readonly MechanicsSectionRule[];

export type MechanicsSectionId = (typeof MECHANICS_SECTIONS)[number]["id"];

/** The mechanics sections a skill shows, in display order. */
export function mechanicsSections(
  context: MechanicsContext,
): MechanicsSectionId[] {
  return MECHANICS_SECTIONS.filter((section) => section.shows(context)).map(
    (section) => section.id,
  );
}
