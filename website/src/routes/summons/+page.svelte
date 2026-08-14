<script lang="ts">
  import {
    DataTable,
    DataTableFacetedFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import { getClassConfig } from "$lib/utils/classes";
  import type { SummonListView } from "$lib/types/pets";
  import PawPrint from "@lucide/svelte/icons/paw-print";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/summons",
      name: "Summons — Ancient Kingdoms Compendium",
      description: `Searchable database of ${data.summons.length.toLocaleString()} summonable companions and familiars in Ancient Kingdoms.`,
      items: data.summons.map((summon) => ({
        name: summon.name,
        path: `/summons/${summon.id}`,
      })),
    }),
  );

  const uniqueKinds = $derived(
    Array.from(new Set(data.summons.map((s) => s.kind))).sort(),
  );

  const columnLabels: Record<string, string> = {
    summoned_by_class: "Summoned By",
    summoned_by_spell: "Spell",
  };

  const columns: ColumnDef<SummonListView>[] = [
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
  ];
</script>

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<SummonListView, unknown>;
  row: Row<SummonListView>;
})}
  {#if cell.column.id === "name"}
    <EntityLink
      href="/summons/{row.original.id}"
      name={row.original.name}
      variant="reference"
      domain="pet"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={Boolean(row.original.visualAsset)}
      fallback={PawPrint}
      size={32}
      class="whitespace-nowrap"
    />
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
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<SummonListView> })}
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
  title="Summons - Ancient Kingdoms"
  description="Companions and familiars in Ancient Kingdoms — which class summons each one, the spell that calls it, and its skills and stats."
  path="/summons"
/>

<JsonLd node={collectionNode} />

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Summons" }]} />

  <h1 class="text-3xl font-bold">Summons</h1>

  <DataTable
    data={data.summons}
    {columns}
    {columnLabels}
    {renderCell}
    {renderToolbar}
    pageSize={20}
    initialSorting={[
      { id: "kind", desc: false },
      { id: "name", desc: false },
    ]}
    urlKey="summons"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search summons..."
    class="bg-muted/30"
  />
</div>
