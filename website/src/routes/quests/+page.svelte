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
  import PageSections from "$lib/components/PageSections.svelte";
  import * as Card from "$lib/components/ui/card";
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import ClassPills from "$lib/components/ClassPills.svelte";
  import { formatClassName } from "$lib/utils/classes";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import QuestFlagBadges from "$lib/components/QuestFlagBadges.svelte";
  import { QUEST_FLAG_CONFIG } from "$lib/utils/quests";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/quests",
      name: "Quests — Ancient Kingdoms Compendium",
      description: `Searchable database of ${data.quests.length.toLocaleString()} quests in Ancient Kingdoms.`,
      items: data.quests.map((quest) => ({
        name: quest.name,
        path: `/quests/${quest.id}`,
      })),
    }),
  );

  const PAGE_SIZE = 20;
  const sections = [
    { id: "how-quests-work", label: "Accepting and Completing Quests" },
    {
      id: "requirements-and-repeats",
      label: "Quest Requirements and Repeat Visits",
    },
  ];

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

  const dataWithVirtual = $derived(
    data.quests.map((q) => ({
      ...q,
      display_type_filter: q.display_type,
      flags_filter: [
        q.is_main_quest ? "main" : null,
        q.is_epic_quest ? "epic" : null,
        q.is_adventurer_quest ? "daily" : null,
        q.is_repeatable ? "repeatable" : null,
        isRegularQuest(q) ? "regular" : null,
      ].filter(Boolean) as string[],
    })),
  );

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
      id: "class",
      header: "Class",
      size: 220,
      enableSorting: false,
      accessorFn: (row) => row.class_requirements.join(", "),
      getUniqueValues: (row) => row.class_requirements,
      filterFn: (row, _columnId, filterValue: string[]) => {
        const classes = row.original.class_requirements;
        if (!filterValue || filterValue.length === 0) return true;
        return classes.some((c) => filterValue.includes(c));
      },
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
      getUniqueValues: (row) => row.flags_filter,
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
    <QuestTypeBadge type={row.original.display_type} />
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
    <QuestFlagBadges quest={row.original} />
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
        ...QUEST_FLAG_CONFIG.map((f) => ({ label: f.label, value: f.key })),
        { label: "Regular", value: "regular" },
      ]}
    />
  {/if}
  {#if classCol}
    <DataTableFacetedFilter
      column={classCol}
      title="Class"
      options={uniqueClasses.map((c) => ({
        label: formatClassName(c),
        value: c,
      }))}
    />
  {/if}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level" />
  {/if}
{/snippet}

<Seo
  title="Quests - Ancient Kingdoms"
  description={`${data.quests.length.toLocaleString()} quests — main story, epic, adventurer, and repeatable. Browse objectives, level gates, rewards, and prerequisite chains.`}
  path="/quests"
/>

<JsonLd node={collectionNode} />

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Quests" }]} />

  <h1 class="text-3xl font-bold">Quests</h1>

  <PageSections {sections} />

  <Card.Root id="how-quests-work" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Accepting and Completing Quests</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-3 text-muted-foreground">
      <!-- Source: server-scripts/PlayerQuests.cs:295-309,322-349; server-scripts/KillQuest.cs:16-47 — kills and locations advance only quests already in the active quest list. -->
      <p>
        <span class="block"
          >Accept a quest before completing its kill or location objectives.</span
        >
        <span class="block">Earlier actions do not count.</span>
      </p>
      <!-- Source: server-scripts/GatherInventoryQuest.cs:15-54,57-85; server-scripts/GatherQuest.cs:21-26 — inventory objectives check carried items, while gather objectives record progress. -->
      <p>
        <span class="block"
          >Some item objectives check what you carry at turn-in.</span
        >
        <span class="block"
          >Others record gathering progress as it happens.</span
        >
      </p>
      <!-- Source: server-scripts/UINpcQuests.cs:170-174; server-scripts/UIQuests.cs:124-140; server-scripts/UIQuestTracking.cs:54 — the log permits 15 active quests, but tracking replaces the oldest of three. -->
      <p>
        <span class="block">You can have 15 active quests and track 3.</span>
        <span class="block"
          >Tracking a fourth replaces the oldest tracked quest without
          abandoning it.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerQuests.cs:363-392,445-468 — rewards follow NPC turn-in, while abandoning removes the quest record and progress. -->
      <p>
        <span class="block"
          >Completed objectives do not grant rewards until you turn the quest in
          at its NPC.</span
        >
        <span class="block">Abandoning removes its recorded progress.</span>
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="requirements-and-repeats" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Quest Requirements and Repeat Visits</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-3 text-muted-foreground">
      <!-- Source: server-scripts/ScriptableQuest.cs:32-51; server-scripts/PlayerQuests.cs:131-147,183-253 — acceptance checks level, faction value, race, class, and predecessors. -->
      <p>
        Quests can require a level, faction standing, race, class, or earlier
        quest.
      </p>
      <!-- Source: server-scripts/PlayerQuests.cs:236-253 — one completed quest from the predecessor array meets the chain requirement. -->
      <p>
        If a quest lists alternative predecessors, completing one is enough.
      </p>
      <!-- Source: server-scripts/PlayerQuests.cs:220-235 — ordinary repeatables reopen eight real hours after completion; Adventurer quests use 24 hours and the daily offer. -->
      <p>
        <span class="block">Repeatable quests reopen after 8 real hours.</span>
        <span class="block"
          ><a
            href="/professions/adventuring#how-it-works"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Adventurers' Guild assignments</a
          > follow a separate 24-hour completion rule and daily selection.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

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
