## Context

`website/src/lib/entities/entity-manifest.json:1-40` declares entity IDs, route prefixes, searchability, image metadata, and sitemap participation. `registry.ts:64-145` assigns icons and derives typed website identities. `website/scripts/build-sitemap-manifest.mjs:11-18` reads the same manifest. Existing registry and route tests check uniqueness and route existence (`registry.test.ts:9-31`, `entity-routes.test.ts:28-45`).

## Goals / Non-Goals

**Goals:** Record current website registry behavior with verified source evidence.

**Non-Goals:** Add implementation work, claim automatic discovery of routes, or specify map marker ownership here.

## Decisions

1. **Keep a narrow identity registry.** Shared entity definitions carry serializable identity and presentation metadata; icons are assigned by the typed registry, not the JSON manifest. The sitemap script consumes JSON without importing browser-side icon code. SQL stays in server-only modules. A single C#/Python/TypeScript master registry would obscure each runtime's responsibilities (`legacy design:45-54,69-72`).
2. **Keep map markers separate.** `website/src/lib/map/marker-registry.ts:97-120` owns marker sources, filter and visibility keys, icon sizes, selection, layering, and decorations. It references the website entity ID but does not make entity identity own marker behavior. PlanMapRegistry owns that capability's future spec.
3. **Describe shipped behavior only.** Detail URL generation includes special achievement anchors and game-guide links (`registry.ts:91-102`). Tests confirm unique IDs, searchable routing, sitemap tuples, and existing route paths. No new completeness check or architecture automation is claimed.

## Risks / Trade-offs

- [A consumer adds local identity without manifest ownership] → Treat the current registry as the shared identity contract in later changes; add completeness checks only when a real uncovered path is identified.
