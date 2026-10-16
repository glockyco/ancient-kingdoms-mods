import { query, queryOne } from "$lib/db.server";
import type { ClassSkill } from "./classes.server";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import { iround, multiplyF32 } from "$lib/calculation/unity-math";
import {
  SKILL_LIST_COLUMNS,
  SKILL_LIST_JOINS,
} from "$lib/skills/skillsListQuery";
import { skillEffectSummaries } from "$lib/skills/skillEffects.server";
import type {
  MercenaryCompanion,
  MercenaryDetailView,
  MercenaryProfile,
  MercenarySummary,
  MercenaryResistance,
  SummonListView,
  PetDetailView,
  PetKind,
  PetClassLink,
  PetSummoningMercenary,
  PetRecruiter,
  PetStatId,
  PetStatCurves,
  PetStatSnapshot,
} from "$lib/types/pets";
import {
  getMercenaryCurves,
  getMercenaryLinks,
} from "$lib/queries/mercenaries.server";

const PET_STATS: { id: PetStatId; name: string; isPercent?: boolean }[] = [
  { id: "health", name: "Health" },
  { id: "damage", name: "Attack Power" },
  { id: "magic_damage", name: "Spell Power" },
  { id: "defense", name: "Armor Class" },
  { id: "magic_resist", name: "Magic resistance" },
  { id: "poison_resist", name: "Poison resistance" },
  { id: "fire_resist", name: "Fire resistance" },
  { id: "cold_resist", name: "Cold resistance" },
  { id: "disease_resist", name: "Disease resistance" },
  { id: "block_chance", name: "Block chance", isPercent: true },
  { id: "critical_chance", name: "Critical Strike", isPercent: true },
];
const PET_STAT_COLUMNS = PET_STATS.flatMap(({ id }) => [
  `${id}_base`,
  `${id}_per_level`,
]).join(", ");

export function getPetStatSnapshots(
  curves: PetStatCurves,
  maxLevel: number,
  hasVeteranBonus: boolean,
): PetStatSnapshot[] {
  // Source: server-scripts/LinearInt.cs:10-13; LinearFloat.cs:10-13 — base plus growth for each level after 1.
  return PET_STATS.flatMap(({ id, name, isPercent = false }) => {
    let level1 = isPercent
      ? Math.fround(curves[`${id}_base`])
      : curves[`${id}_base`];
    const growth = curves[`${id}_per_level`];
    if (level1 === 0 && growth === 0) return [];
    let atCap = isPercent
      ? Math.fround(level1 + multiplyF32(growth, maxLevel - 1))
      : level1 + growth * (maxLevel - 1);
    let veteranBase = atCap;
    if (id === "health") {
      // Source: server-scripts/Health.cs:34; NecromancerPetStats.cs:50 — Health rounds after its multiplier, while the veteran bonus uses the unrounded scaled base.
      level1 = iround(multiplyF32(level1, curves.health_multiplier));
      veteranBase = multiplyF32(atCap, curves.health_multiplier);
      atCap = iround(veteranBase);
    }
    // Source: server-scripts/NecromancerPetStats.cs:GetVeteranBonus,GetDamageBonus,GetMagicDamageBonus,GetHealthBonus — each veteran point adds 1% of base Attack Power and Spell Power and 0.25% of base Health, Armor Class and resistances, rounded. Block and critical chance gain nothing.
    const rate = id === "damage" || id === "magic_damage" ? 0.01 : 0.0025;
    const bonus =
      hasVeteranBonus && !isPercent
        ? iround(
            multiplyF32(
              id === "health" ? multiplyF32(veteranBase, 200) : atCap * 200,
              rate,
            ),
          )
        : 0;
    return [{ name, isPercent, level1, atCap, withVeteran: atCap + bonus }];
  });
}

function getPetKind(is_mercenary: boolean, is_familiar: boolean): PetKind {
  if (is_mercenary) return "Mercenary";
  if (is_familiar) return "Familiar";
  return "Companion";
}

