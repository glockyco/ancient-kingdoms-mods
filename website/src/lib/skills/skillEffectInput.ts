import type {
  BuffBonusAttrSource,
  Caster,
  DamageContext,
  DamageTerm,
  DebuffBonusAttrKind,
  HealBonusKind,
  LinearValue,
  SkillDetailView,
  SkillMechanicsSpec,
} from "$lib/types/skills";
import {
  hasNonZeroField,
  NOTED_FIELDS,
  type AreaHealCaster,
  type NotedField,
  type Skill,
  type SummaryNotes,
} from "$lib/utils/formatSkillEffect";
import {
  formatNumber as number,
  formatPercent as percent,
} from "$lib/utils/format";
import { melodyBonus } from "$lib/calculation/bard";
import {
  RANGER_ATTRIBUTE_MULTIPLIER,
  SONG_POWER_PER_CHARISMA,
  WISDOM_HEAL_SHARE,
} from "$lib/calculation/combat";
import {
  damageFormulaStats,
  monsterDamageStats,
  skillMechanicsSpec,
} from "$lib/utils/skillMechanics";
import { damageDeductions } from "./damage-calculations";
import {
  effectScalings,
  healWisdomShare,
  type EffectScaling,
} from "./effect-calculations";
import type { SkillCasters } from "./skillDetail";

/** Whose attribute a note refers to. */
type NoteOwner = "any" | "ranger" | "mercenary";

/** How one caster group's attribute changes a listed value: `${lead} per ${attribute}`. */
interface Note {
  owner: NoteOwner;
  lead: string;
  attribute: string;
}

/** How a caster's attribute enters a buff or debuff value. */
interface AttributeSource {
  attribute: string;
  /** Attribute points per point of the listed attribute, such as 3 for a Ranger's tripled Wisdom. */
  multiplier: number;
  song: boolean;
}

// Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute,GetDebuffPowerAttribute; TargetBuffSkill.cs:434-445; AreaBuffSkill.cs:16-18,33-58 — the attribute each caster contributes.
function attributeSource(
  source: BuffBonusAttrSource | DebuffBonusAttrKind,
): AttributeSource | null {
  switch (source) {
    case "player_wis":
    case "merc_wis":
      return { attribute: "WIS", multiplier: 1, song: false };
    case "player_ranger_wis":
      return {
        attribute: "WIS",
        multiplier: RANGER_ATTRIBUTE_MULTIPLIER,
        song: false,
      };
    case "player_int":
    case "merc_int":
    case "int":
      return { attribute: "INT", multiplier: 1, song: false };
    case "player_ranger_int":
      return {
        attribute: "INT",
        multiplier: RANGER_ATTRIBUTE_MULTIPLIER,
        song: false,
      };
    case "player_cha":
    case "merc_cha":
    case "cha":
      return { attribute: "CHA", multiplier: 1, song: true };
    case "player_wis_con_avg":
      return { attribute: "WIS or CON", multiplier: 0.5, song: false };
    case "player_wis_con_cha_half":
      return { attribute: "WIS, CON or CHA", multiplier: 0.5, song: false };
    case "player_level":
      return { attribute: "level", multiplier: 10, song: false };
    case "str":
      return { attribute: "STR", multiplier: 1, song: false };
    case "dex":
      return { attribute: "DEX", multiplier: 1, song: false };
    case "none":
      return null;
  }
}

/** The lead of a note that multiplies a song's value by song power. */
const SONG_POWER_LEAD = `${percent(SONG_POWER_PER_CHARISMA, { decimals: 2, preserveNonzero: true })} stronger`;

// Source: server-scripts/Buff.cs:47-258; BuffSkill.cs:230-247,464-527; Wisdom.cs:116-128 — song power multiplies a song's values, other buffs add a share of the attribute, and short heal-over-time buffs add a share of the heal.
/** How an attribute source changes one listed value, as a note lead, or null when it does not. */
function scalingLead(
  scaling: EffectScaling,
  source: AttributeSource,
  value: LinearValue,
  durationBase: number,
): string | null {
  const { mode, factor } = scaling;
  const { multiplier } = source;
  if (source.song) {
    if (mode === "dot" && factor > 0) return `+${number(factor)}`;
    return SONG_POWER_LEAD;
  }
  switch (mode) {
    case "song":
      return SONG_POWER_LEAD;
    case "flat":
      return `${value.base_value < 0 ? "−" : "+"}${number(factor * multiplier)}`;
    case "healing":
      return durationBase < 60
        ? `${percent(WISDOM_HEAL_SHARE * multiplier, { decimals: 2, preserveNonzero: true })} more`
        : `+${number(factor * multiplier)}`;
    case "ward":
      return `+${number(factor * multiplier)}`;
    case "dot":
      return factor > 0 ? `+${number(factor * multiplier)}` : null;
  }
}

