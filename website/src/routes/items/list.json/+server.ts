import { json } from "@sveltejs/kit";
import { getItemListPayload } from "$lib/queries/items.server";
import type { RequestHandler } from "./$types";

export const prerender = true;

export const GET: RequestHandler = async () => json(await getItemListPayload());
