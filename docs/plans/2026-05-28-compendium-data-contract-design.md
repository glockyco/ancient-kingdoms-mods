---
title: "Entity Addition Architecture"
type: spec
status: in-progress
created: 2026-05-28
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Entity Addition Architecture

## Goal

Reduce the cost and risk of adding a compendium entity without creating a cross-runtime framework that
hides game-specific mapping.

## Current state

Implemented:

- `entity-manifest.json` declares stable website entity identity, routes, searchability, artwork, and
  sitemap participation.
- `entityRegistry` provides the typed shared website contract.
- `markerRegistry` owns map presentation, partitioning, visibility metadata, and primary layer creation.
- Registry tests check unique identities, routes, searchability, marker coverage, URL keys, and paint order.
- DataExporter reports each explicit exporter result and fails required exporter failures.
- Pydantic models validate exported records before SQLite insertion.
- The artwork manifest, deterministic path rule, reconciliation, and required output checks are implemented.
- Pipeline statistics enumerate content tables from SQLite rather than maintaining another table list.

Still fragmented:

- `DataExporter.ExportAllData()` contains imperative exporter registration.
- Curated `classes.json` and `static_data.json` inputs are not yet separated from the immutable game-export session contract.
- Required game-export output is not promoted as one atomic export session with a content manifest.
- Composition ingestion does not yet consume the promoted session and curated inputs through an explicit contract.
- Pipeline loader imports and execution order remain centralized and manual.
- Simple one-file-to-one-table datasets still require individual loader wiring.
- Most route SQL and page-data assembly remain spread across route and query modules.
- No architecture check proves that every simple entity capability is reachable from its registry.

## Decisions

### Use narrow registries

Each registry owns one capability. Export orchestration, pipeline loading, shared entity identity, map
markers, search documents, and popup behavior are separate concerns. Do not create one master manifest
that crosses C#, Python, server-only TypeScript, and browser TypeScript.

### Keep mapping explicit

Game-object mapping remains in entity-specific exporters. Complex pipeline loaders remain custom.
Registries remove repeated orchestration; they do not turn game-specific rules into flags.

### Define a strict simple-loader boundary

A dataset qualifies for a shared simple loader only when all conditions hold:

- one JSON file maps to one SQLite table;
- one JSON element maps to one table row;
- Pydantic validation and the existing insert path cover the row;
- no junction writes, derivation, normalization, or file side effect occurs;
- dependency order is explicit;
- a required file cannot be absent.

Anything outside this boundary keeps a custom loader.

### Respect runtime boundaries

Server SQL stays in server-only modules. Shared entity definitions contain serializable identity and
presentation metadata. Browser search and map modules do not import `better-sqlite3` or server modules.

### Separate curated inputs from export sessions

`classes.json` and `static_data.json` are curated inputs. They are not game-export outputs, and they
must not be mixed into the immutable promoted session directory or its exporter manifest.

Composition ingestion takes one compatible promoted game-export session and the two curated inputs as
separate, explicit inputs. It validates the existing curated parity contract before it writes derived
SQLite data. A failed parity check cannot produce a partially composed database.

### Make complete runs identifiable

A successful export session must identify every required game-export output by exporter ID, path, byte
size, row count, and SHA-256. Downstream ingestion must consume one successful session instead of
scanning a directory that can contain mixed old and new files.

Atomic per-file writes are not sufficient when the session can fail after some files change. Use a
per-run staging directory and promote it only after every required exporter succeeds. Keep the last
promoted session unchanged when a required exporter fails.

### Name the implementation owners

- `harden-export-sessions` owns staging, manifest integrity, promotion, and ingestion of a complete
  session alongside separate curated inputs. It preserves curated metadata ownership and parity checks;
  it does not wait for loader-registration refactoring.
- `simplify-pipeline-loader-registration` owns the ordered dataset catalog, prerequisite checks, and
  simple-versus-custom loader registration. It does not own export-session promotion.
- `consolidate-server-read-models` owns server-only SQL, parsing, conversion, and page-data
  projections. It does not own browser registries or ingestion.

## Target architecture

### Export catalog

