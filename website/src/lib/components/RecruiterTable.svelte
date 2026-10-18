<script lang="ts">
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
  } from "$lib/components/ui/data-table";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import type { PetRecruiter } from "$lib/types/pets";
  import { classCanBe } from "$lib/utils/merc-stats";
  import Users from "@lucide/svelte/icons/users";

  interface Props {
    recruiters: PetRecruiter[];
    urlKey: string;
    /**
     * The mercenary class the table is for. With a class, the race column
     * shows the race that class gets from each recruiter. Without one, it
     * shows each recruiter's preference.
     */
    cls?: string;
  }

  let { recruiters, urlKey, cls }: Props = $props();

  const columns = $derived<ColumnDef<PetRecruiter>[]>([
    { accessorKey: "npc_name", header: "Recruiter" },
    {
      accessorKey: "preferred_race",
      header: cls ? "Race Hired" : "Preferred Race",
    },
    { accessorKey: "zone_name", header: "Zone" },
    { id: "map", header: "Map", size: 80, enableSorting: false },
  ]);
</script>

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<PetRecruiter, unknown>;
  row: Row<PetRecruiter>;
})}
  {#if cell.column.id === "npc_name"}
    <EntityLink
      href="/npcs/{row.original.npc_id}"
      name={row.original.npc_name}
      domain="npc"
      entityId={row.original.npc_id}
      imageKind="primary"
      imageAvailable={row.original.visual_public_path}
      variant="reference"
      fallback={Users}
      size={28}
    />
  {:else if cell.column.id === "preferred_race"}
    <!-- Source: server-scripts/Utils.cs:GetRandomChar — a preference the class cannot use falls back to a uniform class-pool roll. -->
    {#if cls}
      {#if row.original.preferred_race && classCanBe(cls, row.original.preferred_race)}
        {row.original.preferred_race}
      {:else}
        <span class="text-muted-foreground"
          >Any race available to this class</span
        >
      {/if}
    {:else if row.original.preferred_race}
      {row.original.preferred_race}
    {:else}
      <span class="text-muted-foreground">None</span>
    {/if}
  {:else if cell.column.id === "zone_name"}
    <a
      href="/zones/{row.original.zone_id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >{row.original.zone_name}</a
    >
  {:else if cell.column.id === "map"}
    <MapLink entityId={row.original.npc_id} entityType="npc" compact={true} />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<DataTable
  data={recruiters}
  {columns}
  {renderCell}
  {urlKey}
  pageSize={10}
  zebraStripe={true}
  class="bg-muted/30"
/>
