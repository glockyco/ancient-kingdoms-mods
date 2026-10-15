import {
  createTable,
  type RowData,
  type TableOptions,
  type TableOptionsResolved,
  type Table,
  type SortingState,
} from "@tanstack/table-core";

/**
 * Creates a TanStack Table instance for Svelte.
 * The table is reactive when used with reactive state for sorting/pagination/filters.
 */
export function createSvelteTable<TData extends RowData>(
  options: TableOptions<TData>,
): Table<TData> {
  const resolvedOptions: TableOptionsResolved<TData> = {
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
    ...options,
  };

  const table = createTable(resolvedOptions);

  // Set up options with state binding
  table.setOptions((prev) => ({
    ...prev,
    ...options,
    state: {
      ...prev.state,
      ...options.state,
    },
    onStateChange: (updater) => {
      options.onStateChange?.(updater);
    },
  }));

  return table;
}

/**
 * Whether a header click sorts the column descending. Clicking the primary
 * sort column reverses it. Any other column starts in its natural direction:
 * text ascending, numbers descending.
 */
export function nextSortDescending<TData extends RowData>(
  table: Table<TData>,
  columnId: string,
): boolean {
  const primary = table.getState().sorting[0];
  if (primary?.id === columnId) return !primary.desc;
  return table.getColumn(columnId)?.getFirstSortDir() === "desc";
}

/** Sort by this column alone, as a header click does. */
export function toggleSingleColumnSorting<TData extends RowData>(
  table: Table<TData>,
  columnId: string,
): void {
  if (!table.getColumn(columnId)?.getCanSort()) return;
  const sorting: SortingState = [
    { id: columnId, desc: nextSortDescending(table, columnId) },
  ];
  table.setSorting(sorting);
}
