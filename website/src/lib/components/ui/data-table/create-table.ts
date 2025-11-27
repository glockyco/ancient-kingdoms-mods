import {
  createTable,
  type RowData,
  type TableOptions,
  type TableOptionsResolved,
  type Table,
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
