## Context

Current map data contains distinct portal rows (`queries/map.server.ts:49-82`; `queries/map-search.ts:244-256`) and renders their destinations as straight line segments (`map/layers.ts:691-744`). The game can also travel by NPC offers (`server-scripts/NpcTeleport.cs:16-40`), travel items (`server-scripts/TravelItem.cs:15-42`), and physical portals (`server-scripts/Portal.cs:25-75`). These sources do not establish walkable connectivity between arbitrary map points.

## Goals / Non-Goals

**Goals:** Establish the routing contract before building a graph. After that gate, publish conditional directed travel and an inspectable itinerary.

**Non-Goals:** No portal-only graph, no walking edge from shared parent-zone membership, no class-blind Wizard-only exit, no static destination for bind-point travel. No live map embedded in detail pages; that omission and its static-crop alternative are recorded in `complete-map-registry-ownership/design.md`.

## Decisions

### Gate 1: agree on a graph contract before publishing routes

Record a reviewed gate decision in this design before any provider, route table, route search, or itinerary change lands. It must choose graph-node granularity (physical portal, sub-zone endpoint, zone, or another unit), node versus physical-object identity, source-backed walking evidence, cost units, route objective, transfer treatment, requirement evaluation, current availability, and runtime bind handling. It must cite data and game sources for each choice and show counterexamples: two exits on different dungeon floors, two points in one parent zone with no proven path, a closed portal, and an unbound or differently bound player. Decisions about objective and costs are product decisions, not implementation defaults. Until the gate has a complete reviewed record, the tasks below are blocked by task 1; this document makes no unverified numeric walking or transfer claim.

### Travel evidence and provider boundary

`Portal.cs:25-75` checks destination, closure, living blocker, key possession, level, and total item level. The key check distinguishes each player carrying their own key from a party where any online party member has one (`Portal.cs:47`). `NpcTeleport.cs:16-40` requires a destination and may charge gold. `TravelItem.cs:17-42` blocks use in the Temple of Valaark, consumes a charge if finite, and resolves `Bind Point` from the player's current bind zone and position (`:22-29`). Requirements describe a possible edge; they do not establish current availability. Source-backed `Evacuate` class and destination rules, plus Gate Scroll and death/bind escape semantics, must be located and cited in the gate before publishing those providers. Candidate providers do not prove completeness.

Retain one graph edge per usable physical portal, rather than deduplicating by zone pair. Keep direction, mechanism, physical endpoint, cost, requirements, and availability as separate fields. Never let raw database rows bypass release and redaction filtering. Build checks must reject unresolved endpoints, missing required provider families, stale game-version evidence, and routes to redacted or unreleased nodes. Test graph reachability against reviewed source/destination cases rather than row counts alone.

### Separate all-portal visualization from route eligibility

The portal and arc controls have separate visibility keys, but toggling portals also sets the arc key (`map/url-state.ts:56-93`; `map/visibility.ts:8-23`). `layers.ts:691-744` draws enabled destination lines as straight chords. Keep distinct physical arcs in the all-arcs view, subdued by default; use curvature and hover or selection emphasis without merging portals. Differentiate cross-zone and intra-zone arcs. An arc is visual context, not proof that its portal is traversable under the visitor's current conditions. Registry-owned arc production belongs to `complete-map-registry-ownership`; this change owns curvature and interaction.

### Retain one search index

`queries/map-search.ts:454-499` enriches the existing ranked index with geometry; route lookup must not create another document-search index. Itinerary search uses the reviewed graph and reports no supported route when endpoints or conditions fail. Routes do not manufacture walking connections to make a journey seem complete.

## Risks / Trade-offs

- [Risk] Unknown walking connectivity makes routes sparse. → Prefer a partial but truthful graph; publish a walking edge only with specific evidence.
- [Risk] Bind destinations and server state change after export. → Keep dynamic destinations and availability explicit; do not promise an executable route from static data alone.
- [Risk] Curved arcs obscure dense zones or cost a per-frame allocation. → Reuse stable arc data and measure the real map at both viewports.

## Migration Plan

First complete and approve Gate 1. Then add versioned evidence, directed providers, validation, routing, and itinerary in that order. Land portal-arc styling with browser interaction checks, keeping existing map links and marker identities. If the gate lacks evidence for a provider or walking edge, do not publish that edge or a dependent route.
