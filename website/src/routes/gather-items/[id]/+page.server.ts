import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import {
  getFishingSpotVariantDetails,
  getGatheringResourceByIdFromDb,
  getGatheringResourceDropsFromDb,
  getGatheringResourceSpawnsFromDb,
} from "$lib/queries/gather-items.server";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { gatheringResourceDescription } from "$lib/server/meta-description";
import { gatheringResourcePageIds } from "../../../../scripts/gathering-resource-ids.mjs";
import {
  PROFESSION_MECHANICS,
  linearProcChance,
} from "$lib/data/professions/mechanics";
import { commonItemProbability } from "$lib/utils/primary-rewards";
import { projectAcquisitionNames } from "$lib/acquisition/projections";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const resources = db
    .prepare("SELECT id, is_fishing_spot FROM gathering_resources")
    .all() as { id: string; is_fishing_spot: number }[];
  db.close();

  return gatheringResourcePageIds(resources).map((id) => ({ id }));
};

export const load: PageServerLoad = async ({ params }) => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const resource = await getGatheringResourceByIdFromDb(db, params.id);

  if (!resource) {
    db.close();
    throw error(404, "Gathering resource not found");
  }

  const fishingSpotVariants = resource.is_fishing_spot
    ? await getFishingSpotVariantDetails(db, resource)
    : [];
  const rods = resource.is_fishing_spot
    ? (db
        .prepare(
          `
          SELECT id AS item_id, name AS item_name, quality, tooltip_html
          FROM items
          WHERE weapon_category = 'Fishing Rod'
          ORDER BY quality, name
        `,
        )
        .all() as {
        item_id: string;
        item_name: string;
        quality: number;
        tooltip_html: string | null;
      }[])
    : [];
  const fishPoolRows = resource.is_fishing_spot
    ? (db
        .prepare(
          `
          SELECT entry.item_id, i.name AS item_name, i.quality, i.tooltip_html
          FROM loot_pool_entries entry
          JOIN loot_pools pool ON pool.id = entry.pool_id AND pool.kind = 'fishing_fallback'
          JOIN items i ON i.id = entry.item_id
          WHERE entry.withheld = 0
          ORDER BY i.quality, i.name
        `,
        )
        .all() as {
        item_id: string;
        item_name: string;
        quality: number;
        tooltip_html: string | null;
      }[])
    : [];
  const fishPoolsByQuality: Record<
    number,
    {
      item_id: string;
      item_name: string;
      quality: number;
      tooltip_html: string | null;
    }[]
  > = {};
  for (const fish of fishPoolRows) {
    (fishPoolsByQuality[fish.quality] ??= []).push(fish);
  }
  const selectedFishingSpotVariantIndex = Math.max(
    0,
    fishingSpotVariants.findIndex(
      (variant) => variant.resource.id === resource.id,
    ),
  );
  const selectedVariant =
    fishingSpotVariants[selectedFishingSpotVariantIndex] ?? null;
  const selectedResource = selectedVariant?.resource ?? resource;
  const drops =
    selectedVariant?.drops ?? getGatheringResourceDropsFromDb(db, resource.id);
  const spawns =
    selectedVariant?.spawns ??
    getGatheringResourceSpawnsFromDb(db, resource.id);
  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const resourceIds = fishingSpotVariants.length
    ? fishingSpotVariants.map((variant) => variant.resource.id)
    : [resource.id];
  const providerRows = db
    .prepare(
      `SELECT id FROM gathering_resource_spawns WHERE resource_id IN (${resourceIds.map(() => "?").join(",")})`,
    )
    .all(...resourceIds) as { id: string }[];
  const acquisition = await loadAcquisition(execute, {
    kind: "providers",
    providers: providerRows.map(({ id }) => ({ kind: "resource_spawns", id })),
  });
  const acquisitionMethods = [...acquisition.methodViews.values()];
  for (const drop of drops) {
    drop.actual_drop_chance = commonItemProbability(
      acquisitionMethods.filter(
        (method) =>
          method.kind === "gather" &&
          method.detail.resource_id === selectedResource.id,
      ),
      drop.item_id,
      selectedResource.is_fishing_spot ? "cast" : "attempt",
    );
  }
  const acquisitionItems = await loadAcquisitionItems(execute, acquisition);

  const zoneNames = [
    ...new Set(
      (fishingSpotVariants.length > 0
        ? fishingSpotVariants.flatMap((variant) => variant.spawns)
        : spawns
      ).map((spawn) => spawn.zone_name),
    ),
  ];
  const description = gatheringResourceDescription(
    {
      name: selectedResource.name,
      is_plant: selectedResource.is_plant,
      is_mineral: selectedResource.is_mineral,
      is_fishing_spot: selectedResource.is_fishing_spot,
      is_radiant_spark: selectedResource.is_radiant_spark,
      level: selectedResource.level,
      tool_required_name: selectedResource.tool_required_name,
      gathering_exp: selectedResource.gathering_exp,
      primaryRewards: selectedResource.primaryRewards,
      catches: [
        ...new Set(
          drops
            .filter((drop) => !drop.is_fishing_trash)
            .slice(0, 3)
            .map((drop) => drop.item_name),
        ),
      ],
      radiant_chance_min: linearProcChance(
        PROFESSION_MECHANICS.radiant_seeker.procChance,
        0,
      ),
      radiant_chance_max: linearProcChance(
        PROFESSION_MECHANICS.radiant_seeker.procChance,
        100,
      ),
    },
    zoneNames,
  );
  db.close();

  return {
    resource: selectedResource,
    drops,
    spawns,
    rods,
    fishPoolsByQuality,
    description,
    fishingSpotVariants,
    selectedFishingSpotVariantIndex,
    acquisitionMethods,
    acquisitionRows: acquisition.rows,
    acquisitionItems,
    acquisitionNames: projectAcquisitionNames(acquisition),
  };
};
