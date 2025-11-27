<script lang="ts" generics="TData">
  import {
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    type ColumnDef,
    type SortingState,
    type PaginationState,
    type ColumnFiltersState,
    type VisibilityState,
    type ColumnPinningState,
    type Cell,
    type Row,
    type Header,
  } from "@tanstack/table-core";
  import { createSvelteTable } from "./create-table.js";
  import FlexRender from "./flex-render.svelte";
  import * as Table from "$lib/components/ui/table";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Settings2 from "@lucide/svelte/icons/settings-2";
  import type { Snippet } from "svelte";

  type Props = {
    data: TData[];
    columns: ColumnDef<TData, unknown>[];
    pageSize?: number;
    initialSorting?: SortingState;
    showPagination?: boolean;
    showSearch?: boolean;
    showColumnToggle?: boolean;
    searchPlaceholder?: string;
    columnLabels?: Record<string, string>;
    zebraStripe?: boolean;
    class?: string;
    renderCell?: Snippet<[{ cell: Cell<TData, unknown>; row: Row<TData> }]>;
    renderHeader?: Snippet<[{ header: Header<TData, unknown> }]>;
  };

  let {
    data,
    columns,
    pageSize = 10,
    initialSorting = [],
    showPagination = true,
    showSearch = false,
    showColumnToggle = false,
    searchPlaceholder = "Search...",
    columnLabels = {},
    zebraStripe = false,
    class: className,
    renderCell,
    renderHeader,
  }: Props = $props();

  function getColumnLabel(columnId: string): string {
    if (columnLabels[columnId]) return columnLabels[columnId];
    const col = columns.find(
      (c) => "accessorKey" in c && c.accessorKey === columnId,
    );
    if (col && typeof col.header === "string") return col.header;
    return columnId;
  }

  let sorting = $state<SortingState>(initialSorting);
  let pagination = $state<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  let columnFilters = $state<ColumnFiltersState>([]);
  let columnVisibility = $state<VisibilityState>({});
  let columnPinning = $state<ColumnPinningState>({ left: [], right: [] });
  let globalFilter = $state("");

  const table = $derived(
    createSvelteTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      state: {
        sorting,
        pagination,
        columnFilters,
        columnVisibility,
        columnPinning,
        globalFilter,
      },
      onSortingChange: (updater) => {
        sorting = typeof updater === "function" ? updater(sorting) : updater;
      },
      onPaginationChange: (updater) => {
        pagination =
          typeof updater === "function" ? updater(pagination) : updater;
      },
      onColumnFiltersChange: (updater) => {
        columnFilters =
          typeof updater === "function" ? updater(columnFilters) : updater;
      },
      onColumnVisibilityChange: (updater) => {
        columnVisibility =
          typeof updater === "function" ? updater(columnVisibility) : updater;
      },
      onGlobalFilterChange: (updater) => {
        globalFilter =
          typeof updater === "function" ? updater(globalFilter) : updater;
      },
    }),
  );

  const headerGroups = $derived(table.getHeaderGroups());
  const rowModel = $derived(table.getRowModel());
  const canPreviousPage = $derived(table.getCanPreviousPage());
  const canNextPage = $derived(table.getCanNextPage());
  const pageCount = $derived(table.getPageCount());
  const allColumns = $derived(table.getAllColumns());
  const toggleableColumns = $derived(
    allColumns.filter((col) => col.getCanHide()),
  );
</script>

<div class={className}>
  {#if showSearch || showColumnToggle}
    <div class="flex items-center gap-2 pb-4">
      {#if showSearch}
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          oninput={(e) => (globalFilter = e.currentTarget.value)}
          class="max-w-sm"
        />
      {/if}
      {#if showColumnToggle}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button variant="outline" {...props}>
                <Settings2 class="mr-2 h-4 w-4" />
                Columns
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            {#each toggleableColumns as column (column.id)}
              <DropdownMenu.CheckboxItem
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {getColumnLabel(column.id)}
              </DropdownMenu.CheckboxItem>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
    </div>
  {/if}

  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        {#each headerGroups as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head>
                {#if !header.isPlaceholder}
                  {#if header.column.getCanSort()}
                    <button
                      type="button"
                      class="flex items-center gap-1 hover:text-foreground"
                      onclick={() => header.column.toggleSorting()}
                    >
                      {#if renderHeader}
                        {@render renderHeader({ header })}
                      {:else}
                        <FlexRender
                          content={header.column.columnDef.header}
                          props={header.getContext()}
                        />
                      {/if}
                      {#if header.column.getIsSorted() === "asc"}
                        <ChevronUp class="h-4 w-4" />
                      {:else if header.column.getIsSorted() === "desc"}
                        <ChevronDown class="h-4 w-4" />
                      {:else}
                        <ChevronsUpDown class="h-4 w-4 opacity-50" />
                      {/if}
                    </button>
                  {:else if renderHeader}
                    {@render renderHeader({ header })}
                  {:else}
                    <FlexRender
                      content={header.column.columnDef.header}
                      props={header.getContext()}
                    />
                  {/if}
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#if rowModel.rows.length > 0}
          {#each rowModel.rows as row, i (row.id)}
            <Table.Row class={zebraStripe && i % 2 === 1 ? "bg-muted/30" : ""}>
              {#each row.getVisibleCells() as cell (cell.id)}
                <Table.Cell>
                  {#if renderCell}
                    {@render renderCell({ cell, row })}
                  {:else}
                    <FlexRender
                      content={cell.column.columnDef.cell}
                      props={cell.getContext()}
                    />
                  {/if}
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center">
              No results.
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  {#if showPagination && pageCount > 1}
    <div class="flex items-center justify-between pt-4">
      <div class="text-muted-foreground">
        Page {pagination.pageIndex + 1} of {pageCount}
      </div>
      <div class="flex gap-2">
        <Button
          variant="outline"
          onclick={() => table.previousPage()}
          disabled={!canPreviousPage}
        >
          <ChevronLeft class="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          onclick={() => table.nextPage()}
          disabled={!canNextPage}
        >
          Next
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  {/if}
</div>
