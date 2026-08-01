import Database from "better-sqlite3";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import {
  achievementGroupDetails,
  achievementGroupOrder,
  achievementGroups,
  achievementOrderIndex,
  type AchievementGroupId,
} from "$lib/data/achievements/catalog";
import {
  achievementAnchor,
  achievementRelationships,
  type AchievementRelationship,
} from "$lib/data/achievements/relationships";

export { achievementGroupOrder } from "$lib/data/achievements/catalog";

export interface AchievementPageRecord {
  id: string;
  anchor: string;
  name: string;
  description: string;
  hidden: boolean;
  displayOrder: number;
  unlockedIconPath: string;
  lockedIconPath: string;
  relationships: AchievementRelationship[];
  searchText: string;
}

export interface AchievementGroup {
  id: AchievementGroupId;
  name: string;
  description: string;
  achievements: AchievementPageRecord[];
}

export interface AchievementsPageData {
  total: number;
  groups: AchievementGroup[];
}

interface AchievementRow {
  id: string;
  name: string;
  description: string;
  hidden: number;
  display_order: number;
  unlocked_icon_path: string;
  locked_icon_path: string;
}

export function getAchievementsPageData(
  dbPath = DB_STATIC_PATH,
): AchievementsPageData {
  const db = new Database(dbPath, { readonly: true });
  let rows: AchievementRow[];
  try {
    rows = db
      .prepare(
        `
        SELECT
          id,
          name,
          description,
          hidden,
          display_order,
          unlocked_icon_path,
          locked_icon_path
        FROM achievements
        ORDER BY display_order
      `,
      )
      .all() as AchievementRow[];
  } finally {
    db.close();
  }

  if (rows.length !== 38) {
    throw new Error(`Expected 38 achievements, found ${rows.length}`);
  }

  const unknownIds = rows
    .filter((row) => achievementGroups[row.id] === undefined)
    .map((row) => row.id);
  if (unknownIds.length > 0) {
    throw new Error(`Achievements have no group: ${unknownIds.join(", ")}`);
  }

  const unorderedIds = rows
    .filter((row) => achievementOrderIndex[row.id] === undefined)
    .map((row) => row.id);
  if (unorderedIds.length > 0) {
    throw new Error(
      `Achievements have no display order: ${unorderedIds.join(", ")}`,
    );
  }

  rows.sort(
    (left, right) =>
      achievementOrderIndex[left.id] - achievementOrderIndex[right.id],
  );

  const grouped = new Map<AchievementGroupId, AchievementPageRecord[]>();
  for (const groupId of achievementGroupOrder) {
    grouped.set(groupId, []);
  }

  for (const row of rows) {
    const relationships = achievementRelationships[row.id] ?? [];
    const hidden = row.hidden === 1;
    const name = hidden ? "Hidden achievement" : row.name;
    const description = hidden
      ? "Steam does not show the unlock condition."
      : row.description;
    grouped.get(achievementGroups[row.id])?.push({
      id: row.id,
      anchor: achievementAnchor(row.id),
      name,
      description,
      hidden,
      displayOrder: achievementOrderIndex[row.id],
      unlockedIconPath: row.unlocked_icon_path,
      lockedIconPath: row.locked_icon_path,
      relationships,
      searchText: [
        name,
        description,
        ...relationships.map((item) => item.label),
      ]
        .join(" ")
        .toLocaleLowerCase(),
    });
  }

  return {
    total: rows.length,
    groups: achievementGroupOrder.map((id) => ({
      id,
      ...achievementGroupDetails[id],
      achievements: grouped.get(id) ?? [],
    })),
  };
}
