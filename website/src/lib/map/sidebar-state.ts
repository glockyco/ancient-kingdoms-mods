export const MAP_SIDEBAR_COLLAPSED_KEY = "map-sidebar-collapsed";

export interface SidebarCollapsedReader {
  getItem(key: string): string | null;
}

export interface SidebarCollapsedWriter {
  setItem(key: string, value: string): void;
}

export function readStoredSidebarCollapsed(
  storage: SidebarCollapsedReader,
): boolean {
  return storage.getItem(MAP_SIDEBAR_COLLAPSED_KEY) === "true";
}

export function writeStoredSidebarCollapsed(
  storage: SidebarCollapsedWriter,
  isCollapsed: boolean,
): void {
  storage.setItem(MAP_SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
}
