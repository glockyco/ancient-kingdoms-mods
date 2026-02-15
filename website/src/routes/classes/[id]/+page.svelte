<script lang="ts">
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
  import ItemLink from "$lib/components/ItemLink.svelte";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import QuestFlagBadges from "$lib/components/QuestFlagBadges.svelte";
  import {
    SOURCE_TYPE_CONFIG,
    type ItemSourceType,
  } from "$lib/constants/source-types";
  import {
    getClassConfig,
    getRaceDisplayName,
    getResourceDisplayName,
    ALL_CLASS_IDS,
  } from "$lib/utils/classes";
  import { QUALITY_NAMES } from "$lib/constants/quality";
  import { getQualityTextColorClass } from "$lib/utils/format";
  import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
  import { getItemTooltips } from "$lib/queries/items";
  import type {
    ClassSkill,
    ClassItem,
    ClassQuest,
  } from "$lib/queries/classes.server";
  import Zap from "@lucide/svelte/icons/zap";
  import Gem from "@lucide/svelte/icons/gem";
  import Scroll from "@lucide/svelte/icons/scroll";

  let { data } = $props();

  // Parse compatible races from JSON string (sorted alphabetically)
  const races = $derived(
    (JSON.parse(data.class.compatible_races) as string[])
      .map(getRaceDisplayName)
      .sort(),
  );

  // Sorted class IDs for sibling nav (alphabetical)
  const sortedClassIds = [...ALL_CLASS_IDS].sort();

  function getDifficultyLabel(difficulty: number): string {
    if (difficulty === 1) return "Easy";
    if (difficulty === 2) return "Medium";
    return "Hard";
  }

  function getDifficultyColor(difficulty: number): string {
    if (difficulty === 1) return "text-green-600 dark:text-green-400";
    if (difficulty === 2) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  // --- Tooltip loading (async, client-side) ---
  let tooltips = $state<Map<string, string>>(new Map());
  let tooltipFetchController: AbortController | null = null;

  async function fetchTooltipsForRows(
    visibleRows: ClassItem[],
    adjacentRows: ClassItem[],
  ) {
    tooltipFetchController?.abort();
    tooltipFetchController = new AbortController();
    const signal = tooltipFetchController.signal;

    const allIds = [...visibleRows, ...adjacentRows].map((r) => r.id);
    const uniqueIds = [...new Set(allIds)];
    const missingIds = uniqueIds.filter((id) => !tooltips.has(id));

    if (missingIds.length === 0) return;

    try {
      const newTooltips = await getItemTooltips(missingIds);
      if (signal.aborted) return;
      tooltips = new Map([...tooltips, ...newTooltips]);
    } catch {
      // DB not loaded yet on initial page load
    }
  }

  function handleVisibleRowsChange(
    visibleRows: ClassItem[],
    adjacentRows: ClassItem[],
  ) {
    fetchTooltipsForRows(visibleRows, adjacentRows);
  }

  // --- Quality display ---
  const qualities = QUALITY_NAMES.map((name, value) => ({ name, value }));

  // --- Skills Table ---

  // Tier exclusion limits from game rules (PlayerSkills.cs)
  const TIER_MAX_PICKS: Record<number, number> = { 1: 2, 2: 1, 3: 2, 4: 1 };

  // Count available skills per tier for this class (for annotations)
  const tierSkillCounts = $derived(
    (() => {
      const counts: Record<number, number> = {};
      for (const skill of data.skills) {
        if (skill.tier > 0 && !skill.base_skill && !skill.is_veteran) {
          counts[skill.tier] = (counts[skill.tier] ?? 0) + 1;
        }
      }
      return counts;
    })(),
  );

  function getSkillCategoryKey(skill: ClassSkill): string {
    if (skill.base_skill) return "Base";
    if (skill.is_veteran) return "Veteran";
    if (skill.tier === 0) return "Core";
    return `Tier ${skill.tier}`;
  }

  function getSkillCategoryDisplay(skill: ClassSkill): string {
    const key = getSkillCategoryKey(skill);
    if (skill.tier > 0 && !skill.base_skill && !skill.is_veteran) {
      const maxPicks = TIER_MAX_PICKS[skill.tier];
      const available = tierSkillCounts[skill.tier] ?? 0;
      if (maxPicks && available > 0) {
        return `${key} (${maxPicks} of ${available})`;
      }
    }
    return key;
  }

  // Unique skill types for filter
  const uniqueSkillTypes = $derived(
    Array.from(new Set(data.skills.map((s) => s.skill_type))).sort(),
  );

  // Unique categories for filter (in logical order, using keys without annotations)
  const uniqueSkillCategories = $derived(
    (() => {
      const cats = new Set(data.skills.map(getSkillCategoryKey));
      const order = [
        "Base",
        "Core",
        "Tier 1",
        "Tier 2",
        "Tier 3",
        "Tier 4",
        "Veteran",
      ];
      return order.filter((c) => cats.has(c));
    })(),
  );

  const skillColumns: ColumnDef<ClassSkill>[] = [
    { accessorKey: "name", header: "Skill" },
    {
      id: "category",
      header: "Category",
      accessorFn: (row) => getSkillCategoryKey(row),
      sortingFn: (rowA, rowB) => {
        // Sort by: Base=0, Core=1, Tier 1=2, Tier 2=3, Tier 3=4, Tier 4=5, Veteran=6
        function categoryOrder(skill: ClassSkill): number {
          if (skill.base_skill) return 0;
          if (skill.is_veteran) return 6;
          if (skill.tier === 0) return 1;
          return skill.tier + 1;
        }
        const a = categoryOrder(rowA.original);
        const b = categoryOrder(rowB.original);
        return a - b;
      },
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(getSkillCategoryKey(row.original));
      },
    },
    {
      accessorKey: "required_spent_points",
      header: "Req Points",
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
      header: "Effect",
      enableSorting: false,
      accessorFn: (row) => formatSkillEffect(row),
    },
  ];

  // --- Items Table ---

  // Unique slots for filter
  const uniqueSlots = $derived(
    Array.from(
      new Set(data.items.map((i) => i.slot).filter(Boolean)),
    ).sort() as string[],
  );

  const itemColumns: ColumnDef<ClassItem>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "item_level", header: "Item Level" },
    {
      accessorKey: "level_required",
      header: "Level",
      filterFn: (
        row,
        columnId,
        filterValue: [number | null, number | null],
      ) => {
        const value = row.getValue(columnId) as number | null;
        if (!filterValue) return true;
        const [min, max] = filterValue;
        if (min === null && max === null) return true;
        if (value === null || value === 0) return min === null || min === 0;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
        return true;
      },
    },
    {
      accessorKey: "slot",
      header: "Slot",
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string | null;
        if (!filterValue || filterValue.length === 0) return true;
        return value != null && filterValue.includes(value);
      },
    },
    {
      id: "sources",
      header: "Sources",
      enableSorting: false,
      accessorFn: (row) => row.sources.length,
    },
    {
      id: "min_source_level",
      header: "Source Level",
      accessorFn: (row) => row.min_source_level,
      filterFn: (
        row,
        _columnId,
        filterValue: [number | null, number | null],
      ) => {
        const value = row.original.min_source_level;
        if (!filterValue) return true;
        const [min, max] = filterValue;
        if (min === null && max === null) return true;
        if (value === null) return true;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
        return true;
      },
    },
    // Hidden — for filtering only
    {
      id: "quality",
      header: "Quality",
      enableHiding: false,
      accessorFn: (row) => row.quality,
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(String(row.original.quality));
      },
    },
  ];

  // --- Quests Table ---

  // Unique quest types for filter
  const uniqueQuestTypes = $derived(
    Array.from(new Set(data.quests.map((q) => q.display_type))).sort(),
  );

  const hasQuestFlags = $derived(
    data.quests.some(
      (q) =>
        q.is_main_quest ||
        q.is_epic_quest ||
        q.is_adventurer_quest ||
        q.is_repeatable,
    ),
  );

  const questColumns = $derived.by(() => {
    const cols: ColumnDef<ClassQuest>[] = [
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => row.display_type,
        filterFn: (row, _columnId, filterValue: string[]) => {
          if (!filterValue || filterValue.length === 0) return true;
          return filterValue.includes(row.original.display_type);
        },
      },
    ];

    if (hasQuestFlags) {
      cols.push({
        id: "flags",
        header: "Flags",
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
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "level_required",
        header: "Req Lvl",
        filterFn: (
          row,
          columnId,
          filterValue: [number | null, number | null],
        ) => {
          const value = row.getValue(columnId) as number | null;
          if (!filterValue) return true;
          const [min, max] = filterValue;
          if (min === null && max === null) return true;
          if (value === null || value === 0) return min === null || min === 0;
          if (min !== null && value < min) return false;
          if (max !== null && value > max) return false;
          return true;
        },
      },
      { accessorKey: "level_recommended", header: "Rec Lvl" },
    );

    return cols;
  });

  // --- Source display helpers ---

  function getSourceTypeCounts(
    sources: ClassItem["sources"],
  ): [string, number][] {
    const counts: Record<string, number> = {};
    for (const s of sources) {
      counts[s.type] = (counts[s.type] ?? 0) + 1;
    }
    return Object.entries(counts);
  }

  function getDistinctTypeCount(sources: ClassItem["sources"]): number {
    const types: Record<string, boolean> = {};
    for (const s of sources) {
      types[s.type] = true;
    }
    return Object.keys(types).length;
  }