type PetVisualAssetColumns = {
  visual_public_path: string | null;
  visual_width: number | null;
  visual_height: number | null;
  visual_source_field: string | null;
  visual_source_type: string | null;
};

function getVisualAsset(row: PetVisualAssetColumns): EntityVisualAsset | null {
  if (
    row.visual_public_path == null ||
    row.visual_width == null ||
    row.visual_height == null ||
    row.visual_source_field == null ||
    row.visual_source_type == null
  ) {
    return null;
  }

  return {
    public_path: row.visual_public_path,
    width: row.visual_width,
    height: row.visual_height,
    source_field: row.visual_source_field,
    source_type: row.visual_source_type,
  };
}

/**
 * One row per mercenary class for the /mercenaries hub, in the site-wide
 * class order. The role flags and the death save come from the class skills.
 */
export function getMercenarySummaries(): MercenarySummary[] {
  return getMercenaryLinks().map(({ id }) => {
    const pet = queryOne<{
      name: string;
      type_monster: string;
      has_heals: number;
      has_buffs: number;
    }>(
      `SELECT name, type_monster, has_heals, has_buffs FROM pets WHERE id = ?`,
      [id],
    );
    if (!pet) throw new Error(`Mercenary ${id} disappeared from pets`);
    const skills = getPetSkills(id);
    return {
      id,
      name: pet.name,
      type_monster: pet.type_monster,
      has_heals: pet.has_heals === 1,
      has_buffs: pet.has_buffs === 1,
      class_icon:
        queryOne<{ public_path: string }>(
          `SELECT public_path FROM visual_assets
           WHERE domain = 'class' AND kind = 'icon' AND entity_id = lower(?)`,
          [pet.type_monster],
        )?.public_path ?? null,
      // Source: mods/DataExporter/Exporters/PetExporter.cs — the only innate mercenary skill is the death save.
      hasDeathSave: skills.some((s) => s.is_innate),
      skillCount: skills.filter((s) => !s.is_innate).length,
    };
  });
}

/**
 * Each mercenary companion with the mercenary that summons it.
 * Source: server-scripts/MercenarySummonSkill.cs:GetPrefab — the summon skill
 * holds an archer and a reaper prefab and picks one by the owner's level.
 */
const MERCENARY_COMPANIONS = `mercenary_companions AS (
  SELECT companion.id AS pet_id,
         summon.id AS skill_id,
         summon.name AS skill_name,
         mercenary.id AS mercenary_id,
         mercenary.name AS mercenary_name,
         lower(mercenary.type_monster) AS mercenary_class_id,
         CASE WHEN summon.reaper_pet_id = companion.id THEN 'reaper' ELSE 'archer' END AS form
    FROM skills summon
    JOIN pet_skills ps ON ps.skill_id = summon.id
    JOIN pets mercenary ON mercenary.id = ps.pet_id AND mercenary.is_mercenary = 1
    JOIN pets companion
      ON companion.id IN (summon.archer_pet_id, summon.reaper_pet_id)
   WHERE summon.skill_type = 'mercenary_summon'
)`;

interface MercenaryCompanionRow {
  mercenary_id: string | null;
  mercenary_name: string | null;
  form: PetSummoningMercenary["form"] | null;
}

function summoningMercenary(
  row: MercenaryCompanionRow,
): PetSummoningMercenary | null {
  if (row.mercenary_id === null) return null;
  if (row.mercenary_name === null || row.form === null)
    throw new Error(`Incomplete mercenary companion row ${row.mercenary_id}`);
  return { id: row.mercenary_id, name: row.mercenary_name, form: row.form };
}

/**
 * Get all summons (companions and familiars) for the /summons overview.
 */
