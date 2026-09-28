<script lang="ts" generics="TData">
  import { onMount, untrack } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { getNormalizedUrlSearch } from "$lib/utils/url";
  import { parseTableUrlState, serializeTableUrlState } from "./url-state";
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
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import type { Snippet } from "svelte";

  type Props = {
    data: TData[];
    columns: ColumnDef<TData, unknown>[];
    pageSize?: number;
    initialSorting?: SortingState;
    initialColumnVisibility?: VisibilityState;
    urlKey?: string;
    showPagination?: boolean;
    showSearch?: boolean;
    showColumnToggle?: boolean;
    searchPlaceholder?: string;
    columnLabels?: Record<string, string>;
    zebraStripe?: boolean;
    paginateStaticHtml?: boolean;
    persistentScrollbar?: boolean;
    class?: string;
    renderCell?: Snippet<[{ cell: Cell<TData, unknown>; row: Row<TData> }]>;
    renderHeader?: Snippet<[{ header: Header<TData, unknown> }]>;
    renderToolbar?: Snippet<[{ table: TanstackTable<TData> }]>;
    onVisibleRowsChange?: (rows: TData[], adjacentRows: TData[]) => void;
  };

  let {
    data,
    columns,
    pageSize = 10,
    initialSorting = [],
    initialColumnVisibility = {},
    urlKey,
    showPagination = true,
    showSearch = false,
    showColumnToggle = false,
    searchPlaceholder = "Search...",
    columnLabels = {},
    zebraStripe = false,
    paginateStaticHtml = false,
    persistentScrollbar = false,
    class: className,
    renderCell,
    renderHeader,
    renderToolbar,
    onVisibleRowsChange,
  }: Props = $props();

  function getColumnLabel(columnId: string): string {
    if (columnLabels[columnId]) return columnLabels[columnId];
    const col = columns.find(
      (c) => "accessorKey" in c && c.accessorKey === columnId,
    );
    if (col && typeof col.header === "string") return col.header;
    return columnId;
  }

  // Capture initial prop values (won't react to prop changes after mount)
  let sorting = $state<SortingState>(untrack(() => initialSorting));
  let pagination = $state<PaginationState>(
    untrack(() => ({
      pageIndex: 0,
      pageSize,
    })),
  );
  let columnFilters = $state<ColumnFiltersState>([]);
  let columnVisibility = $state<VisibilityState>(
    untrack(() => initialColumnVisibility),
  );
  let columnPinning = $state<ColumnPinningState>({ left: [], right: [] });
  let globalFilter = $state("");
  let isHydrated = $state(false);

  // Track previous data reference to detect actual data changes
  let previousData: TData[] | null = null;

  // Reset pagination when data changes (e.g., navigating to a different detail page)
  // Skip on initial mount to allow URL restoration to set the page
  $effect(() => {
    if (data && previousData !== null && data !== previousData) {
      pagination = { pageIndex: 0, pageSize };
    }
    previousData = data;
  });

  // Storage key for localStorage persistence (derived from urlKey prop)
  const storageKey = $derived(urlKey ? `table-state-${urlKey}` : null);
  const STORAGE_PREFIX = "table-state-";
  const MAX_AGE_DAYS = 30;
  const MAX_ENTRIES = 100;

  // State shape for localStorage
  interface StoredState {
    search?: string;
    filters?: ColumnFiltersState;
    visibility?: VisibilityState;
    page?: number;
    sorting?: SortingState;
    ts?: number; // timestamp for cleanup
  }

  // Clean up old table state entries from localStorage
  function cleanupOldEntries() {
    try {
      const now = Date.now();
      const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
      const entries: Array<{ key: string; ts: number }> = [];

      // Collect all table-state entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          try {
            const data = JSON.parse(
              localStorage.getItem(key) || "{}",
            ) as StoredState;
            const ts = data.ts || 0;
            entries.push({ key, ts });

            // Remove entries older than MAX_AGE_DAYS
            if (now - ts > maxAge) {
              localStorage.removeItem(key);
            }
          } catch {
            // Remove corrupted entries
            localStorage.removeItem(key);
          }
        }
      }

      // If still too many entries, remove oldest ones
      if (entries.length > MAX_ENTRIES) {
        entries.sort((a, b) => a.ts - b.ts);
        const toRemove = entries.slice(0, entries.length - MAX_ENTRIES);
        for (const entry of toRemove) {
          localStorage.removeItem(entry.key);
        }
      }
    } catch {
      // localStorage may be unavailable
    }
  }

  // Save state to localStorage
  function saveToStorage() {
    if (!storageKey) return;
    try {
      const state: StoredState = {};
      if (globalFilter) state.search = globalFilter;
      if (columnFilters.length > 0) state.filters = columnFilters;

      // Only store visibility diffs from initial
      const visibilityDiff: VisibilityState = {};
      for (const [id, visible] of Object.entries(columnVisibility)) {
        if (visible !== (initialColumnVisibility[id] ?? true)) {
          visibilityDiff[id] = visible;
        }
      }
      if (Object.keys(visibilityDiff).length > 0)
        state.visibility = visibilityDiff;

      if (pagination.pageIndex > 0) state.page = pagination.pageIndex;

      // Only store sorting if different from initial
      const sortingChanged =
        JSON.stringify(sorting) !== JSON.stringify(initialSorting);
      if (sortingChanged && sorting.length > 0) state.sorting = sorting;

      if (Object.keys(state).length > 0) {
        state.ts = Date.now();
        localStorage.setItem(storageKey, JSON.stringify(state));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // localStorage may be unavailable
    }
  }

  // Touch timestamp to keep entry alive on revisit
  function touchStorage(state: StoredState) {
    if (!storageKey) return;
    try {
      state.ts = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // localStorage may be unavailable
    }
  }

  // Load state from localStorage
  function loadFromStorage(): StoredState | null {
    if (!storageKey) return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const state = JSON.parse(stored) as StoredState;
        // Touch timestamp to keep entry alive
        touchStorage(state);
        return state;
      }
    } catch {
      // localStorage may be unavailable or corrupted
    }
    return null;
  }

  // URL-based state persistence using {urlKey}.{key} format
  function syncStateToUrl() {
    if (!urlKey || !isHydrated) return;

    // Also save to localStorage
    saveToStorage();

    const queryString = serializeTableUrlState(
      new URL(window.location.href).searchParams,
      urlKey,
      {
        search: globalFilter,
        filters: columnFilters,
        visibility: columnVisibility,
        pagination,
        sorting,
      },
      initialColumnVisibility,
      initialSorting,
    );
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState(history.state, "", newUrl);
  }

  function readUrlState() {
    return parseTableUrlState(
      new URLSearchParams(getNormalizedUrlSearch()),
      urlKey!,
    );
  }

  // A link to the same page with other filters, such as a search result that
  // opens a filtered list, keeps this component mounted. Apply the new URL
  // state, and reset what the URL no longer sets.
  afterNavigate(({ type }) => {
    if (!urlKey || !isHydrated || type === "enter") return;
    const state = readUrlState();
    globalFilter = state.search ?? "";
    columnFilters = state.filters;
    columnVisibility = { ...initialColumnVisibility, ...state.visibility };
    pagination = { ...pagination, pageIndex: state.page ?? 0 };
    sorting = state.sorting ?? initialSorting;
  });

  onMount(() => {
    if (urlKey) {
      const {
        hasUrlState,
        search: restoredSearch,
        filters: restoredFilters,
        visibility: restoredVisibility,
        page: restoredPage,
        sorting: restoredSorting,
      } = readUrlState();
      if (restoredSearch !== null) globalFilter = restoredSearch;

      // Track if we restored from localStorage (need to sync URL after hydration)
      let restoredFromStorage = false;

      // If URL has state, use it; otherwise fall back to localStorage
      if (hasUrlState) {
        if (restoredFilters.length > 0) {
          columnFilters = restoredFilters;
        }
        if (Object.keys(restoredVisibility).length > 0) {
          columnVisibility = {
            ...initialColumnVisibility,
            ...restoredVisibility,
          };
        }
        if (restoredPage !== null) {
          pagination = { ...pagination, pageIndex: restoredPage };
        }
        if (restoredSorting !== null) {
          sorting = restoredSorting;
        }
      } else {
        // No URL state, try localStorage
        const stored = loadFromStorage();
        if (stored) {
          restoredFromStorage = true;
          if (stored.search) globalFilter = stored.search;
          if (stored.filters && stored.filters.length > 0) {
            columnFilters = stored.filters;
          }
          if (stored.visibility && Object.keys(stored.visibility).length > 0) {
            columnVisibility = {
              ...initialColumnVisibility,
              ...stored.visibility,
            };
          }
          if (stored.page !== undefined && stored.page > 0) {
            pagination = { ...pagination, pageIndex: stored.page };
          }
          if (stored.sorting && stored.sorting.length > 0) {
            sorting = stored.sorting;
          }
        }
      }

      // Periodically clean up old entries (roughly once per session)
      const lastCleanup = localStorage.getItem("table-state-last-cleanup");
      const now = Date.now();
      if (
        !lastCleanup ||
        now - parseInt(lastCleanup, 10) > 24 * 60 * 60 * 1000
      ) {
        cleanupOldEntries();
        localStorage.setItem("table-state-last-cleanup", String(now));
      }

      // Sync URL after setting isHydrated if we restored from localStorage
      if (restoredFromStorage) {
        isHydrated = true;
        syncStateToUrl();
        return;
      }
    }
    isHydrated = true;
  });

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
        // Reset to first page when sorting changes
        pagination = { ...pagination, pageIndex: 0 };
        syncStateToUrl();
      },
      onPaginationChange: (updater) => {
        pagination =
          typeof updater === "function" ? updater(pagination) : updater;
        syncStateToUrl();
      },
      onColumnFiltersChange: (updater) => {
        columnFilters =
          typeof updater === "function" ? updater(columnFilters) : updater;
        // Reset to first page when filters change to avoid being on an invalid page
        pagination = { ...pagination, pageIndex: 0 };
        syncStateToUrl();
      },
      onColumnVisibilityChange: (updater) => {
        columnVisibility =
          typeof updater === "function" ? updater(columnVisibility) : updater;
        syncStateToUrl();
      },
      onGlobalFilterChange: (updater) => {
        globalFilter =
          typeof updater === "function" ? updater(globalFilter) : updater;
        // Reset to first page when search changes
        pagination = { ...pagination, pageIndex: 0 };
        syncStateToUrl();
      },
    }),
  );

  const headerGroups = $derived(table.getHeaderGroups());
  const rowModel = $derived(table.getRowModel());
  const allRowModel = $derived(table.getPrePaginationRowModel());
  const pageCount = $derived(table.getPageCount());
  const allColumns = $derived(table.getAllColumns());

  const toggleableColumns = $derived(
    allColumns.filter((col) => col.getCanHide()),
  );

  // Check if any filters/search/visibility/sorting have been modified from defaults
  const hasModifiedVisibility = $derived(
    Object.entries(columnVisibility).some(
      ([key, value]) => value !== (initialColumnVisibility[key] ?? true),
    ),
  );
  const hasModifiedSorting = $derived(
    JSON.stringify(sorting) !== JSON.stringify(initialSorting),
  );
  const hasActiveFilters = $derived(
    globalFilter !== "" ||
      columnFilters.some((f) => {
        // Stat filters with no selected stats are not active
        if (
          typeof f.value === "object" &&
          f.value !== null &&
          !Array.isArray(f.value) &&
          "stats" in f.value &&
          Array.isArray((f.value as { stats: unknown[] }).stats) &&
          (f.value as { stats: unknown[] }).stats.length === 0
        ) {
          return false;
        }
        return true;
      }) ||
      hasModifiedVisibility ||
      hasModifiedSorting,
  );

  // Reset all filters, search, sorting, and column visibility to defaults
  function resetFilters() {
    globalFilter = "";
    columnFilters = [];
    columnVisibility = { ...initialColumnVisibility };
    sorting = [...initialSorting];
    pagination = { pageIndex: 0, pageSize };
    // Clear localStorage
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // localStorage may be unavailable
      }
    }
    syncStateToUrl();
  }

  // For no-JS support: render all rows by default, or just first page if paginateStaticHtml is true
  const displayRows = $derived(
    isHydrated
      ? rowModel.rows
      : paginateStaticHtml
        ? allRowModel.rows.slice(0, pageSize)
        : allRowModel.rows,
  );

  // Notify parent when visible rows change (for lazy loading)
  // Track pagination, filter, and sorting changes to trigger re-fetching
  $effect(() => {
    if (!isHydrated || !onVisibleRowsChange) return;

    // These reads establish reactive dependencies - the effect re-runs when they change
    const currentPageIndex = pagination.pageIndex;
    void globalFilter;
    void columnFilters;
    void sorting;

    // Compute and call without creating additional reactive dependencies
    untrack(() => {
      // Use getSortedRowModel to get rows after both filtering AND sorting
      const allSortedRows = table.getSortedRowModel().rows;

      // Guard against table not being fully initialized yet
      if (allSortedRows.length === 0 && data.length > 0) return;

      const start = currentPageIndex * pageSize;
      const end = start + pageSize;
      const visibleRows = allSortedRows
        .slice(start, end)
        .map((r) => r.original);

      // Get adjacent page rows (prev + next page) for prefetching
      const prevPageStart = Math.max(0, (currentPageIndex - 1) * pageSize);
      const prevPageEnd = currentPageIndex * pageSize;
      const nextPageStart = (currentPageIndex + 1) * pageSize;
      const nextPageEnd = (currentPageIndex + 2) * pageSize;

      const adjacentRows = [
        ...allSortedRows.slice(prevPageStart, prevPageEnd),
        ...allSortedRows.slice(nextPageStart, nextPageEnd),
      ].map((r) => r.original);

      onVisibleRowsChange(visibleRows, adjacentRows);
    });
  });

  // Target height for placeholder rows: the smaller of total data or page size
  // This maintains consistent table height when filtering or on partial last pages
  const targetTableHeight = $derived(Math.min(data.length, pageSize));

  // Calculate grid template columns for visible columns
  const visibleColumnIds = $derived(
    new Set(table.getVisibleLeafColumns().map((c) => c.id)),
  );
  const gridTemplateColumns = $derived(
    columns
      .filter((col) => {
        const id = "accessorKey" in col ? col.accessorKey : col.id;
        return visibleColumnIds.has(id as string);
      })
      .map((col) => {
        if (col.size) return `${col.size}px`;
        if (col.minSize) return `minmax(${col.minSize}px, 1fr)`;
        return "auto";
      })
      .join(" "),
  );
