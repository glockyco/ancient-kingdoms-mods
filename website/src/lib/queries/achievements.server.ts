import { query } from "$lib/db.server";
import { achievementIdsLinkingTo } from "$lib/data/achievements/relationships";
import type { LinkedAchievement } from "$lib/types/achievements";

/** The achievements that point at a page, in the game's display order. */
export function getAchievementsLinkingTo(href: string): LinkedAchievement[] {
  const ids = achievementIdsLinkingTo(href);
  if (ids.length === 0) return [];
  const achievements = query<LinkedAchievement>(
    `SELECT id, name, description FROM achievements WHERE id IN (${ids.map(() => "?").join(", ")}) ORDER BY display_order`,
    ids,
  );
  if (achievements.length !== ids.length) {
    const found = new Set(achievements.map((achievement) => achievement.id));
    throw new Error(
      `Achievements linking to ${href} are missing: ${ids.filter((id) => !found.has(id)).join(", ")}`,
    );
  }
  return achievements;
}