export function getAllSummons(): SummonListView[] {
  const rows = query<
    {
      id: string;
      name: string;
      is_familiar: boolean;
      has_necromancer_pet_stats: number;
      type_monster: string;
      level: number;
      level_max: number;
      summoning_class_id: string | null;
      summoning_skill_id: string | null;
      summoning_skill_name: string | null;
    } & MercenaryCompanionRow &
      PetVisualAssetColumns
  >(
    `WITH ${MERCENARY_COMPANIONS}
     SELECT p.id, p.name, p.is_familiar, p.has_necromancer_pet_stats, p.type_monster, p.level, p.level_max,
            json_extract(s.player_classes, '$[0]') as summoning_class_id,
            COALESCE(s.id, mc.skill_id) as summoning_skill_id,
            COALESCE(s.name, mc.skill_name) as summoning_skill_name,
            mc.mercenary_id,
            mc.mercenary_name,
            mc.form,
            va.public_path as visual_public_path,
            va.width as visual_width,
            va.height as visual_height,
            va.source_field as visual_source_field,
            va.source_type as visual_source_type
     FROM pets p
     LEFT JOIN skills s ON s.pet_id = p.id
     LEFT JOIN mercenary_companions mc ON mc.pet_id = p.id
     LEFT JOIN visual_assets va
       ON va.domain = 'pet'
      AND va.entity_id = p.id
      AND va.kind = 'primary'
     WHERE p.is_mercenary = 0
     ORDER BY p.is_familiar ASC, p.name ASC`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.is_familiar ? "Familiar" : "Companion",
    type_monster: r.type_monster,
    level: r.level,
    level_max: r.level_max,
    has_necromancer_pet_stats: r.has_necromancer_pet_stats === 1,
    visualAsset: getVisualAsset(r),
    summoning_class_id: r.summoning_class_id,
    summoning_skill_id: r.summoning_skill_id,
    summoning_skill_name: r.summoning_skill_name,
    summoning_item: null,
    summoning_mercenary: summoningMercenary(r),
  }));
}

const WHISTLE_SUFFIX = " Whistle";

/**
 * Friendly pets, one per whistle item. The exporter records each whistle's
 * summoned creature sprite as the item's "pet" artwork. The game names a
 * summoned pet after its owner ("<player>'s pet") or the player's custom name
 * (FriendlyPetFollowerItem.ResolvePetName), so the whistle name is the only
 * species label.
 */
export function getWhistlePets(): SummonListView[] {
  const rows = query<{
    id: string;
    name: string;
    public_path: string;
    width: number;
    height: number;
    source_field: string;
    source_type: string;
  }>(
    `SELECT i.id, i.name, va.public_path, va.width, va.height,
            va.source_field, va.source_type
     FROM items i
     JOIN visual_assets va
       ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'pet'
     WHERE i.item_type = 'pet'
     ORDER BY i.name`,
  );
  return rows.map((r) => {
    if (!r.name.endsWith(WHISTLE_SUFFIX))
      throw new Error(`Pet item ${r.id} is not named "... Whistle": ${r.name}`);
    return {
      id: r.id,
      name: r.name.slice(0, -WHISTLE_SUFFIX.length),
      kind: "Pet",
      type_monster: "—",
      level: 0,
      level_max: null,
      has_necromancer_pet_stats: false,
      visualAsset: {
        public_path: r.public_path,
        width: r.width,
        height: r.height,
        source_field: r.source_field,
        source_type: r.source_type,
      },
      summoning_class_id: null,
      summoning_skill_id: null,
      summoning_skill_name: null,
      summoning_item: { id: r.id, name: r.name },
      summoning_mercenary: null,
    };
  });
}

/**
 * Primary sprite for a summon, exported from its prefab at runtime.
 */
export function getPetVisualAsset(petId: string): EntityVisualAsset | null {
  return (
    queryOne<EntityVisualAsset>(
      `SELECT public_path, width, height, source_field, source_type
       FROM visual_assets
       WHERE domain = 'pet' AND entity_id = ? AND kind = 'primary'`,
      [petId],
    ) ?? null
  );
}

/**
 * Get a single pet's full detail data.
 */
