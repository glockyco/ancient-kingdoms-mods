## Why

Map portal lines show destinations, but the site cannot explain a supported journey. A portal-only graph would omit other travel methods and could invent walking connectivity or publish unavailable routes.

## What Changes

- Gate all routing implementation on a written, source-backed design for graph nodes, cost units, objective, walking evidence, bind destinations, and availability.
- After that gate, publish directed, typed travel edges for physical portals, NPC teleporters, travel items, and Wizard-only `Evacuate`. Add walking edges only where connectivity evidence proves them.
- Add route search and an itinerary that states requirements, costs, and unavailable segments. Exclude redacted and unreleased content.
- Keep the all-portals view, replacing straight chords with subdued curved arcs that emphasize hovered or selected physical portals.

## Capabilities

### New Capabilities

- `map-wayfinding`: Evidence-gated travel graph, conditional routes, itinerary, portal-arc interaction, and completeness checks.

### Modified Capabilities

None. `interactive-map-navigation` continues to govern viewport zoom and pan.

## Impact

Map queries, game-versioned travel evidence, build checks, map layers, map search and interaction, itineraries, and route tests. The first implementation task creates the routing decision record; every edge and UI task depends on approval of that gate.
