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

// Google Search Console ownership verification for the legacy hostname. Google
// fetches this exact path and will not follow the cross-domain 301 below, so
// the path is exempt from the redirect and answered with the token directly.
// Keep the token in sync with website/static/google279cf61d0b725839.html
// (asserted by redirect-worker.test.ts).
const GOOGLE_VERIFICATION_PATH = "/google279cf61d0b725839.html";
const GOOGLE_VERIFICATION_BODY =
  "google-site-verification: google279cf61d0b725839.html";

export default {
  fetch(request: Request): Response {
    const sourceUrl = new URL(request.url);

    if (sourceUrl.pathname === GOOGLE_VERIFICATION_PATH) {
      return new Response(GOOGLE_VERIFICATION_BODY, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

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