function contextOwner(
  casters: Caster[],
  source: BuffBonusAttrSource | DebuffBonusAttrKind | HealBonusKind,
): NoteOwner {
  if (casters.every((caster) => caster.kind === "mercenary")) {
    return "mercenary";
  }
  return source.startsWith("player_ranger") ? "ranger" : "any";
}

/** One note per value from each caster group's notes. */
function renderNotes(entries: Map<NotedField, Note[]>): SummaryNotes {
  const notes: SummaryNotes = {};
  for (const [field, fieldNotes] of entries) {
    const distinct = fieldNotes.filter(
      (note, index) =>
        fieldNotes.findIndex(
          (other) =>
            other.owner === note.owner &&
            other.lead === note.lead &&
            other.attribute === note.attribute,
        ) === index,
    );
    const owners = new Set(distinct.map((note) => note.owner));
    if (owners.size === 1) {
      if (distinct.length > 1) {
        throw new Error(
          `Field ${field}: one caster group scales it two ways, so its summary note cannot name one rule`,
        );
      }
      const [only] = distinct;
      notes[field] =
        `${only.lead} per ${only.owner === "mercenary" ? `mercenary ${only.attribute}` : only.attribute}`;
      continue;
    }
    const base =
      distinct.find((note) => note.owner === "any") ??
      distinct.find((note) => note.owner === "mercenary")!;
    const rest = distinct
      .filter((note) => note !== base)
      .filter(
        (note) =>
          !(
            note.owner === "mercenary" &&
            note.lead === base.lead &&
            note.attribute === base.attribute
          ),
      )
      .map((note) => {
        const who = note.owner === "ranger" ? "Rangers" : "mercenaries";
        return note.attribute === base.attribute
          ? `${who} ${note.lead}`
          : `${who} ${note.lead} per ${note.attribute}`;
      });
    notes[field] = [`${base.lead} per ${base.attribute}`, ...rest].join(", ");
  }
  return notes;
}

function addNote(
  entries: Map<NotedField, Note[]>,
  field: NotedField,
  note: Note,
): void {
  entries.set(field, [...(entries.get(field) ?? []), note]);
}

/** The summary field an effect's note qualifies. */
function notedField(key: string): NotedField {
  const field = NOTED_FIELDS.find((noted) => noted === key);
  if (!field) {
    throw new Error(`The effect summary shows no attribute note on ${key}`);
  }
  return field;
}

/** Whether a damage context's casters are players, which a summary describes first. */
function playerContext(context: DamageContext): boolean {
  return context.casters.some(
    (caster) =>
      caster.kind === "player" ||
      caster.kind === "any_player" ||
      caster.kind === "weapon_effect",
  );
}

/** The damage contexts a summary describes: players first, then mercenaries, then everyone else. */
function summaryDamageContexts(spec: SkillMechanicsSpec): DamageContext[] {
  const players = spec.damageContexts.filter(playerContext);
  if (players.length > 0) return players;
  const mercenaries = spec.damageContexts.filter((context) =>
    context.casters.every((caster) => caster.kind === "mercenary"),
  );
  return mercenaries.length > 0 ? mercenaries : spec.damageContexts;
}

/** The terms the summary's casters add to or subtract from listed damage. */
function damageTerms(
  skill: SkillDetailView,
  contexts: DamageContext[],
): DamageTerm[] {
  const [first, ...rest] = contexts.map((context) => [
    ...damageFormulaStats(skill, context.formula),
    ...damageDeductions(skill, context.casters, context.formula),
  ]);
  if (!first) return [];
  if (rest.some((terms) => terms.join("+") !== first.join("+"))) {
    throw new Error(
      `Skill ${skill.id}: its casters compute its damage differently, so its effect summary cannot name one formula`,
    );
  }
  return first;
}