</script>

<div>
  {#if !isHydrated}
    <div
      class="loading-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div class="text-center">
        <div
          class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
        ></div>
        <p class="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  {/if}

  {#if isHydrated && (renderToolbar || showSearch || showColumnToggle)}
    <div class="flex flex-wrap items-stretch gap-2 pb-4">
      {#if showSearch}
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          oninput={(e) => table.setGlobalFilter(e.currentTarget.value)}
          class="min-w-[150px] max-w-full flex-1 sm:max-w-sm"
        />
      {/if}
      {#if renderToolbar}
        {@render renderToolbar({ table })}
      {/if}
      <div class="flex items-center gap-2 flex-wrap">
        {#if showColumnToggle}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Button variant="outline" size="sm" class="h-8" {...props}>
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
        {#if hasActiveFilters}
          <Button
            variant="ghost"
            onclick={resetFilters}
            class="h-8 px-2 lg:px-3"
          >
            Reset
            <RotateCcw class="ml-2 h-4 w-4" />
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <div
    class="rounded-md border {persistentScrollbar
      ? 'overflow-x-scroll'
      : 'overflow-x-auto'} {className}"
  >
    <Table.Root
      class="min-w-full w-max grid"
      style="grid-template-columns: {gridTemplateColumns}"
    >
      <Table.Header class="contents">
        {#each headerGroups as headerGroup (headerGroup.id)}
          <Table.Row class="contents">
            {#each headerGroup.headers as header (header.id)}
              <Table.Head class="whitespace-nowrap">
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
      <Table.Body class="contents">
        {#if displayRows.length > 0}
          {#each displayRows as row, i (row.id)}
            <Table.Row
              class="contents {zebraStripe && i % 2 === 1
                ? '[&>td]:bg-muted/30'
                : ''}"
            >
              {#each row.getVisibleCells() as cell (cell.id)}
                <Table.Cell class="whitespace-nowrap">
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
          {#if isHydrated && displayRows.length < targetTableHeight && displayRows.length < data.length}
            {#each Array.from({ length: targetTableHeight - displayRows.length }, (_, i) => i) as i (i)}
              <Table.Row class="contents pointer-events-none">
                {#each table.getVisibleLeafColumns() as col (col.id)}
                  <Table.Cell>&nbsp;</Table.Cell>
                {/each}
              </Table.Row>
            {/each}
          {/if}
        {:else}
          <Table.Row class="contents">
            <Table.Cell
              style="grid-column: span {table.getVisibleLeafColumns().length}"
              class="text-center"
            >
              No results.
            </Table.Cell>
          </Table.Row>
          {#if isHydrated && targetTableHeight > 1}
            {#each Array.from({ length: targetTableHeight - 1 }, (_, i) => i) as i (i)}
              <Table.Row class="contents pointer-events-none">
                {#each table.getVisibleLeafColumns() as col (col.id)}
                  <Table.Cell>&nbsp;</Table.Cell>
                {/each}
              </Table.Row>
            {/each}
          {/if}
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  {#if isHydrated && showPagination && data.length > pageSize}
    <div class="h-10 pt-4">
      {#if pageCount > 1}
        <Pagination.Root
          count={table.getFilteredRowModel().rows.length}
          perPage={pageSize}
          bind:page={
            () => pagination.pageIndex + 1, (p) => table.setPageIndex(p - 1)
          }
        >
          {#snippet children({ pages })}
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.PrevButton />
              </Pagination.Item>
              {#each pages as page (`${page.key}-${pagination.pageIndex}`)}
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
