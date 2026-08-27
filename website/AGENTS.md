# Website

SvelteKit 2 and Svelte 5 compendium. The Cloudflare adapter prerenders all routes except the dynamic home page.

Path-specific constraints are in `rule://website-boundaries`.

Path-specific mechanics constraints are in `rule://website-mechanics`. Map constraints are in `rule://interactive-map`.

## Verification

Run focused tests first. Run `pnpm check` and `pnpm lint` for TypeScript or Svelte changes. Run `pnpm build` and the affected browser smoke when changing prerendered output, hydration, database delivery, routes, or deployment behavior. Update mechanics snapshots only for an intentional visible change and commit them with that change.