// Source: server-scripts/BardFinalCadenceSkill.cs:Apply; PlayerSkills.cs:GetFinalCadenceSongBonus — song power scales the listed damage and healing, then a player's Melody adds 15%, 25% or 30% for 4, 5 or 6+ active songs.
function cadenceNote(mercenary: boolean): string {
  const songPower = `${percent(SONG_POWER_PER_CHARISMA, { decimals: 2, preserveNonzero: true })} more per`;
  if (mercenary) return `${songPower} mercenary CHA`;
  const melody = [4, 5, 6].map((songs) =>
    percent(melodyBonus(songs), { decimals: 2, preserveNonzero: true }),
  );
  return `${songPower} CHA, then ${melody[0]}, ${melody[1]} or ${melody[2]} more with 4, 5 or 6+ songs`;
}

// Source: server-scripts/Buff.cs:47-292; BardSongSkill.cs:28; BardCharmSongSkill.cs:GetCharmedDamageMultiplier — song power scales a song's values, but not speed, attributes or an additive Charisma damage over time.
/**
 * Move a song's notes onto its "Bard song" fragment when every value it shows
 * carries the same song power note.
 */
function hoistSongNote(
  skill: SkillDetailView,
  entries: Map<NotedField, Note[]>,
  notes: SummaryNotes,
): void {
  if (!skill.is_bard_song) return;
  const shown = LINEAR_FIELDS.filter((field) => hasNonZeroField(skill[field]));
  const fields = shown.flatMap((field) =>
    NOTED_FIELDS.filter((noted) => noted === field),
  );
  const [first] = fields;
  if (first === undefined || fields.length !== shown.length) return;
  const songPower = fields.every(
    (field) =>
      notes[field] === notes[first] &&
      (entries.get(field) ?? []).length > 0 &&
      (entries.get(field) ?? []).every((note) => note.lead === SONG_POWER_LEAD),
  );
  if (!songPower) return;
  notes.is_bard_song = notes[first];
  for (const field of fields) delete notes[field];
}

/** The kind of entity the summary describes casting an area heal without the pet or mercenary flag. */
function areaHealCaster(
  skill: SkillDetailView,
  spec: SkillMechanicsSpec,
  casters: SkillCasters,
): AreaHealCaster | undefined {
  if (
    skill.skill_type !== "area_heal" ||
    skill.is_mercenary_skill ||
    skill.is_pet_skill
  ) {
    return undefined;
  }
  const kinds = new Set(
    spec.healContexts.flatMap((context) =>
      context.casters.map((caster) => caster.kind),
    ),
  );
  if (kinds.has("player") || kinds.has("any_player")) return "player";
  if (kinds.has("mercenary") || kinds.has("companion") || kinds.has("familiar"))
    return "pet";
  if (!kinds.has("monster")) return undefined;
  // Source: server-scripts/AreaHealSkill.cs:Apply — an NPC's area heal reaches NPCs of its own class, which the summary does not name.
  if (casters.npcCount > 0) {
    throw new Error(
      `Skill ${skill.id}: an NPC casts this area heal, whose recipients the summary cannot name`,
    );
  }
  return "monster";
}

/** How the summary's casters' attributes change each listed value. */
function summaryNotes(
  skill: SkillDetailView,
  spec: SkillMechanicsSpec,
): SummaryNotes {
  const entries = new Map<NotedField, Note[]>();

  for (const context of spec.healContexts) {
    const share = healWisdomShare(skill, context.bonusKind);
    if (share === null) continue;
    addNote(entries, "heals_health", {
      owner: contextOwner(context.casters, context.bonusKind),
      lead: `${percent(share, { decimals: 2, preserveNonzero: true })} more`,
      attribute: "WIS",
    });
  }

  const scaledContexts = [
    ...spec.buffContexts.map((context) => ({
      casters: context.casters,
      source: context.bonusAttrSource,
      debuff: false,
    })),
    ...spec.debuffContexts.map((context) => ({
      casters: context.casters,
      source: context.bonusAttrKind,
      debuff: true,
    })),
  ];
  for (const { casters, source, debuff } of scaledContexts) {
    const attribute = attributeSource(source);
    if (!attribute) continue;
    for (const scaling of effectScalings(skill, debuff)) {
      const value = skill[scaling.effect.key];
      if (!value) continue;
      const lead = scalingLead(scaling, attribute, value, skill.duration_base);
      if (!lead) continue;
      addNote(entries, notedField(scaling.effect.key), {
        owner: contextOwner(casters, source),
        lead,
        attribute: attribute.attribute,
      });
    }
  }
  // Source: server-scripts/BardCharmSongSkill.cs:Apply,GetCharmedDamageMultiplier — only a player charms, and song power scales the charmed monster's share of its damage, up to 100%.
  if (
    skill.is_bard_charm &&
    skill.charmed_damage_percent &&
    skill.player_classes.length > 0
  ) {
    addNote(entries, "charmed_damage_percent", {
      owner: "any",
      lead: SONG_POWER_LEAD,
      attribute: "CHA",
    });
  }

  const notes = renderNotes(entries);
  hoistSongNote(skill, entries, notes);
  const cadence = spec.damageContexts.find(
    (context) =>
      context.formula === "bard_final_cadence" ||
      context.formula === "bard_final_cadence_merc",
  );
  // Final Cadence's damage and healing share one note on its damage.
  if (cadence) {
    notes.damage = cadenceNote(cadence.formula === "bard_final_cadence_merc");
  }
  return notes;
}

