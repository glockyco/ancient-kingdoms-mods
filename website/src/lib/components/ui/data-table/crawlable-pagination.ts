import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/table-core";
import { serializeTableUrlState, type TableUrlState } from "./url-state";

export interface CrawlablePagination {
  basePath: string;
  page: number;
  total: number;
  pageSize: number;
}

export function hasActiveColumnFilters(filters: ColumnFiltersState): boolean {
  return filters.some(({ value }) => {
    if (Array.isArray(value)) {
      return value.some((entry) => entry !== null && entry !== undefined);
    }
    if (value && typeof value === "object" && "stats" in value) {
      return Array.isArray(value.stats) && value.stats.length > 0;
    }
    return value !== undefined && value !== null && value !== "";
  });
}

export function isDefaultPaginationState(
  state: Pick<TableUrlState, "search" | "filters" | "sorting" | "pagination">,
  initialSorting: SortingState,
  pageSize: number,
): boolean {
  return (
    state.search === "" &&
    !hasActiveColumnFilters(state.filters) &&
    state.pagination.pageSize === pageSize &&
    state.sorting.length === initialSorting.length &&
    state.sorting.every(
      (sort, index) =>
        sort.id === initialSorting[index].id &&
        sort.desc === initialSorting[index].desc,
    )
  );
}

export function listPageUrl(basePath: string, page: number): string {
  const base = basePath.replace(/\/+$/, "");
  return page === 1 ? base : `${base}/page/${page}`;
}

export function listPageNumber(basePath: string, pathname: string): number {
  const base = basePath.replace(/\/+$/, "");
  if (!pathname.startsWith(`${base}/page/`)) return 1;
  const suffix = pathname.slice(`${base}/page/`.length);
  return /^[2-9]\d*\/?$|^1\d+\/?$/.test(suffix)
    ? Number(suffix.replace(/\/$/, ""))
    : 1;
}

/** The default view keeps its page in the path. Search, filters and other sorts keep it in the query. */
export function tablePageUrl(
  current: URL,
  urlKey: string,
  state: TableUrlState,
  defaults: {
    sorting: SortingState;
    visibility: VisibilityState;
    pageSize: number;
  },
  crawlable?: CrawlablePagination,
): string {
  const defaultPage = isDefaultPaginationState(
    state,
    defaults.sorting,
    defaults.pageSize,
  );
  const query = serializeTableUrlState(
    current.searchParams,
    urlKey,
    crawlable && defaultPage
      ? { ...state, pagination: { ...state.pagination, pageIndex: 0 } }
      : state,
    defaults.visibility,
    defaults.sorting,
  );
  const pathname = crawlable
    ? listPageUrl(
        crawlable.basePath,
        defaultPage ? state.pagination.pageIndex + 1 : 1,
      )
    : current.pathname;
  return query ? `${pathname}?${query}` : pathname;
}
