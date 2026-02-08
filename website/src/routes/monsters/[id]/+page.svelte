<script lang="ts">
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import QuestFlagBadges from "$lib/components/QuestFlagBadges.svelte";
  import type {
    MonsterDrop,
    MonsterSkill,
    MonsterSpawnZone,
    MonsterQuest,
  } from "$lib/types/monsters";
  import type { LinearValue } from "$lib/types/skills";
  import { formatPercent, formatDuration } from "$lib/utils/format";
  import Sword from "@lucide/svelte/icons/sword";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Scroll from "@lucide/svelte/icons/scroll";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Star from "@lucide/svelte/icons/star";
  import Zap from "@lucide/svelte/icons/zap";

  let { data } = $props();

  const respawnTime = $derived(data.monster.respawn_time);

  // Check which spawn columns to show
  const showRespawnColumn = $derived(respawnTime > 0);
  const showChanceColumn = $derived(data.monster.respawn_probability < 1);
  const showActiveColumn = $derived(
    data.monster.spawn_time_start !== 0 || data.monster.spawn_time_end !== 0,
  );
  const hasSpawnsOnDeath = $derived(
    data.monster.placeholder_monster_id !== null,
  );

  // Check if any spawn info exists
  const hasAnySpawns = $derived(
    data.spawns.regular.length > 0 ||
      data.spawns.summon.length > 0 ||
      data.spawns.altar.length > 0 ||
      data.spawns.placeholder !== null ||
      data.summons.length > 0 ||
      hasSpawnsOnDeath,
  );

  // Combine regular and summon spawns for the table
  const allSpawnZones = $derived([
    ...data.spawns.regular,
    ...data.spawns.summon.map((s) => ({
      zone_id: s.zone_id,
      zone_name: s.zone_name,
      level_min: data.monster.level,
      level_max: data.monster.level,
      spawn_count: 1,
      spawn_type: "summon" as const,
      sub_zone_name: s.sub_zone_name,
    })),
  ]);

  // Does this monster have level variance from world spawns?
  const hasLevelVariance = $derived(
    data.monster.level_min !== data.monster.level_max,
  );

  // Monster level slider (for monsters with level variance)
  // Capture initial value only - user controls the slider after mount
  let monsterLevelInput = $state((() => data.monster.level_min)());

  // Clamp input to valid range
  const displayLevel = $derived(
    Math.min(
      data.monster.level_max,
      Math.max(data.monster.level_min, monsterLevelInput),
    ),
  );

  // Calculate scaled stats using LinearInt formula: base + per_level * (level - 1)
  function calculateStat(
    base: number,
    perLevel: number,
    level: number,
  ): number {
    return base + perLevel * (level - 1);
  }

  const displayHealth = $derived(
    calculateStat(
      data.monster.health_base,
      data.monster.health_per_level,
      displayLevel,
    ),
  );
  const displayDamage = $derived(
    calculateStat(
      data.monster.damage_base,
      data.monster.damage_per_level,
      displayLevel,
    ),
  );
  const displayMagicDamage = $derived(
    calculateStat(
      data.monster.magic_damage_base,
      data.monster.magic_damage_per_level,
      displayLevel,
    ),
  );
  const displayDefense = $derived(
    calculateStat(
      data.monster.defense_base,
      data.monster.defense_per_level,
      displayLevel,
    ),
  );
  const displayMagicResist = $derived(
    calculateStat(
      data.monster.magic_resist_base,
      data.monster.magic_resist_per_level,
      displayLevel,
    ),
  );
  const displayPoisonResist = $derived(
    calculateStat(
      data.monster.poison_resist_base,
      data.monster.poison_resist_per_level,
      displayLevel,
    ),
  );
  const displayFireResist = $derived(
    calculateStat(
      data.monster.fire_resist_base,
      data.monster.fire_resist_per_level,
      displayLevel,
    ),
  );
  const displayColdResist = $derived(
    calculateStat(
      data.monster.cold_resist_base,
      data.monster.cold_resist_per_level,
      displayLevel,
    ),
  );
  const displayDiseaseResist = $derived(
    calculateStat(
      data.monster.disease_resist_base,
      data.monster.disease_resist_per_level,
      displayLevel,
    ),
  );
  const displayBlockChance = $derived(
    data.monster.block_chance_base +
      data.monster.block_chance_per_level * (displayLevel - 1),
  );
  const displayCriticalChance = $derived(
    data.monster.critical_chance_base +
      data.monster.critical_chance_per_level * (displayLevel - 1),
  );
  const displayAccuracy = $derived(
    data.monster.accuracy_base +
      data.monster.accuracy_per_level * (displayLevel - 1),
  );

  // Parse a LinearValue JSON string into its base value (for skill summary display)
  function parseLinearBase(json: string | null): number | null {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json) as LinearValue;
      if (parsed.base_value === 0 && parsed.bonus_per_level === 0) return null;
      return parsed.base_value;
    } catch {
      return null;
    }
  }

  // Format buff/debuff effects (for area_buff, area_debuff, target_buff, target_debuff)
  function formatBuffDebuffEffect(skill: MonsterSkill): string {
    const parts: string[] = [];

    // Dispel / Blindness (high priority)
    if (skill.is_dispel) parts.push("Dispels buffs");
    if (skill.is_blindness) parts.push("Blinds");

    // Root/slow
    const speedBonus = parseLinearBase(skill.speed_bonus);
    if (speedBonus !== null && speedBonus <= -20) {
      parts.push("Root");
    } else if (speedBonus !== null && speedBonus < 0) {
      parts.push(`${speedBonus} speed`);
    } else if (speedBonus !== null && speedBonus > 0) {
      parts.push(`+${speedBonus} speed`);
    }

    // Damage % bonus (frenzy/enrage buffs)
    const damagePctBonus = parseLinearBase(skill.damage_percent_bonus);
    if (damagePctBonus !== null && damagePctBonus !== 0) {
      parts.push(
        `${damagePctBonus > 0 ? "+" : ""}${formatPercent(damagePctBonus)} dmg`,
      );
    }

    // Flat damage bonus
    const damageBonus = parseLinearBase(skill.damage_bonus);
    if (damageBonus !== null && damageBonus !== 0) {
      parts.push(
        `${damageBonus > 0 ? "+" : ""}${Math.abs(damageBonus).toLocaleString()} dmg`,
      );
    }

    // Defense
    const defenseBonus = parseLinearBase(skill.defense_bonus);
    if (defenseBonus !== null && defenseBonus !== 0) {
      parts.push(
        `${defenseBonus > 0 ? "+" : ""}${Math.abs(defenseBonus).toLocaleString()} AC`,
      );
    }

    // Haste
    const hasteBonus = parseLinearBase(skill.haste_bonus);
    if (hasteBonus !== null && hasteBonus !== 0) {
      parts.push(
        `${hasteBonus > 0 ? "+" : ""}${formatPercent(hasteBonus)} haste`,
      );
    }

    // Crit / Block / Accuracy
    const critBonus = parseLinearBase(skill.critical_chance_bonus);
    if (critBonus !== null && critBonus !== 0) {
      parts.push(`${critBonus > 0 ? "+" : ""}${formatPercent(critBonus)} crit`);
    }
    const blockBonus = parseLinearBase(skill.block_chance_bonus);
    if (blockBonus !== null && blockBonus !== 0) {
      parts.push(
        `${blockBonus > 0 ? "+" : ""}${formatPercent(blockBonus)} block`,
      );
    }
    const accBonus = parseLinearBase(skill.accuracy_bonus);
    if (accBonus !== null && accBonus !== 0) {
      parts.push(
        `${accBonus > 0 ? "+" : ""}${formatPercent(accBonus)} accuracy`,
      );
    }

    // Magic damage bonus
    const magicDmgBonus = parseLinearBase(skill.magic_damage_bonus);
    if (magicDmgBonus !== null && magicDmgBonus !== 0) {
      parts.push(
        `${magicDmgBonus > 0 ? "+" : ""}${Math.abs(magicDmgBonus).toLocaleString()} spell power`,
      );
    }

    // Resistance bonuses (MR/PR/FR/CR/DR)
    const resistFields: [string | null, string][] = [
      [skill.magic_resist_bonus, "MR"],
      [skill.poison_resist_bonus, "PR"],
      [skill.fire_resist_bonus, "FR"],
      [skill.cold_resist_bonus, "CR"],
      [skill.disease_resist_bonus, "DR"],
    ];
    for (const [field, label] of resistFields) {
      const val = parseLinearBase(field);
      if (val !== null && val !== 0) {
        parts.push(
          `${val > 0 ? "+" : ""}${Math.abs(val).toLocaleString()} ${label}`,
        );
      }
    }

    // HoT / DoT (healing per second)
    const hps = parseLinearBase(skill.healing_per_second_bonus);
    if (hps !== null && hps !== 0) {
      parts.push(
        hps > 0
          ? `${hps.toLocaleString()} HP/s`
          : `${Math.abs(hps).toLocaleString()} dmg/s`,
      );
    }

    // HP % per second (regen)
    const hpPct = parseLinearBase(skill.health_percent_per_second_bonus);
    if (hpPct !== null && hpPct !== 0) {
      parts.push(`${formatPercent(hpPct)} HP/s`);
    }

    // Mana drain/regen (flat per second)
    const mps = parseLinearBase(skill.mana_per_second_bonus);
    if (mps !== null && mps !== 0) {
      parts.push(
        mps > 0
          ? `${mps.toLocaleString()} mana/s`
          : `${Math.abs(mps).toLocaleString()} mana drain/s`,
      );
    }

    // Mana % per second (drain/regen)
    const manaPct = parseLinearBase(skill.mana_percent_per_second_bonus);
    if (manaPct !== null && manaPct !== 0) {
      parts.push(`${formatPercent(manaPct)} mana/s`);
    }

    // Damage shield
    const dmgShield = parseLinearBase(skill.damage_shield);
    if (dmgShield !== null && dmgShield > 0) {
      parts.push(`${dmgShield.toLocaleString()} dmg shield`);
    }

    // Debuff type tags (if no specific stat shown)
    if (parts.length === 0) {
      if (skill.is_poison_debuff) parts.push("Poison DoT");
      else if (skill.is_fire_debuff) parts.push("Fire DoT");
      else if (skill.is_cold_debuff) parts.push("Cold DoT");
      else if (skill.is_disease_debuff) parts.push("Disease DoT");
      else if (skill.is_melee_debuff) parts.push("Melee debuff");
      else if (skill.is_magic_debuff) parts.push("Magic debuff");
    }

    // Cleanse resistance (for debuffs)
    if (skill.prob_ignore_cleanse > 0) {
      parts.push(`${formatPercent(skill.prob_ignore_cleanse)} cleanse resist`);
    }

    // Add duration if present
    if (skill.duration_base > 0 && parts.length > 0) {
      return `${parts.join(", ")}, ${skill.duration_base}s`;
    }

    return parts.join(", ");
  }

  // Format a skill's key effect as a concise summary string
  function formatSkillEffect(skill: MonsterSkill): string {
    const parts: string[] = [];

    // Handle damage (including edge case: damage_percent without base damage)
    const skillDmg = parseLinearBase(skill.damage);
    const damagePercent = parseLinearBase(skill.damage_percent);

    if (
      (skillDmg !== null && skillDmg > 0) ||
      (damagePercent !== null && damagePercent > 0)
    ) {
      // Calculate combined damage: monster combat stat + skill damage
      let combatStat = 0;
      if (
        skill.damage_type === "Magic" ||
        skill.damage_type === "Fire" ||
        skill.damage_type === "Cold" ||
        skill.damage_type === "Disease"
      ) {
        combatStat = data.monster.magic_damage;
      } else {
        combatStat = data.monster.damage;
      }

      let totalDmg = combatStat + (skillDmg ?? 0);

      // Apply damage_percent multiplier if present
      if (damagePercent !== null && damagePercent > 0) {
        totalDmg = Math.round(totalDmg * damagePercent);
      }

      const typeLabel =
        skill.damage_type && skill.damage_type !== "Normal"
          ? ` ${skill.damage_type}`
          : "";
      parts.push(`${totalDmg.toLocaleString()}${typeLabel} dmg`);
    }

    // AoE properties (appended after damage)
    if (skill.affects_random_target) {
      parts.push("random target");
    }
    if (skill.area_objects_to_spawn > 0) {
      const sizeInfo =
        skill.area_object_size > 0 ? `, size ${skill.area_object_size}` : "";
      parts.push(`${skill.area_objects_to_spawn} zones${sizeInfo}`);
    }

    const heal = parseLinearBase(skill.heals_health);
    if (heal !== null && heal > 0) {
      parts.push(`Heals ${heal.toLocaleString()} HP`);
    }

    const lifetap = parseLinearBase(skill.lifetap_percent);
    if (lifetap !== null && lifetap > 0) {
      parts.push(`${formatPercent(lifetap)} Lifetap`);
    }

    if (skill.break_armor_prob > 0) {
      parts.push(`${formatPercent(skill.break_armor_prob)} Break Armor`);
    }

    const stun = parseLinearBase(skill.stun_chance);
    if (stun !== null && stun > 0) {
      const stunDur = parseLinearBase(skill.stun_time);
      const durSuffix = stunDur !== null && stunDur > 0 ? ` (${stunDur}s)` : "";
      parts.push(`${formatPercent(stun)} Stun${durSuffix}`);
    }

    const fear = parseLinearBase(skill.fear_chance);
    if (fear !== null && fear > 0) {
      const fearDur = parseLinearBase(skill.fear_time);
      const durSuffix = fearDur !== null && fearDur > 0 ? ` (${fearDur}s)` : "";
      parts.push(`${formatPercent(fear)} Fear${durSuffix}`);
    }

    const knockback = parseLinearBase(skill.knockback_chance);
    if (knockback !== null && knockback > 0) {
      parts.push(`${formatPercent(knockback)} Knockback`);
    }

    // Handle summon_monsters skill type (both teleport and actual summoning)
    if (skill.skill_type === "summon_monsters") {
      // Teleport mode: summon_count_per_cast == 0 (e.g., "Summon Player")
      if (skill.summon_count_per_cast === 0) {
        parts.push("Teleports target to self, 2s stun");
      }
      // Normal summon mode
      else if (skill.summoned_monster_id) {
        const name = skill.summoned_monster_name || skill.summoned_monster_id;
        const count =
          skill.summon_count_per_cast !== null &&
          skill.summon_count_per_cast > 0
            ? `${skill.summon_count_per_cast}x `
            : "";
        const details: string[] = [];
        if (skill.summoned_monster_level !== null) {
          details.push(`Lv${skill.summoned_monster_level}`);
        }
        if (skill.max_active_summons !== null) {
          details.push(`max ${skill.max_active_summons}`);
        }
        const suffix = details.length > 0 ? ` (${details.join(", ")})` : "";
        parts.push(`Summons ${count}${name}${suffix}`);
      }
    }

    // Handle passive skills
    if (skill.skill_type === "passive") {
      if (skill.is_enrage) {
        parts.push("+50-100% dmg below 25% HP");
      } else {
        parts.push("Passive stat bonuses");
      }
    }

    // Handle buff/debuff skills (if no damage/heal/summon already shown)
    if (
      parts.length === 0 &&
      (skill.skill_type === "area_buff" ||
        skill.skill_type === "area_debuff" ||
        skill.skill_type === "target_buff" ||
        skill.skill_type === "target_debuff")
    ) {
      const buffEffect = formatBuffDebuffEffect(skill);
      if (buffEffect) {
        parts.push(buffEffect);
      }
    }

    return parts.join(", ") || skill.skill_type.replace(/_/g, " ");
  }

  // Skill columns for the abilities table
  const skillColumns: ColumnDef<MonsterSkill>[] = [
    {
      accessorKey: "name",
      header: "Skill",
      enableSorting: false,
    },
    {
      accessorKey: "skill_type",
      header: "Type",
      enableSorting: false,
    },
    {
      id: "effect",
      header: "Effect",
      accessorFn: (row) => formatSkillEffect(row),
      enableSorting: false,
    },
    {
      id: "cooldown",
      header: "Cooldown",
      accessorFn: (row) => parseLinearBase(row.cooldown) ?? 0,
      enableSorting: false,
    },
    {
      id: "cast_time",
      header: "Cast Time",
      accessorFn: (row) => parseLinearBase(row.cast_time) ?? 0,
      enableSorting: false,
    },
  ];

  // Special combat abilities
  const abilities = $derived(
    [
      { flag: data.monster.see_invisibility, label: "Sees Invisibility" },
      { flag: data.monster.is_immune_debuffs, label: "Immune to Debuffs" },
      { flag: data.monster.yell_friends, label: "Calls for Help" },
      { flag: data.monster.flee_on_low_hp, label: "Flees on Low HP" },
      { flag: data.monster.has_aura, label: "Has Aura" },
      { flag: data.monster.no_aggro_monster, label: "Non-Aggressive" },
    ].filter((a) => a.flag),
  );

  // Check for any non-zero resistances (always use display values now)
  const resistances = $derived(
    [
      { name: "Magic", value: displayMagicResist },
      { name: "Poison", value: displayPoisonResist },
      { name: "Fire", value: displayFireResist },
      { name: "Cold", value: displayColdResist },
      { name: "Disease", value: displayDiseaseResist },
    ].filter((r) => r.value !== 0),
  );

  // Check if any drop has a note
  const hasDropNotes = $derived(data.drops.some((d) => d.note));

  // Drop columns (bestiary column only for bosses/elites, note column if any drops have notes)
  const dropColumns = $derived.by(() => {
    const cols: ColumnDef<MonsterDrop>[] = [];

    if (data.monster.is_boss || data.monster.is_elite) {
      cols.push({
        accessorKey: "is_bestiary",
        header: "",
        size: 50,
        enableSorting: true,
      });
    }

    cols.push({
      accessorKey: "item_name",
      header: "Item",
      minSize: 350,
    });

    if (hasDropNotes) {
      cols.push({
        accessorKey: "note",
        header: "Note",
        size: 230,
      });
    }

    cols.push(
      {
        accessorKey: "rate",
        header: "Drop Rate",
        size: 140,
      },
      {
        accessorKey: "quality",
        header: "Quality",
        enableHiding: false,
      },
    );

    return cols;
  });

  // Check if we should show the level column (when there's level variance)
  const showLevelColumn = $derived(
    data.monster.level_min !== data.monster.level_max,
  );

  // Spawn location columns (dynamic based on monster properties)
  const spawnColumns = $derived.by(() => {
    const cols: ColumnDef<MonsterSpawnZone>[] = [
      {
        accessorKey: "zone_name",
        header: "Zone",
        minSize: 180,
      },
    ];

    if (showLevelColumn) {
      cols.push(
        {
          accessorKey: "level_min",
          header: "Min Lv",
          size: 120,
        },
        {
          accessorKey: "level_max",
          header: "Max Lv",
          size: 120,
        },
      );
    }

    if (showRespawnColumn) {
      cols.push({
        id: "respawn",
        header: "Respawn",
        size: 120,
      });
    }

    if (showChanceColumn) {
      cols.push({
        id: "chance",
        header: "Chance",
        size: 120,
      });
    }

    if (showActiveColumn) {
      cols.push({
        id: "active",
        header: "Active",
        size: 150,
      });
    }

    cols.push({
      accessorKey: "spawn_count",
      header: "Spawns",
      size: 120,
    });

    return cols;
  });

  // Check if any quests have flags (for conditional column)
  const hasQuestFlags = $derived(
    data.quests.some(
      (q) =>
        q.is_main_quest ||
        q.is_epic_quest ||
        q.is_adventurer_quest ||
        q.is_repeatable,
    ),
  );

  // Quest columns: Type > Flags > Name > Level > Objective
  const questColumns = $derived.by(() => {
    const cols: ColumnDef<MonsterQuest>[] = [
      {
        id: "type",
        header: "Type",
        size: 100,
        accessorFn: (row) => row.display_type,
      },
    ];

    if (hasQuestFlags) {
      cols.push({
        id: "flags",
        header: "Flags",
        size: 130,
        enableSorting: false,
        accessorFn: (row) => {
          const flags: string[] = [];
          if (row.is_main_quest) flags.push("Main");
          if (row.is_epic_quest) flags.push("Epic");
          if (row.is_adventurer_quest) flags.push("Daily");
          if (row.is_repeatable) flags.push("Repeatable");
          return flags.join(" ");
        },
      });
    }

    cols.push(
      {
        accessorKey: "name",
        header: "Name",
        minSize: 220,
      },
      {
        accessorKey: "level_recommended",
        header: "Level",
        size: 100,
      },
      {
        id: "objective",
        header: "Objective",
        minSize: 220,
        accessorFn: (row) => row.amount,
      },
    );

    return cols;
  });