export function getPetById(petId: string): PetDetailView | null {
  const row = queryOne<
    {
      id: string;
      name: string;
      is_mercenary: boolean;
      is_familiar: boolean;
      type_monster: string;
      level: number;
      level_max: number;
      has_heals: number;
      has_buffs: number;
      has_necromancer_pet_stats: number;
      fear_immune: number;
    } & PetStatCurves
  >(
    `SELECT id, name, is_mercenary, is_familiar, type_monster, level, level_max,
            has_heals, has_buffs, has_necromancer_pet_stats, fear_immune, health_multiplier,
            ${PET_STAT_COLUMNS}
     FROM pets
     WHERE id = ?`,
    [petId],
  );

  if (!row) return null;

  const kind = getPetKind(row.is_mercenary, row.is_familiar);

  let classLink: PetClassLink;
  if (row.is_mercenary) {
    classLink = {
      class_id: row.type_monster.toLowerCase(),
      skill_id: null,
      skill_name: null,
      mercenary: null,
    };
  } else {
    const summonSkill = queryOne<
      {
        skill_id: string;
        skill_name: string;
        class_id: string;
      } & MercenaryCompanionRow
    >(
      `WITH ${MERCENARY_COMPANIONS}
       SELECT s.id as skill_id, s.name as skill_name,
              json_extract(s.player_classes, '$[0]') as class_id,
              NULL as mercenary_id, NULL as mercenary_name, NULL as form
         FROM skills s
        WHERE s.pet_id = ?
       UNION ALL
       SELECT skill_id, skill_name, mercenary_class_id, mercenary_id, mercenary_name, form
         FROM mercenary_companions
        WHERE pet_id = ?
       LIMIT 1`,
      [petId, petId],
    );

    if (!summonSkill) {
      throw new Error(`No summoning skill found for pet: ${petId}`);
    }

    classLink = {
      class_id: summonSkill.class_id,
      skill_id: summonSkill.skill_id,
      skill_name: summonSkill.skill_name,
      mercenary: summoningMercenary(summonSkill),
    };
  }

  // Familiars take the summoning skill rank without the companion level clamp.
  // Source: server-scripts/SummonSkill.cs:99 — familiar level equals skillLevel.
  let effective_max_level = row.level_max;
  if (row.is_familiar && classLink.skill_id) {
    const skillMaxLevel = queryOne<{ max_level: number }>(
      `SELECT max_level FROM skills WHERE id = ?`,
      [classLink.skill_id],
    );
    if (skillMaxLevel) {
      effective_max_level = skillMaxLevel.max_level;
    }
  }

  const skills = getPetSkills(petId);
  const recruiters = row.is_mercenary ? getMercenaryRecruiters() : [];

  return {
    id: row.id,
    name: row.name,
    kind,
    type_monster: row.type_monster,
    level: row.level,
    level_max: row.level_max,
    stats: getPetStatSnapshots(
      row,
      effective_max_level,
      row.has_necromancer_pet_stats === 1,
    ),
    has_heals: row.has_heals === 1,
    has_buffs: row.has_buffs === 1,
    has_necromancer_pet_stats: row.has_necromancer_pet_stats === 1,
    fear_immune: row.fear_immune === 1,
    effective_max_level,
    classLink,
    skills,
    recruiters,
  };
}

/**
 * Get all NPCs that recruit mercenaries, with their zone locations and race
 * preference. Every recruiter offers every mercenary class. A preference
 * the class cannot use does not fix the race.
 * Source: server-scripts/Utils.cs:GetRandomChar.
 */
export function getMercenaryRecruiters(): PetRecruiter[] {
  return query<PetRecruiter>(
    `SELECT n.id as npc_id, n.name as npc_name,
            n.preferred_mercenary_race as preferred_race,
            va.public_path as visual_public_path,
            va.width as visual_width,
            va.height as visual_height,
            va.source_field as visual_source_field,
            va.source_type as visual_source_type,
            z.id as zone_id, z.name as zone_name
     FROM npcs n
     JOIN npc_spawns s ON s.npc_id = n.id
     JOIN zones z ON z.id = s.zone_id
     LEFT JOIN visual_assets va
       ON va.domain = 'npc'
      AND va.entity_id = n.id
      AND va.kind = 'primary'
     WHERE json_extract(n.roles, '$.is_recruiter_mercenaries') = 1
     ORDER BY z.name`,
  );
}