</script>

{#snippet renderSkillCell({
  cell,
  row,
}: {
  cell: Cell<ClassSkill, unknown>;
  row: Row<ClassSkill>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/skills/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "category"}
    <span class="text-muted-foreground"
      >{getSkillCategoryDisplay(row.original)}</span
    >
  {:else if cell.column.id === "required_spent_points"}
    <span class="ml-auto">
      {#if row.original.required_spent_points}
        {row.original.required_spent_points}
      {:else}
        <span class="text-muted-foreground">—</span>
      {/if}
    </span>
  {:else if cell.column.id === "skill_type"}
    <span class="text-muted-foreground capitalize"
      >{String(cell.getValue()).replace(/_/g, " ")}</span
    >
  {:else if cell.column.id === "effect"}
    <span class="text-sm">{cell.getValue()}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderSkillHeader({
  header,
}: {
  header: Header<ClassSkill, unknown>;
})}
  {#if header.id === "required_spent_points"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderSkillToolbar({ table }: { table: TanstackTable<ClassSkill> })}
  {@const categoryCol = table.getColumn("category")}
  {@const typeCol = table.getColumn("skill_type")}
  {#if categoryCol}
    <DataTableFacetedFilter
      column={categoryCol}
      title="Category"
      options={uniqueSkillCategories.map((c) => ({ label: c, value: c }))}
    />
  {/if}
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
{/snippet}

{#snippet renderItemCell({
  cell,
  row,
}: {
  cell: Cell<ClassItem, unknown>;
  row: Row<ClassItem>;
})}
  {#if cell.column.id === "name"}
    <ItemLink
      itemId={row.original.id}
      itemName={row.original.name}
      tooltipHtml={tooltips.get(row.original.id)}
      colorClass={getQualityTextColorClass(row.original.quality)}
      class="whitespace-nowrap"
    />
  {:else if cell.column.id === "sources"}
    {@const sources = row.original.sources}
    {#if sources.length === 0}
      <span class="text-muted-foreground">—</span>
    {:else if sources.length === 1}
      {@const source = sources[0]}
      {@const sourceConfig = SOURCE_TYPE_CONFIG[source.type as ItemSourceType]}
      {#if sourceConfig}
        <div class="flex items-center gap-1.5">
          <sourceConfig.icon class="h-4 w-4 shrink-0 {sourceConfig.color}" />
          <a
            href="{sourceConfig.linkPrefix}{source.id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {source.name}
          </a>
        </div>
      {/if}
    {:else if getDistinctTypeCount(sources) === 1}
      {@const source = sources[0]}
      {@const sourceConfig = SOURCE_TYPE_CONFIG[source.type as ItemSourceType]}
      {#if sourceConfig}
        <div class="flex items-center gap-1.5">
          <sourceConfig.icon class="h-4 w-4 shrink-0 {sourceConfig.color}" />
          <a
            href="{sourceConfig.linkPrefix}{source.id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {source.name}
          </a>
          <a
            href="/items/{row.original.id}"
            class="text-muted-foreground hover:underline text-xs"
          >
            +{sources.length - 1} more
          </a>
        </div>
      {/if}
    {:else}
      {@const typeCounts = getSourceTypeCounts(sources)}
      <div class="flex items-center gap-2 flex-wrap">
        {#each [...typeCounts] as [type, count] (type)}
          {@const sourceConfig = SOURCE_TYPE_CONFIG[type as ItemSourceType]}
          {#if sourceConfig}
            <span class="flex items-center gap-0.5 text-sm">
              <sourceConfig.icon
                class="h-4 w-4 shrink-0 {sourceConfig.color}"
              />
              <span class="text-muted-foreground">×{count}</span>
            </span>
          {/if}
        {/each}
      </div>
    {/if}
  {:else if cell.column.id === "item_level"}
    <span class="ml-auto">
      {#if row.original.item_level}
        {row.original.item_level}
      {:else}
        <span class="text-muted-foreground">—</span>
      {/if}
    </span>
  {:else if cell.column.id === "level_required"}
    <span class="ml-auto">
      {#if row.original.level_required}
        {row.original.level_required}
      {:else}
        <span class="text-muted-foreground">—</span>
      {/if}
    </span>
  {:else if cell.column.id === "min_source_level"}
    <span class="ml-auto">
      {#if row.original.min_source_level !== null}
        {row.original.min_source_level}
      {:else}
        <span class="text-muted-foreground">—</span>
      {/if}
    </span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderItemHeader({ header }: { header: Header<ClassItem, unknown> })}
  {#if header.id === "item_level" || header.id === "level_required" || header.id === "min_source_level"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderItemToolbar({ table }: { table: TanstackTable<ClassItem> })}
  {@const qualityCol = table.getColumn("quality")}
  {@const levelCol = table.getColumn("level_required")}
  {@const slotCol = table.getColumn("slot")}
  {#if qualityCol}
    <DataTableFacetedFilter
      column={qualityCol}
      title="Quality"
      options={qualities.map((q) => ({
        label: q.name,
        value: String(q.value),
      }))}
    />
  {/if}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level" />
  {/if}
  {#if slotCol}
    <DataTableFacetedFilter
      column={slotCol}
      title="Slot"
      options={uniqueSlots.map((s) => ({ label: s, value: s }))}
    />
  {/if}
  {@const srcLevelCol = table.getColumn("min_source_level")}
  {#if srcLevelCol}
    <DataTableRangeFilter column={srcLevelCol} title="Source Level" />
  {/if}
{/snippet}

{#snippet renderQuestCell({
  cell,
  row,
}: {
  cell: Cell<ClassQuest, unknown>;
  row: Row<ClassQuest>;
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
  {:else if cell.column.id === "level_required" || cell.column.id === "level_recommended"}
    <span class="ml-auto">{cell.getValue()}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderQuestHeader({
  header,
}: {
  header: Header<ClassQuest, unknown>;
})}
  {#if header.id === "level_required" || header.id === "level_recommended"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderQuestToolbar({ table }: { table: TanstackTable<ClassQuest> })}
  {@const typeCol = table.getColumn("type")}
  {@const levelCol = table.getColumn("level_required")}
  {#if typeCol}
    <DataTableFacetedFilter
      column={typeCol}
      title="Type"
      options={uniqueQuestTypes.map((t) => ({ label: t, value: t }))}
    />
  {/if}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level" />
  {/if}
{/snippet}

<svelte:head>
  <title>{data.class.name} - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.class.description} />
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Classes", href: "/classes" },
      { label: data.class.name },
    ]}
  />

  <!-- Identity Header -->
  <div>
    <h1 class="text-3xl font-bold">{data.class.name}</h1>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      <span>
        Roles:
        <span class="text-foreground">
          {data.class.primary_role}{#if data.class.secondary_role}, {data.class
              .secondary_role}{/if}
        </span>
      </span>
      <span>
        Difficulty:
        <span class="font-medium {getDifficultyColor(data.class.difficulty)}">
          {getDifficultyLabel(data.class.difficulty)}
        </span>
      </span>
      <span>
        Resource:
        <span class="font-medium text-foreground">
          {getResourceDisplayName(data.class.resource_type)}
        </span>
      </span>
      <span>
        Races: <span class="text-foreground">{races.join(", ")}</span>
      </span>
    </div>

    <p class="mt-4 text-muted-foreground leading-relaxed">
      {data.class.description}
    </p>
  </div>

  <!-- Sibling Navigation Bar -->
  <nav class="flex flex-wrap gap-2" aria-label="Class navigation">
    {#each sortedClassIds as classId (classId)}
      {@const classConfig = getClassConfig(classId)}
      {@const isCurrent = classId === data.class.id}
      {#if isCurrent}
        <span
          class="rounded-md px-3 py-1.5 text-sm font-medium bg-accent text-accent-foreground"
          aria-current="page"
        >
          {classConfig.name}
        </span>
      {:else}
        <a
          href="/classes/{classId}"
          class="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {classConfig.name}
        </a>
      {/if}
    {/each}
  </nav>

  <!-- Equipment & Weapons Section -->
  {#if data.items.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Armor & Weapons ({data.items.length})
      </h2>

      <DataTable
        data={data.items}
        columns={itemColumns}
        renderCell={renderItemCell}
        renderHeader={renderItemHeader}
        renderToolbar={renderItemToolbar}
        initialSorting={[
          { id: "item_level", desc: false },
          { id: "name", desc: false },
        ]}
        initialColumnVisibility={{ quality: false }}
        urlKey="class-{data.class.id}-items"
        pageSize={10}
        zebraStripe={true}
        showSearch={true}
        searchPlaceholder="Search items..."
        paginateStaticHtml={true}
        persistentScrollbar={true}
        class="bg-muted/30"
        onVisibleRowsChange={handleVisibleRowsChange}
      />
    </section>
  {/if}

  <!-- Skills Section -->
  {#if data.skills.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Zap class="h-5 w-5 text-purple-500" />
        Skills ({data.skills.length})
      </h2>

      <DataTable
        data={data.skills}
        columns={skillColumns}
        renderCell={renderSkillCell}
        renderHeader={renderSkillHeader}
        renderToolbar={renderSkillToolbar}
        initialSorting={[
          { id: "category", desc: false },
          { id: "required_spent_points", desc: false },
          { id: "name", desc: false },
        ]}
        urlKey="class-{data.class.id}-skills"
        pageSize={10}
        zebraStripe={true}
        showSearch={true}
        searchPlaceholder="Search skills..."
        paginateStaticHtml={true}
        persistentScrollbar={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Quests Section -->
  {#if data.quests.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Scroll class="h-5 w-5 text-orange-500" />
        Quests ({data.quests.length})
      </h2>

      <DataTable
        data={data.quests}
        columns={questColumns}
        renderCell={renderQuestCell}
        renderHeader={renderQuestHeader}
        renderToolbar={renderQuestToolbar}
        initialSorting={[
          { id: "level_required", desc: false },
          { id: "name", desc: false },
        ]}
        urlKey="class-{data.class.id}-quests"
        pageSize={10}
        zebraStripe={true}
        showSearch={true}
        searchPlaceholder="Search quests..."
        paginateStaticHtml={true}
        class="bg-muted/30"
      />
    </section>
  {/if}
</div>
