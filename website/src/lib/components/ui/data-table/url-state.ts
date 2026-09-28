import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/table-core";

const RANGE_NUMBER = "-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?";
const RANGE_PATTERN = new RegExp(
  `^(${RANGE_NUMBER})?-(${RANGE_NUMBER})?$`,
  "i",
);

export interface TableUrlState {
  search: string;
  filters: ColumnFiltersState;
  visibility: VisibilityState;
  pagination: PaginationState;
  sorting: SortingState;
}

export interface ParsedTableUrlState {
  hasUrlState: boolean;
  search: string | null;
  filters: ColumnFiltersState;
  visibility: VisibilityState;
  page: number | null;
  sorting: SortingState | null;
}

export function serializeTableUrlState(
  currentParams: URLSearchParams,
  urlKey: string,
  state: TableUrlState,
  initialVisibility: VisibilityState,
  initialSorting: SortingState,
): string {
  const newParams: string[] = [];
  const prefix = `${urlKey}.`;
  currentParams.forEach((value, key) => {
    if (!key.startsWith(prefix)) {
      newParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });

  if (state.search) {
    newParams.push(
      `${encodeURIComponent(`${prefix}search`)}=${encodeURIComponent(state.search)}`,
    );
  }

  const hiddenCols = Object.entries(state.visibility)
    .filter(([id, visible]) => !visible && initialVisibility[id] !== false)
    .map(([id]) => id);
  const shownCols = Object.keys(initialVisibility).filter(
    (id) => initialVisibility[id] === false && state.visibility[id] !== false,
  );
  if (hiddenCols.length > 0) {
    newParams.push(
      `${encodeURIComponent(`${prefix}hide`)}=${encodeURIComponent(hiddenCols.join(","))}`,
    );
  }
  if (shownCols.length > 0) {
    newParams.push(
      `${encodeURIComponent(`${prefix}show`)}=${encodeURIComponent(shownCols.join(","))}`,
    );
  }

  for (const filter of state.filters) {
    const paramKey = `${prefix}${filter.id}`;
    if (
      typeof filter.value === "object" &&
      filter.value !== null &&
      !Array.isArray(filter.value) &&
      "stats" in filter.value &&
      "mode" in filter.value
    ) {
      const { stats, mode } = filter.value as {
        stats: string[];
        mode: string;
      };
      if (stats.length > 0 || mode !== "all") {
        newParams.push(
          `${encodeURIComponent(paramKey)}=${encodeURIComponent(`${stats.join(",")};${mode}`)}`,
        );
      }
      continue;
    }

    if (
      Array.isArray(filter.value) &&
      filter.value.length === 2 &&
      (typeof filter.value[0] === "number" ||
        filter.value[0] === null ||
        typeof filter.value[1] === "number" ||
        filter.value[1] === null) &&
      !Array.isArray(filter.value[0])
    ) {
      const [min, max] = filter.value as [number | null, number | null];
      if (min !== null || max !== null) {
        newParams.push(
          `${encodeURIComponent(paramKey)}=${encodeURIComponent(`${min ?? ""}-${max ?? ""}`)}`,
        );
      }
      continue;
    }

    const values = filter.value as string[] | undefined;
    if (values && values.length > 0) {
      newParams.push(
        `${encodeURIComponent(paramKey)}=${encodeURIComponent(values.join(","))}`,
      );
    }
  }

  if (state.pagination.pageIndex > 0) {
    newParams.push(
      `${encodeURIComponent(`${prefix}page`)}=${state.pagination.pageIndex + 1}`,
    );
  }
  if (
    JSON.stringify(state.sorting) !== JSON.stringify(initialSorting) &&
    state.sorting.length > 0
  ) {
    const sortStr = state.sorting
      .map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`)
      .join(",");
    newParams.push(
      `${encodeURIComponent(`${prefix}sort`)}=${encodeURIComponent(sortStr)}`,
    );
  }
  return newParams.join("&");
}

export function parseTableUrlState(
  params: URLSearchParams,
  urlKey: string,
): ParsedTableUrlState {
  const prefix = `${urlKey}.`;
  const filters: ColumnFiltersState = [];
  const visibility: VisibilityState = {};
  let hasUrlState = false;
  let search: string | null = null;
  let page: number | null = null;
  let sorting: SortingState | null = null;

  params.forEach((value, key) => {
    if (!key.startsWith(prefix)) return;
    hasUrlState = true;
    const paramKey = key.slice(prefix.length);
    if (paramKey === "search") {
      search = value;
    } else if (paramKey === "hide") {
      for (const col of value.split(",").filter(Boolean))
        visibility[col] = false;
    } else if (paramKey === "show") {
      for (const col of value.split(",").filter(Boolean))
        visibility[col] = true;
    } else if (paramKey === "page") {
      const pageNum = parseInt(value, 10);
      if (!isNaN(pageNum) && pageNum > 0) page = pageNum - 1;
    } else if (paramKey === "sort") {
      sorting = value
        .split(",")
        .filter(Boolean)
        .map((part) => {
          const [id, dir] = part.split(":");
          return { id, desc: dir === "desc" };
        });
    } else {
      const statFilterMatch = value.match(/^(.*);(any|all)$/);
      if (statFilterMatch) {
        filters.push({
          id: paramKey,
          value: {
            stats: statFilterMatch[1].split(",").filter(Boolean),
            mode: statFilterMatch[2] as "any" | "all",
          },
        });
      } else {
        // A range has exactly one separator after an optional negative minimum.
        const rangeMatch = value.match(RANGE_PATTERN);
        if (rangeMatch) {
          const min = rangeMatch[1] ? Number(rangeMatch[1]) : null;
          const max = rangeMatch[2] ? Number(rangeMatch[2]) : null;
          if (min !== null || max !== null) {
            filters.push({ id: paramKey, value: [min, max] });
          }
        } else {
          const values = value.split(",").filter(Boolean);
          if (values.length > 0) filters.push({ id: paramKey, value: values });
        }
      }
    }
  });
  return { hasUrlState, search, filters, visibility, page, sorting };
}
