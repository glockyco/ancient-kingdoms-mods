import { error } from "@sveltejs/kit";
import type { CrawlablePagination } from "$lib/components/ui/data-table/crawlable-pagination";

interface ListRouteEvent {
  params: Record<string, string | undefined>;
}

/** Share the same data source and page bounds between prerendering and requests. */
export function createListPagination<T>(
  basePath: string,
  pageSize: number,
  loadData: (page: number) => T | Promise<T>,
  rowCount: (data: T) => number,
) {
  async function pageData(page: number) {
    const data = await loadData(page);
    const total = rowCount(data);
    return { data, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async function load({ params }: ListRouteEvent) {
    const rawPage = params.page;
    const page = rawPage === undefined ? 1 : Number(rawPage);
    if (
      rawPage !== undefined &&
      (!/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(page) || page < 2)
    ) {
      error(404, "Page not found");
    }
    const { data, total, pages } = await pageData(page);
    if (page > pages) {
      error(404, "Page not found");
    }
    const crawlable: CrawlablePagination = { basePath, page, total, pageSize };
    return { ...data, crawlable };
  }

  async function entries() {
    const { pages } = await pageData(1);
    return Array.from({ length: pages - 1 }, (_, index) => ({
      page: String(index + 2),
    }));
  }

  return { basePath, load, entries };
}
