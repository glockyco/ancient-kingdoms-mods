/**
 * Redirect-only Worker bound to the legacy hostname
 * `ancient-kingdoms-compendium.wowmuch1.workers.dev`.
 *
 * Every request is answered with a 301 to the same path/query on the
 * canonical custom domain. No static assets, no SvelteKit, no DB —
 * keeping the Worker tiny so it stays well inside the Workers free tier
 * even if the old hostname keeps receiving traffic from search engines
 * and existing inbound links.
 */

const TARGET_ORIGIN = "https://ancient-kingdoms.compendiums.org";

export default {
  fetch(request: Request): Response {
    const sourceUrl = new URL(request.url);
    const targetUrl = new URL(
      sourceUrl.pathname + sourceUrl.search,
      TARGET_ORIGIN,
    );
    const target = targetUrl.toString();

    return new Response(null, {
      status: 301,
      headers: {
        Location: target,
        Link: `<${target}>; rel="canonical"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
};
