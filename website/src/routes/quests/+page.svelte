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
  import * as Card from "$lib/components/ui/card";
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import ClassPills from "$lib/components/ClassPills.svelte";
  import { formatClassName } from "$lib/utils/classes";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import GuideFacts from "$lib/components/GuideFacts.svelte";
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
      header: "Categories",
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
    flags: "Categories",
    class: "Class",
    quest_giver: "Quest Giver",
    display_type_filter: "Type Filter",
    flags_filter: "Categories Filter",
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
      title="Categories"
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

  <Card.Root id="how-quests-work" class="bg-muted/30">
    <Card.Header>
      <Card.Title class="text-xl">How quests work</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-6">
      <!-- Source: server-scripts/UINpcQuests.cs:170-174; server-scripts/UIQuests.cs:124-140 — 15 active quests, 3 tracked. server-scripts/PlayerQuests.cs:220-235,41-60,445-446; server-scripts/Utils.cs:601-630 — repeatables reopen after 8 hours, guild assignments after 24 hours. -->
      <GuideFacts
        facts={[
          { value: "15", label: "Active quests at once" },
          { value: "3", label: "Tracked on screen" },
          { value: "8 h", label: "Repeatable quest cooldown (real time)" },
          { value: "24 h", label: "Guild assignment cooldown (real time)" },
        ]}
      />

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted-foreground">
            <tr class="border-b">
              <th class="py-2 pr-4 font-medium">Type</th>
              <th class="py-2 pr-4 font-medium">What counts</th>
              <th class="py-2 font-medium">At turn-in</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <!-- Source: server-scripts/PlayerQuests.cs:295-309,322-349; server-scripts/KillQuest.cs:16-47 — kill and location progress advances only for accepted quests. -->
            <tr>
              <td class="py-2 pr-4"><QuestTypeBadge type="Kill" /></td>
              <td class="py-2 pr-4">Kills after you accept the quest</td>
              <td class="py-2 text-muted-foreground">Nothing is taken</td>
            </tr>
            <tr>
              <td class="py-2 pr-4"><QuestTypeBadge type="Discover" /></td>
              <td class="py-2 pr-4">Reaching the place after you accept</td>
              <td class="py-2 text-muted-foreground">Nothing is taken</td>
            </tr>
            <!-- Source: server-scripts/PlayerQuests.cs:333-349; server-scripts/LocationQuest.cs:13-26 — Find quests start fulfilled on acceptance. -->
            <tr>
              <td class="py-2 pr-4"><QuestTypeBadge type="Find" /></td>
              <td class="py-2 pr-4">Done as soon as you accept</td>
              <td class="py-2 text-muted-foreground"
                >Talk to the completion NPC</td
              >
            </tr>
            <!-- Source: server-scripts/GatherQuest.cs:21-26,63-74; server-scripts/PlayerQuests.cs:100-108 — Gather quests record items collected after acceptance. -->
            <tr>
              <td class="py-2 pr-4"><QuestTypeBadge type="Gather" /></td>
              <td class="py-2 pr-4">Items you gather after you accept</td>
              <td class="py-2 text-muted-foreground"
                >You need not keep the items</td
              >
            </tr>
            <!-- Source: server-scripts/GatherInventoryQuest.cs:15-96 — Have checks current items without removal; Deliver removes them. -->
            <tr>
              <td class="py-2 pr-4"><QuestTypeBadge type="Have" /></td>
              <td class="py-2 pr-4"
                >Items, keys, or equipped items you hold, even from before</td
              >
              <td class="py-2 text-muted-foreground">You keep the items</td>
            </tr>
            <tr>
              <td class="py-2 pr-4"><QuestTypeBadge type="Deliver" /></td>
              <td class="py-2 pr-4">Items you hold, even from before</td>
              <td class="py-2 text-muted-foreground"
                >The items are taken. An equipped required item is taken if
                inventory has too few. Keys stay.</td
              >
            </tr>
            <!-- Source: server-scripts/EquipItemQuest.cs:9-19 — fulfilled while every listed item is equipped. -->
            <tr>
              <td class="py-2 pr-4"><QuestTypeBadge type="Equip" /></td>
              <td class="py-2 pr-4">Every listed item equipped at once</td>
              <td class="py-2 text-muted-foreground">You keep the items</td>
            </tr>
            <!-- Source: server-scripts/AlchemyQuest.cs:13-16; server-scripts/Player.cs:13297-13312 — brewing a matching potion advances only active, incomplete quests, and the quest is fulfilled at the target count. -->
            <tr>
              <td class="py-2 pr-4"><QuestTypeBadge type="Brew" /></td>
              <td class="py-2 pr-4">Potions you brew after you accept</td>
              <td class="py-2 text-muted-foreground">Nothing is taken</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <!-- Source: server-scripts/PlayerQuests.cs:236-253 — any one completed predecessor meets the prerequisite. -->
        <li>
          If a quest lists several prerequisites, any one of them is enough.
        </li>
        <li>
          Tracking a fourth quest untracks the oldest one. It stays active.
        </li>
        <!-- Source: server-scripts/PlayerQuests.cs:463-469 — abandoning removes the quest record, including its progress. -->
        <li>Abandoning a quest deletes its progress.</li>
        <li>
          <a
            href="/professions/adventuring#how-it-works"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Adventurers' Guild assignments</a
          > change each UTC day.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
</div>
