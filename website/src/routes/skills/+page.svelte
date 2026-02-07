<script lang="ts">
  import {
    DataTable,
    DataTableFacetedFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import { Alert } from "$lib/components/ui/alert";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import Zap from "@lucide/svelte/icons/zap";
  import Shield from "@lucide/svelte/icons/shield";
  import Swords from "@lucide/svelte/icons/swords";
  import Heart from "@lucide/svelte/icons/heart";
  import type { Component } from "svelte";

  let { data } = $props();

  const PAGE_SIZE = 20;

  // Class display names and colors
  const CLASS_INFO: Record<string, { label: string; color: string }> = {
    warrior: { label: "Warrior", color: "text-red-500" },
    ranger: { label: "Ranger", color: "text-green-500" },
    cleric: { label: "Cleric", color: "text-yellow-500" },
    rogue: { label: "Rogue", color: "text-purple-500" },
    wizard: { label: "Wizard", color: "text-blue-500" },
    druid: { label: "Druid", color: "text-emerald-500" },
  };

  // Skill type categories for display
  const SKILL_TYPE_INFO: Record<
    string,
    { label: string; icon: Component; color: string }
  > = {
    target_damage: {
      label: "Target Damage",
      icon: Swords,
      color: "text-red-500",
    },
    area_damage: { label: "Area Damage", icon: Swords, color: "text-red-500" },
    frontal_damage: {
      label: "Frontal Damage",
      icon: Swords,
      color: "text-red-500",
    },
    target_projectile: {
      label: "Projectile",
      icon: Zap,
      color: "text-orange-500",
    },
    frontal_projectiles: {
      label: "Frontal Projectiles",
      icon: Zap,
      color: "text-orange-500",
    },
    target_heal: { label: "Target Heal", icon: Heart, color: "text-green-500" },
    area_heal: { label: "Area Heal", icon: Heart, color: "text-green-500" },
    target_buff: { label: "Target Buff", icon: Shield, color: "text-blue-500" },
    area_buff: { label: "Area Buff", icon: Shield, color: "text-blue-500" },
    target_debuff: {
      label: "Target Debuff",
      icon: Shield,
      color: "text-purple-500",
    },
    area_debuff: {
      label: "Area Debuff",
      icon: Shield,
      color: "text-purple-500",
    },
    passive: { label: "Passive", icon: Sparkles, color: "text-gray-500" },
    summon: { label: "Summon", icon: Sparkles, color: "text-cyan-500" },
    summon_monsters: {
      label: "Summon Monsters",
      icon: Sparkles,
      color: "text-cyan-500",
    },
    area_object_spawn: {
      label: "Area Object",
      icon: Sparkles,
      color: "text-cyan-500",
    },
  };

  // Get unique skill types for filter
  const uniqueSkillTypes = $derived(
    Array.from(new Set(data.skills.map((s) => s.skill_type))).sort(),
  );

  // Get unique classes for filter
  const uniqueClasses = $derived(
    Array.from(new Set(data.skills.flatMap((s) => s.player_classes))).sort(),
  );

  // Add virtual columns for filtering
  const dataWithVirtual = $derived(
    data.skills.map((s) => ({
      ...s,
      class_ids: s.player_classes,
      flags: [
        s.is_spell ? "spell" : null,
        s.is_veteran ? "veteran" : null,
        s.is_pet_skill ? "pet" : null,
        s.is_mercenary_skill ? "mercenary" : null,
      ].filter(Boolean) as string[],
    })),
  );

  type SkillRow = (typeof dataWithVirtual)[number];

  const columns: ColumnDef<SkillRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      minSize: 200,
    },
    {
      accessorKey: "skill_type",
      header: "Type",
      size: 180,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
    },
    {
      accessorKey: "tier",
      header: "Tier",
      size: 80,
    },
    {
      accessorKey: "max_level",
      header: "Max Lvl",
      size: 100,
    },
    {
      accessorKey: "level_required",
      header: "Req Lvl",
      size: 100,
    },
    {
      id: "classes",
      header: "Classes",
      size: 200,
      accessorFn: (row) => row.player_classes.join(", "),
    },
    {
      id: "class_ids",
      accessorKey: "class_ids",
      header: "Class Filter",
      enableHiding: false,
      getUniqueValues: (row) => row.class_ids,
      filterFn: (row, columnId, filterValue: string[]) => {
        const classIds = row.getValue(columnId) as string[];
        if (!filterValue || filterValue.length === 0) return true;
        return classIds.some((c) => filterValue.includes(c));
      },
    },
    {
      id: "flags",
      accessorKey: "flags",
      header: "Flags",
      enableHiding: false,
      getUniqueValues: (row) => row.flags,
      filterFn: (row, columnId, filterValue: string[]) => {
        const flags = row.getValue(columnId) as string[];
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.some((f) => flags.includes(f));
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    name: "Name",
    skill_type: "Type",
    tier: "Tier",
    max_level: "Max Level",
    level_required: "Required Level",
    classes: "Classes",
    class_ids: "Class Filter",
    flags: "Flags",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<SkillRow, unknown> })}
  {#if header.id === "class_ids" || header.id === "flags"}
    <span></span>
  {:else if header.id === "tier" || header.id === "max_level" || header.id === "level_required"}
    <span class="ml-auto">{columnLabels[header.id] ?? header.id}</span>
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<SkillRow, unknown>;
  row: Row<SkillRow>;
})}
  {#if cell.column.id === "name"}
    <div class="flex items-center gap-2">
      <a
        href="/skills/{row.original.id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.name}
      </a>
      {#if row.original.is_veteran}
        <span
          class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300"
          >Vet</span
        >
      {/if}
      {#if row.original.is_pet_skill}
        <span
          class="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300"
          >Pet</span
        >
      {/if}
      {#if row.original.is_mercenary_skill}
        <span
          class="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300"
          >Merc</span
        >
      {/if}
    </div>
  {:else if cell.column.id === "skill_type"}
    {@const typeInfo = SKILL_TYPE_INFO[row.original.skill_type]}
    {#if typeInfo}
      {@const Icon = typeInfo.icon}
      <div class="flex items-center gap-1.5">
        <Icon class="h-4 w-4 {typeInfo.color}" />
        <span>{typeInfo.label}</span>
      </div>
    {:else}
      {row.original.skill_type}
    {/if}
  {:else if cell.column.id === "tier" || cell.column.id === "max_level" || cell.column.id === "level_required"}
    <span class="ml-auto">{cell.getValue()}</span>
  {:else if cell.column.id === "classes"}
    {@const classes = row.original.player_classes}
    {#if classes.length > 0}
      <div class="flex flex-wrap gap-1">
        {#each classes as cls (cls)}
          {@const classInfo = CLASS_INFO[cls]}
          {#if classInfo}
            <span class="text-xs {classInfo.color}">{classInfo.label}</span>
          {:else}
            <span class="text-xs">{cls}</span>
          {/if}
        {/each}
      </div>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "class_ids" || cell.column.id === "flags"}
    <!-- Hidden filter columns -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<SkillRow> })}
  {@const skillTypeCol = table.getColumn("skill_type")}
  {@const classIdsCol = table.getColumn("class_ids")}
  {@const flagsCol = table.getColumn("flags")}
  {#if skillTypeCol}
    <DataTableFacetedFilter
      column={skillTypeCol}
      title="Type"
      options={uniqueSkillTypes.map((t) => ({
        label: SKILL_TYPE_INFO[t]?.label ?? t,
        value: t,
      }))}
    />
  {/if}
  {#if classIdsCol}
    <DataTableFacetedFilter
      column={classIdsCol}
      title="Class"
      options={uniqueClasses.map((c) => ({
        label: CLASS_INFO[c]?.label ?? c,
        value: c,
      }))}
    />
  {/if}
  {#if flagsCol}
    <DataTableFacetedFilter
      column={flagsCol}
      title="Flags"
      options={[
        { label: "Spell", value: "spell" },
        { label: "Veteran", value: "veteran" },
        { label: "Stance", value: "stance" },
        { label: "Pet", value: "pet" },
        { label: "Mercenary", value: "mercenary" },
      ]}
    />
  {/if}
{/snippet}

<svelte:head>
  <title>Skills - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Complete skill database for Ancient Kingdoms - abilities, spells, and passives for all classes."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Skills" }]} />

  <Alert variant="info">
    <CircleAlert />
    <span
      >This page is a work in progress. Some information may be incomplete or
      change.</span
    >
  </Alert>

  <h1 class="text-3xl font-bold flex items-center gap-3">
    <Sparkles class="h-8 w-8 text-blue-500" />
    Skills ({data.skills.length})
  </h1>

  <DataTable
    data={dataWithVirtual}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[
      { id: "tier", desc: false },
      { id: "name", desc: false },
    ]}
    initialColumnVisibility={{
      class_ids: false,
      flags: false,
    }}
    urlKey="skills"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search skills..."
    class="bg-muted/30"
  />
</div>
