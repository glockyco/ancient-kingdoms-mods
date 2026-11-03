import { pocketCompendium } from "$lib/server/mod-manifest";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => ({
  releases: pocketCompendium().releases,
});
