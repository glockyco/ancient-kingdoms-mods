<script lang="ts" generics="TData">
  import type { Snippet } from "svelte";
  import {
    DataTable,
    type Cell,
    type ColumnDef,
    type Header,
    type Row,
    type SortingState,
  } from "$lib/components/ui/data-table";

  /**
   * A full-width section listing one relation of an entity, such as the
   * monsters that drop an item. The title states how many entries the
   * relation has, and long relations page ten rows at a time.
   */
  let {
    title,
    rows,
    columns,
    cell,
    urlKey,
    initialSorting = [],
    rightAligned = [],
    description,
  }: {
    title: string;
    rows: TData[];
    columns: ColumnDef<TData>[];
    cell: Snippet<[{ cell: Cell<TData, unknown>; row: Row<TData> }]>;
    /** Unique per page, so each table keeps its own page in the URL. */
    urlKey: string;
    initialSorting?: SortingState;
    /** Column ids holding numbers, whose headers align right with their values. */
    rightAligned?: string[];
    /** Text that explains what the rows mean, shown between the title and the table. */
    description?: Snippet;
  } = $props();
</script>

{#snippet header({ header }: { header: Header<TData, unknown> })}
  {#if rightAligned.includes(header.id)}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

<section class="space-y-3">
  <h2 class="font-semibold leading-none">{title} ({rows.length})</h2>
  {#if description}
    <div class="text-sm text-muted-foreground">{@render description()}</div>
  {/if}
  <DataTable
    data={rows}
    {columns}
    renderCell={cell}
    renderHeader={header}
    {initialSorting}
    {urlKey}
    pageSize={10}
    zebraStripe={true}
    paginateStaticHtml={true}
    class="bg-muted/30"
  />
</section>
