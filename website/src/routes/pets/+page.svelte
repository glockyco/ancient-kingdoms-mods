<script lang="ts">
  import {
    DataTable,
    DataTableFacetedFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import { IconBadge } from "$lib/components/ui/icon-badge";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { getClassConfig } from "$lib/utils/classes";
  import type { PetListView } from "$lib/types/pets";
  import User from "@lucide/svelte/icons/user";

  let { data } = $props();

  const uniqueKinds = $derived(
    Array.from(new Set(data.pets.map((p) => p.kind))).sort(),
  );

  const columnLabels: Record<string, string> = {
    summoned_by_class: "Summoned By",
    summoned_by_spell: "Spell",
    recruited_at: "Recruited At",
  };

  const columns: ColumnDef<PetListView>[] = [
    { accessorKey: "name", header: "Name", enableHiding: false },
    {
      accessorKey: "kind",
      header: "Kind",
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
    },
    { accessorKey: "type_monster", header: "Class" },
    { id: "summoned_by_class", header: "Summoned By", enableSorting: false },
    { id: "summoned_by_spell", header: "Spell", enableSorting: false },
    { id: "recruited_at", header: "Recruited At", enableSorting: false },
  ];
</script>

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<PetListView, unknown>;
  row: Row<PetListView>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/pets/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "summoned_by_class"}
    {#if row.original.summoning_class_id}
      {@const config = getClassConfig(row.original.summoning_class_id)}
      <a
        href="/classes/{row.original.summoning_class_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {config.name}
      </a>
    {:else}
      <span class="text-muted-foreground">—</span>
    {/if}
  {:else if cell.column.id === "summoned_by_spell"}
    {#if row.original.summoning_skill_id && row.original.summoning_skill_name}
      <a
        href="/skills/{row.original.summoning_skill_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.summoning_skill_name}
      </a>
    {:else}
      <span class="text-muted-foreground">—</span>
    {/if}
  {:else if cell.column.id === "recruited_at"}
    {#if row.original.recruiters.length > 0}
      {@const first = row.original.recruiters[0]}
      {@const rest = row.original.recruiters.length - 1}
      <div class="flex items-center gap-1 whitespace-nowrap">
        <IconBadge
          href="/npcs/{first.npc_id}"
          icon={User}
          iconClass="text-blue-500"
        >
          {first.npc_name}
        </IconBadge>
        {#if rest > 0}
          <span class="text-muted-foreground text-xs self-center">+{rest}</span>
        {/if}
      </div>
    {:else}
      <span class="text-muted-foreground">—</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<PetListView> })}
  {@const kindCol = table.getColumn("kind")}
  {#if kindCol}
    <DataTableFacetedFilter
      column={kindCol}
      title="Kind"
      options={uniqueKinds.map((k) => ({ label: k, value: k }))}
    />
  {/if}
{/snippet}

<Seo
  title="Pets - Ancient Kingdoms"
  description="Pets, familiars, and mercenaries — summoned companions and recruitable allies, with their skills, stats, and how to unlock each."
  path="/pets"
/>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Pets" }]} />

  <h1 class="text-3xl font-bold">Pets</h1>

  <DataTable
    data={data.pets}
    {columns}
    {columnLabels}
    {renderCell}
    {renderToolbar}
    pageSize={20}
    initialSorting={[
      { id: "kind", desc: false },
      { id: "name", desc: false },
    ]}
    urlKey="pets"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search pets..."
    class="bg-muted/30"
  />
</div>