/** A skill only monsters and NPCs cast, at a rank no reader chooses. */
function npcCasterOnly(skill: SkillDetailView, casters: SkillCasters): boolean {
  return (
    skill.player_classes.length === 0 &&
    casters.pets.length === 0 &&
    casters.itemCount === 0 &&
    casters.trapCount === 0 &&
    casters.monsterCount + casters.npcCount > 0
  );
}

/** The one buff level every potion applying the skill uses, or null when no potion applies it. */
function potionBuffLevel(
  skill: SkillDetailView,
  casters: SkillCasters,
): number | null {
  if (casters.potionBuffLevels.length === 0) return null;
  if (casters.potionBuffLevels.length > 1) {
    throw new Error(
      `Skill ${skill.id}: potions apply it at different buff levels, so its summary cannot state one duration`,
    );
  }
  return casters.potionBuffLevels[0];
}

/** Every rank-scaled field of the formatter input. */
const LINEAR_FIELDS = [
  "damage",
  "damage_percent",
  "lifetap_percent",
  "knockback_chance",
  "stun_chance",
  "stun_time",
  "fear_chance",
  "fear_time",
  "aggro",
  "heals_health",
  "heals_mana",
  "charmed_damage_percent",
  "health_cost_percent",
  "mana_restored_percent",
  "healing_percent",
  "health_max_bonus",
  "health_max_percent_bonus",
  "mana_max_bonus",
  "mana_max_percent_bonus",
  "energy_max_bonus",
  "defense_bonus",
  "ward_bonus",
  "magic_resist_bonus",
  "poison_resist_bonus",
  "fire_resist_bonus",
  "cold_resist_bonus",
  "disease_resist_bonus",
  "damage_bonus",
  "damage_percent_bonus",
  "magic_damage_bonus",
  "magic_damage_percent_bonus",
  "haste_bonus",
  "spell_haste_bonus",
  "speed_bonus",
  "critical_chance_bonus",
  "critical_resist_bonus",
  "accuracy_bonus",
  "block_chance_bonus",
  "fear_resist_chance_bonus",
  "damage_shield",
  "cooldown_reduction_percent",
  "heal_on_hit_percent",
  "healing_per_second_bonus",
  "health_percent_per_second_bonus",
  "mana_per_second_bonus",
  "mana_percent_per_second_bonus",
  "energy_per_second_bonus",
  "energy_percent_per_second_bonus",
  "strength_bonus",
  "intelligence_bonus",
  "dexterity_bonus",
  "charisma_bonus",
  "wisdom_bonus",
  "constitution_bonus",
  "lifetap_healing_percent_bonus",
  "damage_over_time_execute_bonus",
] as const satisfies readonly (keyof Skill & keyof SkillDetailView)[];

/**
 * The formatter input for a skill, with the stats, deductions and attribute
 * notes of the casters the summary describes. Values resolve at
 * `runtimeLevel` when given. A skill only monsters and NPCs cast resolves at
 * their fixed rank, and one with a single rank at rank 1, since neither has a
 * rank the reader chooses.
 */
