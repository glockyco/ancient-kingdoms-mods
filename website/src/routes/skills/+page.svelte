<script lang="ts">
  import { untrack } from "svelte";
  import {
    DataTable,
    DataTableFacetedFilter,
    DataTableRangeFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ClassPills from "$lib/components/ClassPills.svelte";
  import { SKILL_TYPE_INFO, CATEGORY_OPTIONS } from "$lib/constants/skills";
  import { ALL_CLASS_IDS, CLASS_CONFIG } from "$lib/utils/classes";
  import type { SkillListViewClient } from "$lib/types/skills";

  let { data } = $props();

  const PAGE_SIZE = 20;

  // Precomputed at build time -- capture without reactive tracking
  const { classKeys } = untrack(() => data);

  type SkillRow = SkillListViewClient;

  const columns: ColumnDef<SkillRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      minSize: 220,
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
      accessorKey: "max_level",
      header: "Max Lvl",
      size: 80,
    },
    {
      accessorKey: "level_required",
      header: "Req. Lvl",
      size: 80,
      filterFn: (
        row,
        columnId,
        filterValue: [number | null, number | null],
      ) => {
        const value = row.getValue(columnId) as number;
        if (!filterValue) return true;
        const [min, max] = filterValue;
        if (min === null && max === null) return true;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
        return true;
      },
    },
    {
      id: "classes",
      header: "Classes",
      size: 250,
      enableSorting: false,
      accessorFn: (row) => (classKeys[row.id] ?? []).join(", "),
      getUniqueValues: (row) => classKeys[row.id] ?? [],
      filterFn: (row, _columnId, filterValue: string[]) => {
        const classes = classKeys[row.original.id] ?? [];
        if (!filterValue || filterValue.length === 0) return true;
        return classes.some((c: string) => filterValue.includes(c));
      },
    },
    {
      id: "tags",
      header: "Tags",
      size: 200,
      enableSorting: false,
      accessorFn: (row) => row.tags.join(", "),
    },
    {
      accessorKey: "category",
      header: "Category",
      enableHiding: false,
      size: 0,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    name: "Name",
    skill_type: "Type",
    max_level: "Max Level",
    level_required: "Level Required",
    classes: "Classes",
    tags: "Tags",
    category: "Category",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<SkillRow, unknown> })}
  {#if header.id === "category"}
    <span></span>
  {:else if header.id === "max_level" || header.id === "level_required"}
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
    <a
      href="/skills/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "skill_type"}
    {@const typeInfo = SKILL_TYPE_INFO[row.original.skill_type]}
    <span>{typeInfo?.label ?? row.original.skill_type}</span>
  {:else if cell.column.id === "max_level" || cell.column.id === "level_required"}
    <span class="ml-auto">{cell.getValue()}</span>
  {:else if cell.column.id === "classes"}
    {@const classes = classKeys[row.original.id]}
    {#if classes && classes.length > 0}
      <ClassPills {classes} />
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "tags"}
    {@const tags = row.original.tags}
    {#if tags.length > 0}
      <div class="flex flex-wrap gap-1">
        {#each tags as tag (tag)}
          <span
            class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium"
            >{tag}</span
          >
        {/each}
      </div>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "category"}
    <!-- Hidden filter column -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<SkillRow> })}
  {@const skillTypeCol = table.getColumn("skill_type")}
  {@const classesCol = table.getColumn("classes")}
  {@const levelCol = table.getColumn("level_required")}
  {@const categoryCol = table.getColumn("category")}
  {#if skillTypeCol}
    <DataTableFacetedFilter
      column={skillTypeCol}
      title="Type"
      options={Object.entries(SKILL_TYPE_INFO).map(([value, info]) => ({
        label: info.label,
        value,
      }))}
    />
  {/if}
  {#if classesCol}
    <DataTableFacetedFilter
      column={classesCol}
      title="Class"
      options={ALL_CLASS_IDS.map((c) => ({
        label: CLASS_CONFIG[c].name,
        value: c,
      }))}
    />
  {/if}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level Required" />
  {/if}
  {#if categoryCol}
    <DataTableFacetedFilter
      column={categoryCol}
      title="Category"
      options={CATEGORY_OPTIONS}
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

  <h1 class="text-3xl font-bold">Skills ({data.skills.length})</h1>

  <DataTable
    data={data.skills}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[{ id: "name", desc: false }]}
    initialColumnVisibility={{
      category: false,
    }}
    initialColumnFilters={[{ id: "category", value: ["Class"] }]}
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
