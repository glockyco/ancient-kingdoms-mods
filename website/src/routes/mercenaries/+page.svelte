<script lang="ts">
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
  } from "$lib/components/ui/data-table";
  import { IconBadge } from "$lib/components/ui/icon-badge";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import type { MercenaryListView } from "$lib/types/pets";
  import User from "@lucide/svelte/icons/user";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/mercenaries",
      name: "Mercenaries — Ancient Kingdoms Compendium",
      description: `Searchable database of ${data.mercenaries.length.toLocaleString()} hireable mercenaries in Ancient Kingdoms.`,
      items: data.mercenaries.map((mercenary) => ({
        name: mercenary.name,
        path: `/mercenaries/${mercenary.id}`,
      })),
    }),
  );

  const columnLabels: Record<string, string> = {
    recruited_at: "Recruited At",
  };

  const columns: ColumnDef<MercenaryListView>[] = [
    { accessorKey: "name", header: "Name", enableHiding: false },
    { accessorKey: "type_monster", header: "Class" },
    { id: "recruited_at", header: "Recruited At", enableSorting: false },
  ];
</script>

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<MercenaryListView, unknown>;
  row: Row<MercenaryListView>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/mercenaries/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
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

<Seo
  title="Mercenaries - Ancient Kingdoms"
  description="Every hireable mercenary in Ancient Kingdoms — class, skills, stats, and the recruiters who sell them."
  path="/mercenaries"
/>

<JsonLd node={collectionNode} />

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb
    items={[{ label: "Home", href: "/" }, { label: "Mercenaries" }]}
  />

  <h1 class="text-3xl font-bold">Mercenaries</h1>

  <DataTable
    data={data.mercenaries}
    {columns}
    {columnLabels}
    {renderCell}
    pageSize={20}
    initialSorting={[{ id: "name", desc: false }]}
    urlKey="mercenaries"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search mercenaries..."
    class="bg-muted/30"
  />
</div>