export function skillEffectInput(
  skill: SkillDetailView,
  casters: SkillCasters,
  runtimeLevel?: number,
): Skill {
  const spec = skillMechanicsSpec(skill, casters);
  const npcOnly = npcCasterOnly(skill, casters);
  const potionLevel = potionBuffLevel(skill, casters);
  const input: Skill = {
    id: skill.id,
    skill_type: skill.skill_type,
    damage_type: skill.damage_type,
    damage_over_time_type: skill.damage_over_time_type,
    damage_shield_type: skill.damage_shield_type,
    max_level: skill.max_level,
    npc_caster_only: npcOnly,
    is_mercenary_skill: skill.is_mercenary_skill,
    required_weapon_category: skill.required_weapon_category,
    cast_range: skill.cast_range?.base_value ?? 0,
    can_buff_self: skill.can_buff_self,
    can_buff_others: skill.can_buff_others,
    area_projectile: skill.area_projectile,
    is_only_for_magic_classes: skill.is_only_for_magic_classes,
    is_undead_illusion: skill.is_undead_illusion,
    potion_buff_level: potionLevel,
    area_heal_caster: areaHealCaster(skill, spec, casters),
    notes: summaryNotes(skill, spec),
    damage_terms: damageTerms(skill, summaryDamageContexts(spec)),
    monster_damage_terms: monsterDamageStats(skill),
    knockback_distance: skill.knockback_distance,
    is_assassination_skill: skill.is_assassination_skill,
    is_manaburn_skill: skill.is_manaburn_skill,
    break_armor_prob: skill.break_armor_prob,
    is_resurrect_skill: skill.is_resurrect_skill,
    is_balance_health: skill.is_balance_health,
    healing_percent_per_intelligence: skill.healing_percent_per_intelligence,
    fear_resist_chance_bonus_cap: skill.fear_resist_chance_bonus_cap,
    duration_base: skill.duration_base,
    duration_per_level: skill.duration_per_level,
    is_permanent: skill.is_permanent,
    is_double_exp_spell: skill.is_double_exp_spell,
    is_invisibility: skill.is_invisibility,
    ignores_see_invisibility: skill.ignores_see_invisibility,
    illusion_race: skill.illusion_race,
    is_mana_shield: skill.is_mana_shield,
    is_cleanse: skill.is_cleanse,
    is_dispel: skill.is_dispel,
    is_teleport: skill.is_teleport,
    is_blindness: skill.is_blindness,
    is_enrage: skill.is_enrage,
    is_bard_song: skill.is_bard_song,
    is_bard_charm: skill.is_bard_charm,
    is_bard_final_cadence: skill.is_bard_final_cadence,
    is_bard_virtuosity: skill.is_bard_virtuosity,
    additional_damage_percent_per_song:
      skill.additional_damage_percent_per_song,
    additional_active_bard_songs: skill.additional_active_bard_songs,
    unlimited_active_bard_songs: skill.unlimited_active_bard_songs,
    bard_song_duration_bonus_per_level:
      skill.bard_song_duration_bonus_per_level,
    extra_gather_item_chance: skill.extra_gather_item_chance,
    food_and_drink_buff_duration_bonus_per_level:
      skill.food_and_drink_buff_duration_bonus_per_level,
    is_pet_skill: skill.is_pet_skill,
    channel_pulses: skill.channel_pulses,
    also_buff_active_pet: skill.also_buff_active_pet,
    is_necromancer_blood_pact: skill.is_necromancer_blood_pact,
    is_necromancer_death_bloom: skill.is_necromancer_death_bloom,
    is_necromancer_pet_buff: skill.is_necromancer_pet_buff,
    is_necromancer_reaper_form: skill.is_necromancer_reaper_form,
    summoned_monster_id: skill.summoned_monster_id,
    summoned_monster_name: skill.summoned_monster_name,
    summoned_monster_level: skill.summoned_monster_level,
    summon_count_per_cast: skill.summon_count_per_cast,
    max_active_summons: skill.max_active_summons,
    pet_name: skill.pet_name,
    is_familiar: skill.is_familiar,
    affects_random_target: skill.affects_random_target,
    area_object_size: skill.area_object_size,
    area_objects_to_spawn: skill.area_objects_to_spawn,
    is_poison_debuff: skill.is_poison_debuff,
    is_fire_debuff: skill.is_fire_debuff,
    is_cold_debuff: skill.is_cold_debuff,
    is_disease_debuff: skill.is_disease_debuff,
    is_melee_debuff: skill.is_melee_debuff,
    is_magic_debuff: skill.is_magic_debuff,
    prob_ignore_cleanse: skill.prob_ignore_cleanse,
    damage: skill.damage,
    damage_percent: skill.damage_percent,
    lifetap_percent: skill.lifetap_percent,
    knockback_chance: skill.knockback_chance,
    stun_chance: skill.stun_chance,
    stun_time: skill.stun_time,
    fear_chance: skill.fear_chance,
    fear_time: skill.fear_time,
    aggro: skill.aggro,
    heals_health: skill.heals_health,
    heals_mana: skill.heals_mana,
    charmed_damage_percent: skill.charmed_damage_percent,
    health_cost_percent: skill.health_cost_percent,
    mana_restored_percent: skill.mana_restored_percent,
    healing_percent: skill.healing_percent,
    health_max_bonus: skill.health_max_bonus,
    health_max_percent_bonus: skill.health_max_percent_bonus,
    mana_max_bonus: skill.mana_max_bonus,
    mana_max_percent_bonus: skill.mana_max_percent_bonus,
    energy_max_bonus: skill.energy_max_bonus,
    defense_bonus: skill.defense_bonus,
    ward_bonus: skill.ward_bonus,
    magic_resist_bonus: skill.magic_resist_bonus,
    poison_resist_bonus: skill.poison_resist_bonus,
    fire_resist_bonus: skill.fire_resist_bonus,
    cold_resist_bonus: skill.cold_resist_bonus,
    disease_resist_bonus: skill.disease_resist_bonus,
    damage_bonus: skill.damage_bonus,
    damage_percent_bonus: skill.damage_percent_bonus,
    magic_damage_bonus: skill.magic_damage_bonus,
    magic_damage_percent_bonus: skill.magic_damage_percent_bonus,
    haste_bonus: skill.haste_bonus,
    spell_haste_bonus: skill.spell_haste_bonus,
    speed_bonus: skill.speed_bonus,
    critical_chance_bonus: skill.critical_chance_bonus,
    critical_resist_bonus: skill.critical_resist_bonus,
    accuracy_bonus: skill.accuracy_bonus,
    block_chance_bonus: skill.block_chance_bonus,
    fear_resist_chance_bonus: skill.fear_resist_chance_bonus,
    damage_shield: skill.damage_shield,
    cooldown_reduction_percent: skill.cooldown_reduction_percent,
    heal_on_hit_percent: skill.heal_on_hit_percent,
    healing_per_second_bonus: skill.healing_per_second_bonus,
    health_percent_per_second_bonus: skill.health_percent_per_second_bonus,
    mana_per_second_bonus: skill.mana_per_second_bonus,
    mana_percent_per_second_bonus: skill.mana_percent_per_second_bonus,
    energy_per_second_bonus: skill.energy_per_second_bonus,
    energy_percent_per_second_bonus: skill.energy_percent_per_second_bonus,
    strength_bonus: skill.strength_bonus,
    intelligence_bonus: skill.intelligence_bonus,
    dexterity_bonus: skill.dexterity_bonus,
    charisma_bonus: skill.charisma_bonus,
    wisdom_bonus: skill.wisdom_bonus,
    constitution_bonus: skill.constitution_bonus,
    lifetap_healing_percent_bonus: skill.lifetap_healing_percent_bonus,
    damage_over_time_execute_bonus: skill.damage_over_time_execute_bonus,
  };

  // Source: server-scripts/MonsterSkills.cs:OnStartServer; Skill.cs:Skill; Npc.cs — monsters and NPCs cast at rank 1 when learnDefault, otherwise rank 0.
  // A potion buff's rank is its buff level, which Elixir Endurance raises, so its duration keeps its rank formula.
  const resolvedLevel =
    runtimeLevel ??
    (npcOnly
      ? skill.learn_default
        ? 1
        : 0
      : skill.max_level <= 1 && potionLevel === null
        ? 1
        : undefined);
  if (resolvedLevel === undefined) return input;

  for (const field of LINEAR_FIELDS) {
    const value = input[field];
    if (!value) continue;
    input[field] = {
      base_value:
        value.base_value + value.bonus_per_level * (resolvedLevel - 1),
      bonus_per_level: 0,
    };
  }
  input.duration_base =
    skill.duration_base + skill.duration_per_level * (resolvedLevel - 1);
  input.duration_per_level = 0;
  return input;
}
