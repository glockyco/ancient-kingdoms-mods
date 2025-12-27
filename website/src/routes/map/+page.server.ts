import {
  loadAllMapEntitiesServer,
  loadZoneListServer,
} from "$lib/queries/map.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const entityData = loadAllMapEntitiesServer();
  const zoneList = loadZoneListServer();
  return { entityData, zoneList };
};
