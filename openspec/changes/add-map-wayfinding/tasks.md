## 1. Routing design gate — required before sections 2–5

- [ ] 1.1 Decide graph-node granularity, physical-portal versus node identity, cost units, route objective, transfer treatment, and unavailable-edge policy in `design.md`. Verify each decision against two exits on different dungeon floors and competing travel methods; obtain review before proceeding.
- [ ] 1.2 Record evidence for walking connectivity between specific endpoints, dynamic bind behavior, and conditional availability. Cite `server-scripts/Portal.cs:25-75`, `NpcTeleport.cs:16-40`, `TravelItem.cs:15-42`, relevant zone geometry, and discovered `Evacuate` source; verify shared parent-zone membership alone creates no walking edge.
- [ ] 1.3 Resolve Wizard-only `Evacuate`, Gate Scroll, and death/bind escape semantics and cite their game sources. Verify whether each is a provider, an alternative escape, or outside route scope, then obtain review of the complete gate record. Publish no route provider or route UI before 1.1–1.3 pass.

## 2. Source-backed directed providers — blocked by section 1

- [ ] 2.1 After gate approval, define versioned travel-edge records with source and destination node identity, physical-object identity, direction, mechanism, cost, requirements, and availability. Verify two physical portals sharing zone IDs remain separate endpoints in focused graph tests.
- [ ] 2.2 Publish physical portal and NPC teleporter providers with source-cited closure, level, key, blocker, and gold conditions. Verify the each-player and any-online-party-member key requirements and that a closed portal cannot enter a usable route.
- [ ] 2.3 Publish travel-item and Wizard-only `Evacuate` rules with source citations. Verify bind-point items never acquire a static destination and a class-blind route does not depend on `Evacuate`.
- [ ] 2.4 Add walking edges only for specific non-dungeon endpoints with proven connectivity. Verify that endpoints sharing a zone without evidence have no walkable edge.

## 3. Validated graph and routing — blocked by section 2

- [ ] 3.1 Build deterministic directed graph data after release/redaction filtering. Verify every public endpoint resolves, provider coverage and game-version evidence are complete, and no redacted or unreleased endpoint is published.
- [ ] 3.2 Implement route search using the gate's approved cost objective and conditions. Verify direction, transfers, competing costs, unreachable routes, and availability with focused behavioral cases.

## 4. Map presentation — blocked by section 3

- [ ] 4.1 Add source/destination selection and an itinerary on the map. Verify each step displays mechanism, explicit cost, requirements, and unavailable conditions; preserve existing map search index and entity deep links.
- [ ] 4.2 Replace straight portal chords in `layers.ts:691-744` with faint curved arcs, hover and selected emphasis, and distinct cross-zone and intra-zone treatment. Verify every physical portal remains individually selectable and marker ownership stays with `complete-map-registry-ownership`.

## 5. Release verification — blocked by sections 1–4

- [ ] 5.1 Run focused graph/provider/reachability tests and game-version and redaction checks. Verify missing endpoints and stale evidence fail the build instead of producing partial route tables.
- [ ] 5.2 Inspect portal arcs and routes in the actual browser at 1440×900 and 390×844. Verify hover, selection, accessibility, itinerary readability, and route failures, then run `pnpm check`, `pnpm lint`, and `pnpm build`.
