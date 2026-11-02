import { _pagination } from "../../+page.server";
import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;
export const entries = _pagination.entries satisfies EntryGenerator;
export const load = _pagination.load satisfies PageServerLoad;
