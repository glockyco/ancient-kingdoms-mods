---
title: "Compendiums.org Site Design"
type: spec
status: active
created: 2026-06-13
parent:
superseded_by:
archived:
---

# Compendiums.org Site Design

## Goal

Create a small apex-domain site at `https://compendiums.org` that acts as the public directory for the compendium projects, while keeping each individual compendium on its own subdomain, Worker, release process, and repository.

## Current context

`ancient-kingdoms.compendiums.org` is already deployed through `ancient-kingdoms-compendium-site` as a Cloudflare Workers Static Assets/SvelteKit site. `ardenfall-compendium/site/wrangler.toml` already targets `ardenfall.compendiums.org`. `Erenshor/src/maps/wrangler.jsonc` builds and deploys `erenshor-maps` as a static-assets Worker, but it does not yet declare a `compendiums.org` custom domain.

## Decision

Create a separate project named `compendiums-site` for the apex domain. The apex site is not part of Ancient Kingdoms, Ardenfall, or Erenshor. It owns only `compendiums.org` and optional `www` redirection. Each compendium remains independently deployable on its own Cloudflare Worker/custom domain.

This is the preferred Cloudflare shape because Workers Custom Domains are intended for hostnames where the Worker is the origin, and they point all paths of that exact hostname to that Worker. A static directory page does not need to proxy or dispatch traffic for subdomains.

## Cloudflare architecture

| Hostname | Owner | Worker |
| --- | --- | --- |
| `compendiums.org` | Landing/directory site | `compendiums-site` |
| `ancient-kingdoms.compendiums.org` | Ancient Kingdoms compendium | `ancient-kingdoms-compendium-site` |
| `ardenfall.compendiums.org` | Ardenfall compendium | `ardenfall-compendium-site` |
| `erenshor-maps.compendiums.org` | Erenshor interactive maps | `erenshor-maps` |

Use Workers Custom Domains, not path routes, for these hostnames. Keep `workers_dev = false` for public production sites unless a legacy workers.dev hostname is intentionally preserved for redirects.

`www.compendiums.org` should redirect to `compendiums.org` with a Cloudflare Redirect Rule. Cloudflare Custom Domains match exact hostnames, so `www` must be handled explicitly if it should work.

## `compendiums-site` Worker shape

Use Workers Static Assets with no Worker script for the first version. The project should emit static HTML/CSS/JS into `dist` or equivalent, then deploy that directory.

Preferred Wrangler config shape:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "compendiums-site",
  "compatibility_date": "2026-06-13",
  "workers_dev": false,
  "routes": [
    {
      "pattern": "compendiums.org",
      "custom_domain": true
    }
  ],
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page"
  },
  "observability": {
    "enabled": true
  }
}
```

Do not define `main`, `binding`, `run_worker_first`, KV, D1, R2, service bindings, or API routes unless a later requirement needs server-side behavior. Workers Static Assets supports asset-only Workers; an assets binding is only useful when Worker code needs to call `env.ASSETS.fetch()`.

Use `wrangler.jsonc` for the new project because current Cloudflare docs recommend it for new Wrangler projects. Treat Wrangler config as source of truth and avoid dashboard-only Worker configuration drift.

## Landing page content

The first page should be a lightweight directory, not a portal platform.

Required sections:

1. Hero: one sentence explaining that Compendiums hosts game-world data, maps, and reference sites.
2. Project cards:
   - Ancient Kingdoms: status `Available`; primary link to `https://ancient-kingdoms.compendiums.org`.
   - Ardenfall Compendium: status `Available`; primary link to the current public site until `https://ardenfall.compendiums.org` is migrated, then update the same card to the `compendiums.org` hostname. The card may describe the project as work-in-progress, but it should remain linked.
   - Erenshor Maps: status `Available`; primary link to the current public maps site until `https://erenshor-maps.compendiums.org` is migrated, then update the same card to the `compendiums.org` hostname.
3. Footer: small ownership/source/contact area. No analytics, newsletter, account system, or donation surface in the first version.

All three projects should be presented as usable today. Domain migration state belongs in supporting copy, not in disabled or coming-soon cards.

## Visual direction

Keep the visual system neutral and durable: dark/light responsive layout, one compact grid of cards, accessible link targets, semantic headings, and no heavy animation. Each card can use a short accent line or icon, but the apex site should not copy any one game's brand so it does not imply that Ancient Kingdoms is the parent project.

## Migration sequence

1. Create and deploy `compendiums-site` to `compendiums.org`.
2. Add a Cloudflare Redirect Rule for `www.compendiums.org` to `https://compendiums.org` if `www` should be supported.
3. Keep Ancient Kingdoms unchanged.
4. Deploy Ardenfall to its already-declared `ardenfall.compendiums.org` custom domain when production artifacts are ready.
5. Add a custom domain route for Erenshor maps in `Erenshor/src/maps/wrangler.jsonc`, then deploy it to `erenshor-maps.compendiums.org` when its current host migration is ready.
6. Update card hostnames as each subdomain migrates, without changing the cards' `Available` status.

## Non-goals

- Do not build a reverse proxy or central routing Worker.
- Do not host compendium content under apex paths such as `/ancient-kingdoms`.
- Do not merge compendium deploy pipelines into the landing project.
- Do not add shared authentication, shared data storage, telemetry fan-in, or cross-site APIs.
- Do not make `compendiums-site` depend on generated game data.

## Verification

For the spec phase, verify that the design matches current Cloudflare guidance and existing repository configs.

For implementation, verify:

- local build emits static assets;
- accessibility smoke check passes for links/headings/contrast;
- `wrangler deploy` creates the `compendiums.org` Custom Domain from config;
- `https://compendiums.org` returns the landing page;
- `https://www.compendiums.org` redirects only if the Redirect Rule is configured;
- every project card points to a reachable public site;
- cards using pre-migration URLs clearly show the eventual `compendiums.org` hostname.

## References

- Cloudflare Workers Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Workers Static Assets configuration and bindings: https://developers.cloudflare.com/workers/static-assets/binding/
- Wrangler configuration source of truth and `wrangler.jsonc` recommendation: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare Workers best practices: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
