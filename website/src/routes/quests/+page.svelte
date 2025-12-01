<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
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

  let { data } = $props();

  const PAGE_SIZE = 20;

  // Display type styling (display_type is pre-computed in denormalization)
  const displayTypeStyles: Record<string, string> = {
    Kill: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    Gather: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Deliver:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    Have: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Find: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Discover:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    Equip:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    Brew: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  };

  function getDisplayTypeStyle(displayType: string): string {
    return (
      displayTypeStyles[displayType] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    );
  }

  // Get unique display types from data for filter options
  const uniqueDisplayTypes = $derived(
    Array.from(new Set(data.quests.map((q) => q.display_type))).sort(),
  );

  // Get unique classes for filter
  const uniqueClasses = $derived(
    Array.from(
      new Set(data.quests.flatMap((q) => q.class_requirements)),
    ).sort(),
  );

  // Add virtual columns for filtering
  const isRegularQuest = (q: (typeof data.quests)[number]) =>
    !q.is_main_quest && !q.is_epic_quest && !q.is_adventurer_quest;

  const dataWithVirtual = data.quests.map((q) => ({
    ...q,
    display_type_filter: q.display_type,
    flags_filter: [
      q.is_main_quest ? "main" : null,
      q.is_epic_quest ? "epic" : null,
      q.is_adventurer_quest ? "daily" : null,
      isRegularQuest(q) ? "regular" : null,
    ].filter(Boolean) as string[],
  }));

  type QuestRow = (typeof dataWithVirtual)[number];

  const columns: ColumnDef<QuestRow>[] = [
    {
      accessorKey: "display_type",
      header: "Type",
      size: 100,
    },
    {
      id: "flags",
      header: "Flags",
      size: 100,
      enableSorting: false,
      accessorFn: (row) => {
        const flags: string[] = [];
        if (row.is_main_quest) flags.push("Main");
        if (row.is_epic_quest) flags.push("Epic");
        if (row.is_adventurer_quest) flags.push("Daily");
        return flags.join(" ");
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      minSize: 270,
    },
    {
      id: "quest_giver",
      header: "Quest Giver",
      size: 220,
      accessorFn: (row) => row.quest_giver_name || "",
    },
    {
      accessorKey: "level_required",
      header: "Req. Level",
      size: 140,
      filterFn: (
        row,
        _columnId,
        filterValue: [number | null, number | null],
      ) => {
        // Filter matches if quest level range overlaps with filter range
        const reqLevel = row.original.level_required || 0;
        const recLevel = row.original.level_recommended || reqLevel;
        if (!filterValue) return true;
        const [filterMin, filterMax] = filterValue;
        if (filterMin === null && filterMax === null) return true;

        // Quest range: [reqLevel, recLevel]
        // Filter range: [filterMin, filterMax]
        // Ranges overlap if: questMin <= filterMax AND questMax >= filterMin
        const questMin = Math.min(reqLevel, recLevel);
        const questMax = Math.max(reqLevel, recLevel);

        if (filterMax !== null && questMin > filterMax) return false;
        if (filterMin !== null && questMax < filterMin) return false;
        return true;
      },
    },
    {
      accessorKey: "level_recommended",
      header: "Rec. Level",
      size: 140,
    },
    {
      id: "class",
      header: "Class",
      size: 220,
      enableSorting: false,
      accessorFn: (row) => row.class_requirements.join(", "),
      filterFn: (row, _columnId, filterValue: string[]) => {
        const classes = row.original.class_requirements;
        if (!filterValue || filterValue.length === 0) return true;
        return classes.some((c) => filterValue.includes(c));
      },
    },
    {
      id: "display_type_filter",
      accessorKey: "display_type_filter",
      header: "Type Filter",
      enableHiding: false,
      filterFn: (row, columnId, filterValue: string[]) => {
        const type = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(type);
      },
    },
    {
      id: "flags_filter",
      accessorKey: "flags_filter",
      header: "Flags Filter",
      enableHiding: false,
      filterFn: (row, columnId, filterValue: string[]) => {
        const flags = row.getValue(columnId) as string[];
        if (!filterValue || filterValue.length === 0) return true;
        return flags.some((f) => filterValue.includes(f));
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    name: "Name",
    display_type: "Type",
    level_required: "Req. Level",
    level_recommended: "Rec. Level",
    flags: "Flags",
    class: "Class",
    quest_giver: "Quest Giver",
    display_type_filter: "Type Filter",
    flags_filter: "Flags Filter",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<QuestRow, unknown> })}
  {#if header.id === "display_type_filter" || header.id === "flags_filter"}
    <span></span>
  {:else if header.id === "level_required" || header.id === "level_recommended"}
    <span class="ml-auto">{columnLabels[header.id] ?? header.id}</span>
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<QuestRow, unknown>;
  row: Row<QuestRow>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/quests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "display_type"}
    <span
      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {getDisplayTypeStyle(
        row.original.display_type,
      )}"
    >
      {row.original.display_type}
    </span>
  {:else if cell.column.id === "level_required"}
    <span class="ml-auto"
      >{row.original.level_required > 0
        ? row.original.level_required
        : "-"}</span
    >
  {:else if cell.column.id === "level_recommended"}
    <span class="ml-auto"
      >{row.original.level_recommended > 0
        ? row.original.level_recommended
        : "-"}</span
    >
  {:else if cell.column.id === "flags"}
    <div class="flex flex-wrap gap-1">
      {#if row.original.is_main_quest}
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        >
          Main
        </span>
      {/if}
      {#if row.original.is_epic_quest}
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Epic
        </span>
      {/if}
      {#if row.original.is_adventurer_quest}
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        >
          Daily
        </span>
      {/if}
    </div>
  {:else if cell.column.id === "class"}
    <ClassPills
      classes={row.original.class_requirements.map((c) => c.toLowerCase())}
    />
  {:else if cell.column.id === "quest_giver"}
    {#if row.original.quest_giver_id}
      <a
        href="/npcs/{row.original.quest_giver_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
      >
        {row.original.quest_giver_name}
      </a>
      {#if row.original.quest_giver_count > 1}
        <span class="text-muted-foreground ml-1"
          >+{row.original.quest_giver_count - 1}</span
        >
      {/if}
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "display_type_filter" || cell.column.id === "flags_filter"}
    <!-- Hidden filter columns -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<QuestRow> })}
  {@const typeCol = table.getColumn("display_type_filter")}
  {@const flagsCol = table.getColumn("flags_filter")}
  {@const classCol = table.getColumn("class")}
  {@const levelCol = table.getColumn("level_required")}
  {@const flagsCountsFiltered = (() => {
    const counts = new SvelteMap<string, number>();
    // Use getFacetedRowModel() to get rows filtered by everything EXCEPT the flags filter
    const facetedRows = flagsCol?.getFacetedRowModel()?.rows ?? [];
    for (const row of facetedRows) {
      for (const flag of row.original.flags_filter) {
        counts.set(flag, (counts.get(flag) ?? 0) + 1);
      }
    }
    return counts;
  })()}
  {@const classCountsFiltered = (() => {
    const counts = new SvelteMap<string, number>();
    // Use getFacetedRowModel() to get rows filtered by everything EXCEPT the class filter
    const facetedRows = classCol?.getFacetedRowModel()?.rows ?? [];
    for (const row of facetedRows) {
      for (const cls of row.original.class_requirements) {
        counts.set(cls, (counts.get(cls) ?? 0) + 1);
      }
    }
    return counts;
  })()}
  {#if typeCol}
    <DataTableFacetedFilter
      column={typeCol}
      title="Type"
      options={uniqueDisplayTypes.map((t) => ({
        label: t,
        value: t,
      }))}
    />
  {/if}
  {#if flagsCol}
    <DataTableFacetedFilter
      column={flagsCol}
      title="Flags"
      options={[
        { label: "Main Quest", value: "main" },
        { label: "Epic", value: "epic" },
        { label: "Daily", value: "daily" },
        { label: "Regular", value: "regular" },
      ]}
      counts={flagsCountsFiltered}
    />
  {/if}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level" />
  {/if}
  {#if classCol}
    <DataTableFacetedFilter
      column={classCol}
      title="Class"
      options={uniqueClasses.map((c) => ({
        label: c,
        value: c,
      }))}
      counts={classCountsFiltered}
    />
  {/if}
{/snippet}

<svelte:head>
  <title>Quests - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Browse all quests in Ancient Kingdoms. Filter by type, level, and quest flags. View kill quests, gather quests, and main story quests."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Quests" }]} />

  <h1 class="text-3xl font-bold">Quests</h1>

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
      display_type_filter: false,
      flags_filter: false,
    }}
    urlKey="quests"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search quests..."
    class="bg-muted/30"
  />
</div>