Create explicit exporter descriptors with a stable ID, required outputs, requiredness, and execution
function. Keep registration explicit and searchable. The catalog replaces the imperative result list;
it does not use reflection or filesystem discovery.

### Export session manifest

Write required game-export outputs into one staging directory. On success, emit a manifest and promote
the entire session as a new immutable version. Never append to or replace files in a promoted session.
On failure, keep the prior complete session unchanged. The manifest records identity, sizes, row counts,
hashes, locale, and game-build provenance.

### Pipeline catalog

Create an ordered catalog that declares each dataset's source inputs, model or models, table or tables,
prerequisites, and simple or custom loader. Validate that each prerequisite appears earlier in the
catalog and fail when a prerequisite is missing. Do not add a topological sorter until the catalog
contains a demonstrated dependency that cannot be represented by this ordered contract.

A simple loader keeps the narrow one-file, one-model, one-table shape. A custom loader may consume
multiple input files, models, and tables, and may compose or derive data explicitly. The composition
loader names the promoted session and curated inputs separately, then validates curated parity before
writing derived rows. Custom loaders do not need exception flags in the simple path. Preserve the
non-publishing loader mode: `load_all` without `static_dir` still populates a scratch database, but
must not publish artwork files or mutate source inputs.

Derive FTS optimization from SQLite schema metadata rather than a second hard-coded list.

### Server read models

Move repeated SQL, JSON parsing, boolean conversion, and page-data projection into server-only entity
read models. Route loaders remain thin adapters. Migrate one domain at a time and preserve the existing
page-data and URL contracts.

### Capability completeness

Architecture tests must reject duplicate IDs, duplicate output files, missing required outputs,
unreachable registry modules, invalid routes, unknown artwork domains, dual registration, and broken
dependency references.

## Work order

1. [ ] `harden-export-sessions`: define the export catalog without changing exporter mapping.
2. [ ] `harden-export-sessions`: add staged export-session promotion and the content manifest.
3. [ ] `harden-export-sessions`: make composition ingestion require one complete
   compatible game-export session plus separate curated `classes.json` and `static_data.json` inputs.
4. [ ] `simplify-pipeline-loader-registration`: define the ordered pipeline dataset catalog and
   prerequisite checks.
5. [ ] `simplify-pipeline-loader-registration`: migrate only qualifying datasets to the simple loader
   and retain custom multi-input loaders and non-publishing inspection mode.
6. [ ] `simplify-pipeline-loader-registration`: derive FTS optimization from SQLite schema metadata.
7. [ ] `consolidate-server-read-models`: move one small entity domain to a server-only read model and
   thin route adapters.
8. [ ] Add capability-completeness and runtime-boundary checks.
9. [ ] Measure the remaining edit sites for one simple and one complex entity addition.
10. [ ] Update entity-addition guidance from the measured final workflow.

## Acceptance

- A required exporter failure cannot change the last complete export session.
- Every promoted game-export output appears in one compatible content manifest.
- Composition ingestion accepts one immutable promoted session and separate curated `classes.json` and
  `static_data.json` inputs.
- Existing curated class/race parity checks and input validation remain enforced. Invalid composition
  cannot replace the last successfully built database.
- An ordered pipeline catalog validates prerequisites without a topological sorter.
- A simple pipeline dataset needs no new loader function or manual build-order call.
- Complex datasets keep explicit custom multi-input or multi-table loaders without exception flags in the
  simple path.
- Read-only loaders remain available for datasets that do not write rows.
- At least one route family uses server-only read models and thin adapters.
- Shared website registries remain the only owners of entity route, search, sitemap, and marker identity.
- Architecture checks reject collisions, dual ownership, missing outputs, and broken references.
- URLs, generated data, map behavior, and page-data contracts remain stable during each migration.

## Boundaries

- No reflection or filesystem auto-discovery.
- No schema registry service, ORM, broker, or lineage platform.
- No generated SQLite schema from Pydantic or JSON Schema.
- No generic entity page renderer.
- No big-bang migration of all exporters, loaders, routes, or map layers.
- No shared module that imports both server-only and browser database code.
