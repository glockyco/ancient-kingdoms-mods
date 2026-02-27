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
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import { getClassConfig } from "$lib/utils/classes";

  let { data } = $props();

  const PAGE_SIZE = 20;

  const uniqueSkillTypes = $derived(
    Array.from(new Set(data.skills.map((s) => s.skill_type))).sort(),
  );

  const uniqueClasses = $derived(
    Array.from(new Set(data.skills.flatMap((s) => s.player_classes))).sort(),
  );

  const dataWithVirtual = $derived(
    data.skills.map((s) => ({
      ...s,
      class_ids: s.player_classes,
      skill_categories: [
        s.is_spell ? "spell" : null,
        s.is_veteran ? "veteran" : null,
        s.is_mercenary_skill ? "targets_mercenaries" : null,
        s.is_pet_skill ? "targets_pet" : null,
        s.used_by_mercenaries ? "used_by_mercenaries" : null,
        s.used_by_pets ? "used_by_pets" : null,
      ].filter(Boolean) as string[],
    })),
  );

  type SkillRow = (typeof dataWithVirtual)[number];

  const columns: ColumnDef<SkillRow>[] = [
    {
      accessorKey: "name",
      header: "Skill",
      enableHiding: false,
    },
    {
      accessorKey: "skill_type",
      header: "Type",
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
    },
    {
      id: "effect",
      accessorKey: "effect",
      header: "Effect",
      enableSorting: false,
    },
    // Hidden filter-only columns
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
      id: "skill_categories",
      accessorKey: "skill_categories",
      header: "Skill Categories",
      enableHiding: false,
      getUniqueValues: (row) => row.skill_categories,
      filterFn: (row, columnId, filterValue: string[]) => {
        const cats = row.getValue(columnId) as string[];
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.some((f) => cats.includes(f));
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    name: "Skill",
    skill_type: "Type",
    effect: "Effect",
    class_ids: "Class Filter",
    skill_categories: "Skill Categories",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<SkillRow, unknown> })}
  {#if header.id === "class_ids" || header.id === "skill_categories"}
    <span></span>
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
    <a
      href="/skills/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "skill_type"}
    <span class="text-muted-foreground capitalize"
      >{String(cell.getValue()).replace(/_/g, " ")}</span
    >
  {:else if cell.column.id === "effect"}
    {@const s = row.original}
    {#if s.skill_type === "summon" && s.pet_id}
      {@const count =
        s.summon_count_per_cast && s.summon_count_per_cast > 1
          ? `${s.summon_count_per_cast}x `
          : ""}
      {@const details = [
        s.summoned_monster_level != null
          ? `lv${s.summoned_monster_level}`
          : null,
        s.max_active_summons != null ? `max ${s.max_active_summons}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      <span class="text-sm"
        >summons {count}<a
          href="/pets/{s.pet_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{s.pet_name}</a
        >{details ? ` (${details})` : ""}</span
      >
    {:else if s.skill_type === "summon_monsters" && s.summoned_monster_id && s.summon_count_per_cast !== 0}
      {@const count =
        s.summon_count_per_cast && s.summon_count_per_cast > 1
          ? `${s.summon_count_per_cast}x `
          : ""}
      {@const details = [
        s.summoned_monster_level != null
          ? `lv${s.summoned_monster_level}`
          : null,
        s.max_active_summons != null ? `max ${s.max_active_summons}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      <span class="text-sm"
        >summons {count}<a
          href="/monsters/{s.summoned_monster_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{s.summoned_monster_name ?? s.summoned_monster_id}</a
        >{details ? ` (${details})` : ""}</span
      >
    {:else}
      <span class="text-sm">{s.effect}</span>
    {/if}
  {:else if cell.column.id === "class_ids" || cell.column.id === "skill_categories"}
    <!-- Hidden filter columns -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<SkillRow> })}
  {@const typeCol = table.getColumn("skill_type")}
  {@const classIdsCol = table.getColumn("class_ids")}
  {@const skillCategoriesCol = table.getColumn("skill_categories")}
  {#if typeCol}
    <DataTableFacetedFilter
      column={typeCol}
      title="Type"
      options={uniqueSkillTypes.map((t) => ({
        label: t
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase()),
        value: t,
      }))}
    />
  {/if}
  {#if classIdsCol}
    <DataTableFacetedFilter
      column={classIdsCol}
      title="Class"
      options={uniqueClasses.map((c) => ({
        label: getClassConfig(c).name,
        value: c,
      }))}
    />
  {/if}
  {#if skillCategoriesCol}
    <DataTableFacetedFilter
      column={skillCategoriesCol}
      title="Flags"
      options={[
        { label: "Spell", value: "spell" },
        { label: "Veteran", value: "veteran" },
        { label: "Targets Mercenaries", value: "targets_mercenaries" },
        { label: "Targets Pet", value: "targets_pet" },
        { label: "Used by Mercenaries", value: "used_by_mercenaries" },
        { label: "Used by Pets", value: "used_by_pets" },
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
    initialSorting={[{ id: "name", desc: false }]}
    initialColumnVisibility={{
      class_ids: false,
      skill_categories: false,
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