</script>

{#snippet renderDropCell({
  cell,
  row,
}: {
  cell: Cell<MonsterDrop, unknown>;
  row: Row<MonsterDrop>;
})}
  {#if cell.column.id === "is_bestiary"}
    {#if row.original.is_bestiary}
      <BookOpen class="h-4 w-4 text-amber-500" />
    {/if}
  {:else if cell.column.id === "item_name"}
    <ItemLink
      itemId={row.original.item_id}
      itemName={row.original.item_name}
      tooltipHtml={row.original.tooltip_html}
    />
  {:else if cell.column.id === "note"}
    <span class="text-muted-foreground">{row.original.note ?? ""}</span>
  {:else if cell.column.id === "rate"}
    <span class="ml-auto">{formatPercent(row.original.rate)}</span>
  {:else if cell.column.id === "quality"}
    <!-- Hidden column used for sorting -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderDropHeader({
  header,
}: {
  header: Header<MonsterDrop, unknown>;
})}
  {#if header.id === "rate"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderSpawnCell({
  cell,
  row,
}: {
  cell: Cell<MonsterSpawnZone, unknown>;
  row: Row<MonsterSpawnZone>;
})}
  {#if cell.column.id === "zone_name"}
    <a
      href="/zones/{row.original.zone_id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.zone_name}
    </a>{#if row.original.sub_zone_name}<span class="text-muted-foreground"
        >&nbsp;({row.original.sub_zone_name})</span
      >{/if}
  {:else if cell.column.id === "level_min"}
    <span class="ml-auto">{row.original.level_min}</span>
  {:else if cell.column.id === "level_max"}
    <span class="ml-auto">{row.original.level_max}</span>
  {:else if cell.column.id === "respawn"}
    <span class="ml-auto">{formatDuration(respawnTime)}</span>
  {:else if cell.column.id === "chance"}
    <span class="ml-auto"
      >{formatPercent(data.monster.respawn_probability)}</span
    >
  {:else if cell.column.id === "active"}
    <span class="ml-auto">
      {data.monster.spawn_time_start}:00-{data.monster.spawn_time_end}:00
    </span>
  {:else if cell.column.id === "spawn_count"}
    <span class="ml-auto">{row.original.spawn_count}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderSpawnHeader({
  header,
}: {
  header: Header<MonsterSpawnZone, unknown>;
})}
  {#if header.id === "level_min" || header.id === "level_max" || header.id === "respawn" || header.id === "chance" || header.id === "active" || header.id === "spawn_count"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderQuestCell({
  cell,
  row,
}: {
  cell: Cell<MonsterQuest, unknown>;
  row: Row<MonsterQuest>;
})}
  {#if cell.column.id === "type"}
    <QuestTypeBadge type={row.original.display_type} />
  {:else if cell.column.id === "flags"}
    <QuestFlagBadges quest={row.original} />
  {:else if cell.column.id === "name"}
    <a
      href="/quests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "level_recommended"}
    <span class="ml-auto">{row.original.level_recommended}</span>
  {:else if cell.column.id === "objective"}
    {#if row.original.display_type === "Kill"}
      <span
        >Kill{#if row.original.amount > 0}&nbsp;×{row.original
            .amount}{/if}</span
      >
    {:else if row.original.item_id && row.original.item_name}
      <span
        ><ItemLink
          itemId={row.original.item_id}
          itemName={row.original.item_name}
        />{#if row.original.amount > 0}&nbsp;×{row.original.amount}{/if}</span
      >
    {:else if row.original.amount > 0}
      <span>×{row.original.amount}</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderQuestHeader({
  header,
}: {
  header: Header<MonsterQuest, unknown>;
})}
  {#if header.id === "level_recommended"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderSkillCell({
  cell,
  row,
}: {
  cell: Cell<MonsterSkill, unknown>;
  row: Row<MonsterSkill>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/skills/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.name}
    </a>
    {#if row.original.skill_index === 0}
      <span class="ml-1 text-xs text-muted-foreground">(Default)</span>
    {/if}
  {:else if cell.column.id === "skill_type"}
    <span class="text-muted-foreground capitalize"
      >{String(cell.getValue()).replace(/_/g, " ")}</span
    >
  {:else if cell.column.id === "effect"}
    <span class="text-sm">{cell.getValue()}</span>
  {:else if cell.column.id === "cooldown"}
    {@const val = cell.getValue() as number}
    <span class="ml-auto">{val > 0 ? `${val}s` : ""}</span>
  {:else if cell.column.id === "cast_time"}
    {@const val = cell.getValue() as number}
    <span class="ml-auto">{val > 0 ? `${val}s` : ""}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderSkillHeader({
  header,
}: {
  header: Header<MonsterSkill, unknown>;
})}
  {#if header.id === "cooldown" || header.id === "cast_time"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

<svelte:head>
  <title>{data.monster.name} - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.description} />
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Monsters", href: "/monsters" },
      { label: data.monster.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{data.monster.name}</h1>
      <MapLink entityId={data.monster.id} entityType="monster" />
      {#if data.monster.is_fabled}
        <span
          class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
        >
          <Star class="mr-1 h-3 w-3" />
          Fabled
        </span>
      {/if}
      {#if data.monster.is_world_boss}
        <span
          class="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
        >
          World Boss
        </span>
      {:else if data.monster.is_boss}
        <span
          class="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
        >
          Boss
        </span>
      {/if}
      {#if data.monster.is_elite}
        <span
          class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Elite
        </span>
      {/if}
      {#if data.monster.is_hunt}
        <span
          class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        >
          Hunt
        </span>
      {/if}
      {#if data.monster.type_name}
        <span
          class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        >
          {data.monster.type_name}
        </span>
      {/if}
    </div>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      <span
        >Level {data.monster.level_min === data.monster.level_max
          ? data.monster.level_min
          : `${data.monster.level_min}-${data.monster.level_max}`}</span
      >
      {#if data.monster.class_name && data.monster.class_name !== data.monster.type_name}
        <span>Class: {data.monster.class_name}</span>
      {/if}
      {#if data.monster.base_exp > 0}
        <span>Base XP: {data.monster.base_exp.toLocaleString()}</span>
      {/if}
      {#if data.monster.improve_faction.length > 0 || data.monster.decrease_faction.length > 0}
        <span>
          On Kill:
          {#each data.monster.improve_faction as faction, i (faction)}
            {#if i > 0},
            {/if}<span class="text-green-600 dark:text-green-400"
              >+{faction}</span
            >
          {/each}
          {#each data.monster.decrease_faction as faction, i (faction)}
            {#if i > 0 || data.monster.improve_faction.length > 0},
            {/if}<span class="text-red-600 dark:text-red-400">-{faction}</span>
          {/each}
        </span>
      {/if}
    </div>
  </div>

  <!-- Spawns Section -->
  {#if hasAnySpawns}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Spawns
      </h2>

      <div class="space-y-4">
        <!-- World Spawns (regular + summon zones combined) -->
        {#if allSpawnZones.length > 0}
          <DataTable
            data={allSpawnZones}
            columns={spawnColumns}
            renderCell={renderSpawnCell}
            renderHeader={renderSpawnHeader}
            initialSorting={[{ id: "spawn_count", desc: true }]}
            urlKey="monster-{data.monster.id}-spawns"
            pageSize={10}
            zebraStripe={true}
            class="bg-muted/30"
          />
        {/if}

        <!-- Altar Events -->
        {#if data.spawns.altar.length > 0}
          <div class="space-y-2">
            {#each data.spawns.altar as altar (altar.altar_id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <div>
                  <span class="font-medium">{altar.altar_name}</span>
                  <span class="text-muted-foreground"> in </span>
                  <a
                    href="/zones/{altar.zone_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {altar.zone_name}
                  </a>
                </div>
                {#if altar.waves.length > 0}
                  <div class="text-sm text-muted-foreground mt-1">
                    {altar.waves.length === 1 ? "Wave" : "Waves"}: {altar.waves
                      .map((w) => w + 1)
                      .join(", ")}
                  </div>
                {/if}
                {#if altar.activation_item_id && altar.activation_item_name}
                  <div class="text-sm mt-1">
                    <span class="text-muted-foreground">Requires: </span>
                    <a
                      href="/items/{altar.activation_item_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {altar.activation_item_name}
                    </a>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Blocked Spawning (what blocks this monster from respawning) -->
        {#if data.spawns.summon.length > 0}
          <div class="space-y-2">
            {#each data.spawns.summon as summon (summon.zone_id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <span
                  >Blocked from respawning while {summon.kill_count > 1
                    ? `${summon.kill_count} `
                    : ""}</span
                >
                <a
                  href="/monsters/{summon.kill_monster_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >{summon.kill_monster_name}{summon.kill_count > 1
                    ? "s"
                    : ""}</a
                >
                <span>{summon.kill_count > 1 ? " are" : " is"} alive in </span>
                <a
                  href="/zones/{summon.zone_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {summon.zone_name}
                </a>{#if summon.sub_zone_name && summon.sub_zone_name.toLowerCase() !== summon.zone_name.toLowerCase()}<span
                    class="text-muted-foreground"
                    >&nbsp;({summon.sub_zone_name})</span
                  >{/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Blocks Spawning (what this monster being alive blocks) -->
        {#if data.summons.length > 0}
          <div class="space-y-2">
            {#each data.summons as summon (summon.summoned_monster_id + summon.zone_id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <span>Blocks </span>
                <a
                  href="/monsters/{summon.summoned_monster_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {summon.summoned_monster_name}
                </a>
                <span>
                  from respawning while {summon.kill_count > 1
                    ? `${summon.kill_count} are`
                    : "1 is"} alive in
                </span>
                <a
                  href="/zones/{summon.zone_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {summon.zone_name}
                </a>{#if summon.sub_zone_name && summon.sub_zone_name.toLowerCase() !== summon.zone_name.toLowerCase()}<span
                    class="text-muted-foreground"
                    >&nbsp;({summon.sub_zone_name})</span
                  >{/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Spawned On Death (how this monster spawns) -->
        {#if data.spawns.placeholder}
          <div class="bg-muted/30 rounded-md border p-3">
            <span>Appears after killing </span>
            <a
              href="/monsters/{data.spawns.placeholder.source_monster_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.spawns.placeholder.source_monster_name}
            </a>
            <span class="text-muted-foreground"> in </span>
            <a
              href="/zones/{data.spawns.placeholder.zone_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.spawns.placeholder.zone_name}
            </a>
            {#if data.spawns.placeholder.spawn_probability < 1}
              <span class="text-muted-foreground">
                ({formatPercent(data.spawns.placeholder.spawn_probability)} chance)
              </span>
            {/if}
          </div>
        {/if}

        <!-- On Death Spawns (what spawns when this monster dies) -->
        {#if hasSpawnsOnDeath}
          <div class="bg-muted/30 rounded-md border p-3">
            <span>Killing this spawns </span>
            <a
              href="/monsters/{data.monster.placeholder_monster_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.monster.placeholder_monster_name ||
                data.monster.placeholder_monster_id}
            </a>
            {#if data.monster.placeholder_spawn_probability > 0 && data.monster.placeholder_spawn_probability < 1}
              <span class="text-muted-foreground">
                ({formatPercent(data.monster.placeholder_spawn_probability)} chance)
              </span>
            {/if}
          </div>
        {/if}

        <!-- Renewal Sages (for world bosses) -->
        {#if data.renewalSages.length > 0}
          <div class="space-y-2">
            {#each data.renewalSages as sage (sage.id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <span>Reset by </span>
                <a
                  href="/npcs/{sage.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {sage.name}
                </a>
                {#if sage.zoneName}
                  <span> in </span>
                  <a
                    href="/zones/{sage.zoneId}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {sage.zoneName}
                  </a>
                {/if}
                {#if sage.cost > 0}
                  <span> for </span>
                  <span class="text-yellow-600 dark:text-yellow-400"
                    >{sage.cost.toLocaleString()}</span
                  >
                  <a
                    href="/items/adventurers_essence"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Adventurer's Essence
                  </a>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Combat Stats Section -->
  <section>
    <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
      <Sword class="h-5 w-5 text-red-500" />
      Combat Stats
    </h2>
    {#if hasLevelVariance}
      <div class="mb-4 bg-muted/30 rounded-md border p-4 js-only">
        <div class="flex flex-wrap items-center gap-4">
          <label for="monster-level" class="text-sm text-muted-foreground">
            Monster Level
          </label>
          <input
            id="monster-level"
            type="range"
            min={data.monster.level_min}
            max={data.monster.level_max}
            bind:value={monsterLevelInput}
            class="flex-1 max-w-xs"
          />
          <span class="text-sm font-medium w-8">{displayLevel}</span>
        </div>
      </div>
    {/if}
    <div class="bg-muted/30 rounded-md border p-4">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <div class="text-sm text-muted-foreground">Health</div>
          <div class="font-medium">
            {displayHealth.toLocaleString()}
          </div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Damage</div>
          <div class="font-medium">
            {displayDamage}
          </div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Magic Damage</div>
          <div class="font-medium">
            {displayMagicDamage}
          </div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Defense</div>
          <div class="font-medium">
            {displayDefense}
          </div>
        </div>
        {#if displayBlockChance > 0}
          <div>
            <div class="text-sm text-muted-foreground">Block Chance</div>
            <div class="font-medium">
              {formatPercent(displayBlockChance)}
            </div>
          </div>
        {/if}
        {#if displayCriticalChance > 0}
          <div>
            <div class="text-sm text-muted-foreground">Critical Chance</div>
            <div class="font-medium">
              {formatPercent(displayCriticalChance)}
            </div>
          </div>
        {/if}
        {#if displayAccuracy > 0}
          <div>
            <div class="text-sm text-muted-foreground">Accuracy</div>
            <div class="font-medium">
              {formatPercent(displayAccuracy)}
            </div>
          </div>
        {/if}
      </div>

      {#if resistances.length > 0 || abilities.length > 0}
        <div class="mt-4 pt-4 border-t flex flex-col md:flex-row gap-4">
          {#if resistances.length > 0}
            <div class="md:w-[500px] shrink-0">
              <div class="text-sm text-muted-foreground mb-2">Resistances</div>
              <div class="flex flex-wrap gap-2">
                {#each resistances as resist (resist.name)}
                  <span
                    class="inline-flex items-center rounded-md px-2 py-1 text-sm
                      {resist.value > 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
                  >
                    {resist.name}: {resist.value}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
          {#if abilities.length > 0}
            <div class="flex-1">
              <div class="text-sm text-muted-foreground mb-2">Special</div>
              <div class="flex flex-wrap gap-2">
                {#each abilities as ability (ability.label)}
                  <span
                    class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {ability.label}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <!-- Abilities Section -->
  {#if data.skills.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Zap class="h-5 w-5 text-purple-500" />
        Abilities ({data.skills.length})
      </h2>
      <DataTable
        data={data.skills}
        columns={skillColumns}
        renderCell={renderSkillCell}
        renderHeader={renderSkillHeader}
        initialSorting={[{ id: "name", desc: false }]}
        urlKey="monster-{data.monster.id}-skills"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Loot Section -->
  {#if (data.monster.gold_min !== null && data.monster.gold_max !== null && data.monster.gold_max > 0) || data.drops.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Loot
      </h2>

      {#if data.monster.gold_min !== null && data.monster.gold_max !== null && data.monster.gold_max > 0}
        <div class="mb-4 bg-muted/30 rounded-md border p-4">
          <div class="font-medium text-yellow-600 dark:text-yellow-400">
            {data.monster.gold_min.toLocaleString()} - {data.monster.gold_max.toLocaleString()}
            gold
            {#if data.monster.probability_drop_gold < 1}
              <span class="text-muted-foreground font-normal">
                ({formatPercent(data.monster.probability_drop_gold)} chance)
              </span>
            {/if}
          </div>
        </div>
      {/if}

      {#if data.drops.length > 0}
        <DataTable
          data={data.drops}
          columns={dropColumns}
          renderCell={renderDropCell}
          renderHeader={renderDropHeader}
          initialSorting={data.monster.is_boss || data.monster.is_elite
            ? [
                { id: "is_bestiary", desc: true },
                { id: "rate", desc: true },
                { id: "quality", desc: true },
                { id: "item_name", desc: false },
              ]
            : [
                { id: "rate", desc: true },
                { id: "quality", desc: true },
                { id: "item_name", desc: false },
              ]}
          urlKey="monster-{data.monster.id}-drops"
          pageSize={10}
          zebraStripe={true}
          class="bg-muted/30"
          initialColumnVisibility={{ quality: false }}
        />
      {/if}
    </section>
  {/if}

  <!-- Related Quests Section -->
  {#if data.quests.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Scroll class="h-5 w-5 text-orange-500" />
        Related Quests ({data.quests.length})
      </h2>
      <DataTable
        data={data.quests}
        columns={questColumns}
        renderCell={renderQuestCell}
        renderHeader={renderQuestHeader}
        initialSorting={[
          { id: "level_recommended", desc: false },
          { id: "name", desc: false },
        ]}
        urlKey="monster-{data.monster.id}-quests"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Lore Section -->
  {#if data.monster.lore_boss || data.monster.aggro_messages.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <BookOpen class="h-5 w-5 text-cyan-500" />
        Lore
      </h2>
      <div class="bg-muted/30 rounded-md border p-4 space-y-4">
        {#if data.monster.lore_boss}
          <p class="whitespace-pre-wrap">{data.monster.lore_boss}</p>
        {/if}
        {#if data.monster.aggro_messages.length > 0}
          <div class="space-y-1">
            {#each data.monster.aggro_messages as message, i (i)}
              <div class="italic text-muted-foreground">"{message}"</div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}
</div>