/**
 * Get mercenary IDs for the /mercenaries/[id] entries generator.
 */
export function getMercenaryIds(): string[] {
  return query<{ id: string }>(
    `SELECT id FROM pets WHERE is_mercenary = 1`,
  ).map((r) => r.id);
}

const RESISTANCES = [
  ["Magic", "magic_resist"],
  ["Poison", "poison_resist"],
  ["Fire", "fire_resist"],
  ["Cold", "cold_resist"],
  ["Disease", "disease_resist"],
] as const;

/**
 * Class-specific data for a mercenary detail page: stat curves, resistance
 * growth, the equipment slot layout, and the other mercenary archetypes.
 */
export function getMercenaryDetail(pet: PetDetailView): MercenaryDetailView {
  if (pet.kind !== "Mercenary")
    throw new Error(`Pet ${pet.id} is not a mercenary`);

  const resistRow = queryOne<Record<string, number>>(
    `SELECT ${RESISTANCES.map(
      ([, col]) => `${col}_base, ${col}_per_level`,
    ).join(", ")}
     FROM pets WHERE id = ?`,
    [pet.id],
  );
  if (!resistRow) throw new Error(`No resistance data for ${pet.id}`);
  const resistances: MercenaryResistance[] = RESISTANCES.map(([name, col]) => ({
    name,
    base: resistRow[`${col}_base`],
    per_level: resistRow[`${col}_per_level`],
  }));

  const equipmentSlots = query<{
    slot_index: number;
    accepted_category: string;
  }>(
    `SELECT slot_index, accepted_category
     FROM equipment_slots
     WHERE owner_type = 'mercenary' AND owner_id = ?
     ORDER BY slot_index`,
    [pet.classLink.class_id],
  );
  if (equipmentSlots.length === 0)
    throw new Error(`No equipment slots exported for mercenary ${pet.id}`);

  const companions = query<MercenaryCompanion>(
    `WITH ${MERCENARY_COMPANIONS}
     SELECT mc.pet_id AS id, p.name, mc.form, mc.skill_id, mc.skill_name
       FROM mercenary_companions mc
       JOIN pets p ON p.id = mc.pet_id
      WHERE mc.mercenary_id = ?
      ORDER BY mc.form`,
    [pet.id],
  );

  const profile: MercenaryProfile = {
    curves: getMercenaryCurves(),
    resistances,
    equipmentSlots,
    companions,
  };
  return { ...pet, kind: "Mercenary", profile };
}

/**
 * Get summon IDs for the /summons/[id] entries generator.
 */
export function getSummonIds(): string[] {
  return query<{ id: string }>(
    `SELECT id FROM pets WHERE is_mercenary = 0`,
  ).map((r) => r.id);
}

/**
 * Get skills for a single pet, ordered by skill_index.
 */
function getPetSkills(petId: string): ClassSkill[] {
  const rows = query<Omit<ClassSkill, "effect">>(
    `SELECT
      ${SKILL_LIST_COLUMNS},
      va.width as visual_width,
      va.height as visual_height,
      va.source_field as visual_source_field,
      va.source_type as visual_source_type,
      s.mana_cost,
      s.energy_cost,
      s.cooldown,
      s.cast_time,
      s.duration_base,
      s.duration_per_level,
      s.base_skill,
      s.required_spent_points,
      ps.is_innate
    FROM pet_skills ps
    JOIN skills s ON s.id = ps.skill_id
    ${SKILL_LIST_JOINS}
    WHERE ps.pet_id = ?
    ORDER BY ps.is_innate ASC, ps.skill_index`,
    [petId],
  );
  const effects = skillEffectSummaries(rows.map((row) => row.id));
  return rows.map((row, index) => ({ ...row, effect: effects[index] }));
}
