## Purpose

Lets visitors examine evidence-backed travel options on the map without implying unsupported walking routes or guaranteed access.

## ADDED Requirements

### Requirement: Routing has a source-backed design gate

The project MUST NOT publish travel-edge providers, route tables, route search, or itinerary controls until a reviewed design records graph-node granularity, edge cost units, route objective, walking-connectivity evidence, dynamic bind resolution, and separate requirement and availability policies.

#### Scenario: Routing design is incomplete
- **WHEN** any gate decision lacks a documented contract or game-source evidence
- **THEN** route data and route controls remain unpublished

### Requirement: Directed travel edges retain mechanism and physical identity

After the gate passes, published edges MUST retain their mechanism, direction, physical source and destination, requirements, cost, and availability. Physical portals between the same pair of zones MUST stay distinct. Named sub-zone endpoints MUST remain distinguishable. Providers MUST cover usable physical portals, NPC teleporters, travel items, and Wizard-only `Evacuate` where source evidence supports them.

#### Scenario: Two dungeon exits share zone IDs
- **WHEN** two portals have the same source and destination zones but different physical exits
- **THEN** the route graph retains both portals and their respective endpoints

#### Scenario: Class-blind route
- **WHEN** the visitor has not selected a Wizard-capable player
- **THEN** a route does not rely on `Evacuate`

### Requirement: Dynamic and conditional travel is not presented as guaranteed

A travel item whose destination is the player's current bind MUST NOT receive a fixed destination. The itinerary MUST distinguish known requirements from current availability and MUST state requirements and costs for each step. It MUST not present an unavailable edge as a usable route.

#### Scenario: Bind-point travel item
- **WHEN** an item resolves its destination from a player's bind point
- **THEN** the route does not assume one static destination for that item

#### Scenario: Closed portal
- **WHEN** a portal is currently unavailable
- **THEN** the route does not present that portal as a usable passage

### Requirement: Walking and public graph are evidence bounded

The map MUST publish a walking edge only when evidence proves connectivity between its particular endpoints. Shared parent-zone membership MUST NOT count as proof. Unreleased or redacted nodes and edges MUST NOT appear in public routes. The graph check MUST fail when a required provider, endpoint, or version-backed edge is missing or invalid.

#### Scenario: Shared parent zone without a proven path
- **WHEN** two endpoints share a parent zone but no evidence proves a walkable path
- **THEN** the graph contains no walking edge between them

#### Scenario: Redacted endpoint
- **WHEN** a raw travel edge points at a redacted destination
- **THEN** neither that edge nor its destination appears in public routes

### Requirement: Map routes have clear itinerary and arc interactions

After the routing gate passes, visitors MUST be able to search supported routes and inspect a directed itinerary with its mechanisms and conditions. The map MUST retain an all-portal view with separate physical portals. Portal connections MUST appear as subdued curved arcs by default and emphasize the hovered or selected connection. Cross-zone and intra-zone arcs MUST be distinguishable.

#### Scenario: Inspect a route
- **WHEN** a visitor chooses reachable source and destination endpoints
- **THEN** the map shows ordered travel steps with their mechanism, cost, and requirements

#### Scenario: Hover one of two portals
- **WHEN** a visitor hovers one physical portal while both portal arcs are visible
- **THEN** that portal's curved arc becomes emphasized without merging the two exits
