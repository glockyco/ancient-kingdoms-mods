<script lang="ts" generics="TData">
  import {
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    type ColumnDef,
    type SortingState,
    type PaginationState,
    type ColumnFiltersState,
    type VisibilityState,
    type ColumnPinningState,
    type Cell,
    type Row,
    type Header,
    type Table as TanstackTable,
  } from "@tanstack/table-core";
  import { createSvelteTable } from "./create-table.js";
  import FlexRender from "./flex-render.svelte";
  import * as Table from "$lib/components/ui/table";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Pagination from "$lib/components/ui/pagination";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
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
    accentColor?: string;
    class?: string;
    renderCell?: Snippet<[{ cell: Cell<TData, unknown>; row: Row<TData> }]>;
    renderHeader?: Snippet<[{ header: Header<TData, unknown> }]>;
    renderToolbar?: Snippet<[{ table: TanstackTable<TData> }]>;
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
    accentColor,
    class: className,
    renderCell,
    renderHeader,
    renderToolbar,
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
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
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
        // Reset to first page when filters change to avoid being on an invalid page
        pagination = { ...pagination, pageIndex: 0 };
      },
      onColumnVisibilityChange: (updater) => {
        columnVisibility =
          typeof updater === "function" ? updater(columnVisibility) : updater;
      },
      onGlobalFilterChange: (updater) => {
        globalFilter =
          typeof updater === "function" ? updater(globalFilter) : updater;
        // Reset to first page when search changes
        pagination = { ...pagination, pageIndex: 0 };
      },
    }),
  );

  const headerGroups = $derived(table.getHeaderGroups());
  const rowModel = $derived(table.getRowModel());
  const pageCount = $derived(table.getPageCount());
  const allColumns = $derived(table.getAllColumns());
  const toggleableColumns = $derived(
    allColumns.filter((col) => col.getCanHide()),
  );
</script>

<div class={className}>
  {#if renderToolbar || showSearch || showColumnToggle}
    <div class="flex items-center gap-2 pb-4">
      {#if showSearch}
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          oninput={(e) => (globalFilter = e.currentTarget.value)}
          class="max-w-sm"
        />
      {/if}
      {#if renderToolbar}
        {@render renderToolbar({ table })}
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
    <Table.Root class="table-fixed">
      <colgroup>
        {#each columns as col, i (i)}
          {@const styles = [
            col.size ? `width: ${col.size}px` : null,
            col.minSize ? `min-width: ${col.minSize}px` : null,
          ]
            .filter(Boolean)
            .join("; ")}
          <col style={styles || undefined} />
        {/each}
      </colgroup>
      <Table.Header>
        {#each headerGroups as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head>
                {#if !header.isPlaceholder}
                  {#if header.column.getCanSort()}
                    <button
                      type="button"
                      class="flex w-full items-center gap-1 hover:text-foreground"
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
            <Table.Row
              class="{zebraStripe && i % 2 === 1
                ? 'bg-muted/30'
                : ''} {accentColor ? 'border-l-4' : ''}"
              style={accentColor ? `border-left-color: ${accentColor}` : ""}
            >
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
          {#if rowModel.rows.length < pageSize && (pageCount > 1 || columnFilters.length > 0)}
            {#each Array.from({ length: pageSize - rowModel.rows.length }, (_, i) => i) as i (i)}
              <Table.Row class="pointer-events-none">
                {#each columns as col (col)}
                  <Table.Cell>&nbsp;</Table.Cell>
                {/each}
              </Table.Row>
            {/each}
          {/if}
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

  {#if showPagination && data.length > pageSize}
    <div class="h-10 pt-4">
      {#if pageCount > 1}
        <Pagination.Root
          count={table.getFilteredRowModel().rows.length}
          perPage={pageSize}
          page={pagination.pageIndex + 1}
          onPageChange={(page) => table.setPageIndex(page - 1)}
        >
          {#snippet children({ pages })}
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.PrevButton />
              </Pagination.Item>
              {#each pages as page (page.key)}
                {#if page.type === "ellipsis"}
                  <Pagination.Item>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                {:else}
                  <Pagination.Item>
                    <Pagination.Link
                      {page}
                      isActive={pagination.pageIndex + 1 === page.value}
                    />
                  </Pagination.Item>
                {/if}
              {/each}
              <Pagination.Item>
                <Pagination.NextButton />
              </Pagination.Item>
            </Pagination.Content>
          {/snippet}
        </Pagination.Root>
      {/if}
    </div>
  {/if}
</div>
