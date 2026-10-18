/**
 * Central configuration for icon badge styles.
 * Used by RoleBadges, QuestTypeBadge, QuestFlagBadges, and IconBadge components.
 */

export const ICON_BADGE = {
  /** Shared base styles for all icon badges */
  base: "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
  /** Styles for non-interactive badges (span) */
  static: "bg-muted/40",
  /** Styles for interactive badges (links) */
  link: "border bg-muted/50 transition-colors hover:bg-muted",
  /** Standard icon size for badges */
  iconSize: "h-4 w-4",
} as const;

/**
 * Get the full class string for an icon badge.
 */
export function getIconBadgeClass(isLink: boolean, extra?: string): string {
  const variant = isLink ? ICON_BADGE.link : ICON_BADGE.static;
  return `${ICON_BADGE.base} ${variant}${extra ? ` ${extra}` : ""}`;
}
