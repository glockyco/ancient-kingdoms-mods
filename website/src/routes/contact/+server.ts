import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// The Discord user ID is a Worker secret, set with `wrangler secret put DISCORD_USER_ID`, so the
// repository and the published mod carry only this address.
export const prerender = false;

export const GET: RequestHandler = ({ platform }) => {
  const id = platform?.env.DISCORD_USER_ID;
  if (!id) error(503, "The contact address is not configured.");
  redirect(302, `https://discord.com/users/${id}`);
};
