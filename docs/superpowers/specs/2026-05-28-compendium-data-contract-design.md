# Entity Addition Architecture Design

**Status:** Requires review.
**Date:** 2026-05-28
**Scope:** Reduce the cost and risk of adding new Ancient Kingdoms compendium entity types across exporter, build pipeline, website pages, search, popups, and the interactive map.

## Context confirmed locally

The compendium data flow is linear, but each entity type is wired through many
independent files:

```text
Game (IL2CPP Unity)
  -> MelonLoader DataExporter / MapScreenshotter
exported-data/*.json + exported-data/images/ + exported-data/screenshots/
  -> Python build-pipeline
website/static/compendium.db + website/static/images/ + website/static/tiles/
  -> SvelteKit prerendered pages + browser sql.js map/search/popup queries
Cloudflare Static Assets
```

The current architecture optimizes for directness in each layer, but not for
entity additions. Adding a new entity means repeating the same concepts in C#,
Python, SQL, TypeScript, Svelte route loaders, DataTable setup, map layer
setup, search, popup loading, URL selection, and often meta descriptions.

The local skills that document current workflows show the problem clearly:

- A new exporter requires a C# model, exporter class, and manual registration in
  `mods/DataExporter/DataExporter.cs`.
- A new loader requires a Pydantic model, SQLite schema, loader function,
  `loaders/__init__.py` export, and a manual call in
  `build-pipeline/src/compendium/commands/build.py`.
- A new overview page requires separate TypeScript types, direct SQL in a
  `+page.server.ts`, and a route-local Svelte DataTable configuration.
- A new detail page requires another route loader, static entries query, JSON
  parsing, page-data type, Svelte page, and optional metadata function.
- A new map layer requires edits to map entity unions, `MapEntityData`,
  `FilteredMapData`, server map query loading, map config colors/radii/icons,
  filtered data, `createLayers`, map toggles, URL/selection behavior, search,
  popup details, and often `MapLink`/`EntityPopup`.

Recent fishing work is a concrete example: the feature range from
`7c89a76^..b709dcd` changed 59 files across exporter, pipeline, schema,
denormalizers, map selection, search, popup, item sources, route loaders, route
UI, and tests.

## Problem statement

The highest-impact improvement is not a standalone data-contract enforcement
layer. Contract validation would catch drift, but by itself it adds another
maintenance surface and does not make entity work smaller.

The project needs an **entity addition architecture**: each entity type should
have one obvious home per layer, and shared infrastructure should consume those
entity modules instead of requiring edits in every central switch, union, query,
layer list, and route file.

The success metric is simple: adding a straightforward new entity should require
mostly adding an entity module and the entity-specific mapping, not modifying a
dozen unrelated central files.

## External research basis

Modern architecture guidance shaped this design and surfaced specific failure
modes the project should plan around. Notes from primary or mature sources:

### Vertical slice / modular monolith

- Start with explicit modules and treat boundary rules as executable, not as
  reference documentation. Modular monolith experience reports that
  package-by-feature, public-API surfaces, and verification tests are what keep
  module boundaries from collapsing back into a ball of mud.
  Sources:
  <https://martinfowler.com/bliki/MonolithFirst.html>,
  <https://blog.jetbrains.com/idea/2026/02/migrating-to-modular-monolith-using-spring-modulith-and-intellij-idea/>
- Common pitfalls: a shared `common` folder that absorbs everything; boundary
  violations driven by performance shortcuts; inadequate verification tests; and
  module boundaries set too early. Mitigations: keep `common` narrow, restrict
  imports through naming conventions and review, and add structural tests.
  Sources:
  <https://multiqos.com/blogs/modular-monolithic-architecture/>,
  <https://medium.com/@iamprovidence/modular-monolith-6bb4be9232cd>

### Plugin and extension-point registries

- Eclipse, Backstage, OpenStack stevedore, and similar projects converge on
  explicit, narrow extension points with documented public APIs, and explicit
  registration. Self-discovering plugin systems are tempting but cause hidden
  dependencies, fragile contracts, and hard-to-trace failures.
  Sources:
  <https://backstage.io/docs/backend-system/architecture/extension-points/>,
  <https://docs.openstack.org/stevedore/latest/user/essays/pycon2013.html>,
  <https://cs.uwaterloo.ca/~m2nagapp/courses/CS446/1195/Arch_Design_Activity/PlugIn.pdf>
- Common failure modes: registry growing into a global mutable singleton; core
  logic accreting `if-else` branches per extension; multiple plugins fighting
  over one responsibility; and missing duplicate/collision detection.
  Mitigations: validate uniqueness at startup, design APIs for addition-only
  semantics where possible, and prefer many small extension points over one big
  one.

### Metadata-driven ETL

- Metadata-driven pipelines work best when the generic path stays narrow and
  every exception path is explicit. Practitioners warn against accreting per-row
  exception flags inside one generic loader: when too many cases live in
  configuration, the framework becomes a worse DSL than the original code.
  Sources:
  <https://community.databricks.com/t5/technical-blog/metadata-driven-etl-framework-in-databricks-part-1/ba-p/92666>,
  <https://airbyte.com/data-engineering-resources/etl-pipeline-pitfalls-to-avoid>
- Recurring ETL pitfalls relevant to this repo: hardcoded paths, silent error
  handling, monolithic all-or-nothing runs, missing schema-change detection, and
  no validation/audit trail. Even a minimal per-run report with file, row count,
  duration, and status helps debugging without adopting a lineage platform.
  Sources:
  <https://airbyte.com/data-engineering-resources/etl-pipeline-pitfalls-to-avoid>,
  <https://openlineage.io/docs/>

### SvelteKit organization and runtime boundaries

- SvelteKit enforces server-only imports through `*.server.*` filenames and the
  `$lib/server` folder. The check is real at build/dev but disabled during
  Vitest, so tests cannot prove a module is safe to import client-side.
  Designs that put server and browser data access in the same module will leak
  server-only code to the client unless the file layout itself prevents it.
  Sources:
  <https://svelte.dev/docs/kit/server-only-modules>,
  <https://svelte.dev/docs/kit/project-structure>
- Keep `+page.svelte` files as composition, not as data owners. Put data
  shaping into testable server modules; route loaders should be thin adapters.
  The existing `website/src/routes/professions/fishing/fishing-page-data.server.ts`
  is a working local precedent for this pattern.

### deck.gl performance and layer management

- deck.gl rewards stable layer ids, stable data references, accessor functions
  that avoid per-frame allocation, and `visible: false` toggles instead of
  add/remove cycles. Picking is limited to ~256 pickable layers per `Deck`.
  Any registry-driven layer creation must preserve these properties or it will
  silently regress map performance.
  Source: <https://deck.gl/docs/developer-guide/performance>
- Filtering and projection should happen once at load, not on every render. The
  current code already follows that pattern with `createFilteredData`; the
  migration must keep it.

### Data contract validation

- JSON Schema Draft 2020-12 is the current recommended dialect for declarative
  validation, with mature validators in Python (`jsonschema`), JavaScript
  (Ajv), and .NET (NJsonSchema). Ajv strict mode catches silently ignored
  schema mistakes that the spec otherwise permits.
  Sources:
  <https://json-schema.org/overview/what-is-jsonschema>,
  <https://json-schema.org/understanding-json-schema/structuring>,
  <https://python-jsonschema.readthedocs.io/en/stable/>,
  <https://ajv.js.org/strict-mode.html>
- Pydantic v2 can generate Draft 2020-12 JSON Schema, so the pipeline can keep
  Pydantic as the source of truth and emit schema snapshots without a third
  hand-maintained field list.
  Source: <https://docs.pydantic.dev/latest/concepts/json_schema/>
- Treat contracts as agreements about structure, semantics, and evolution, not
  just schemas. Compatibility rules and run-time validation matter more than
  ceremony; full schema registries and Pact brokers are overkill for a
  single-repo pipeline.
  Sources:
  <https://docs.confluent.io/platform/current/schema-registry/fundamentals/data-contracts.html>,
  <https://microsoft.github.io/code-with-engineering-playbook/automated-testing/cdc-testing/>

## Design goals

1. **Reduce entity addition touchpoints.** Central registries should consume
   entity modules; adding a module should not require editing every map, search,
   or popup switch.
2. **Improve existing architecture, not bolt on paperwork.** Remove duplicated
   loaders, repeated map wiring, repeated page query shaping, and scattered
   entity metadata.
3. **Keep mechanics explicit.** Ancient Kingdoms-specific extraction and display
   logic stays readable in entity modules. No reflection magic. No generic
   entity renderer that hides real differences.
4. **Respect runtime boundaries.** Server-only and browser code live in
   different files. Designs must not blur the SvelteKit server/browser split.
5. **Use contract validation only at boundaries.** Validation protects export
   and load seams. It is not a parallel source of truth.
6. **Preserve current behavior while migrating.** URLs, generated database
   shape, map behavior, and page data should not change just because code moved.
7. **Migrate by cutover, never dual-register.** An entity is owned by exactly
   one path at a time. Hybrid support at system level is fine; dual ownership of
   a single entity is a failure state.
8. **Keep generic paths narrow.** The moment a dataset, layer, or page needs
   normalization, junction tables, special FK handling, or grouped selection,
   it stays explicit.

## Current architectural pain points

### Exporter registration and reliability

`mods/DataExporter/DataExporter.cs` has a long imperative exporter list. Each
exporter owns mapping logic, but registration and output reporting are repeated
plumbing.

Exporter classes also repeat scene-object scanning, prefab/template filtering,
zone lookup, position conversion, JSON writing, and count logging. Recipe/table
exporters and world-location exporters have especially similar shapes.

`mods/DataExporter/Exporters/BaseExporter.cs` currently catches JSON write
failures and only logs them, so exporter success is not a reliable signal. The
file is also written directly to its final path, so a partial run leaves a
mix of old and new files on disk that downstream code cannot distinguish from a
clean run.

### Pipeline loader duplication

`build-pipeline/src/compendium/commands/build.py` manually imports and calls
every loader in dependency order, and separately maintains a hard-coded FTS
optimize list.

`build-pipeline/src/compendium/loaders/core.py` has many simple loaders that
repeat: open one JSON file, instantiate a Pydantic model, call `insert_model`,
commit, print a count.

Other loaders are not simple: items populate normalized junction tables;
classes merge manual metadata with runtime combat data; gather items split into
gathering resources, chests, and fishing spot variants; visual assets copy
images. `build-pipeline/src/compendium/db.py` `insert_model` already has
table-specific JSON serialization, position flattening, faction normalization,
and skipped-field handling. Any “generic loader” must treat these as out of
scope, not as new metadata knobs.

### Website route and read-model duplication

Many `website/src/routes/**/+page.server.ts` files open `better-sqlite3`
directly, query rows, parse JSON, coerce SQLite booleans, generate entries, and
return page-specific shapes. Some newer helpers in `$lib/queries` and
`$lib/server` exist but adoption is inconsistent.

The same entity facts are reshaped separately for: overview pages, detail
pages, map prerender data, browser-side map search, browser-side popup details,
and map links/selected entity resolution. Server `better-sqlite3` and browser
`sql.js` are two different runtimes and must remain so; Cloudflare Workers
cannot run `better-sqlite3`.

`website/src/routes/professions/fishing/fishing-page-data.server.ts` shows a
working local pattern: a testable server module that owns SQL and shaping for
one page, with a thin route loader. This is the precedent to copy.

### Map capability spread

The map already has good local helpers, including `createEntityLayer` in
`website/src/lib/map/layers.ts` and the once-on-load `createFilteredData`. But
adding a new entity type still requires central edits across:

- `EntityType` union and specific map entity interface,
- `AnyMapEntity` union, `LayerVisibility`, `MapEntityData`, `FilteredMapData`,
- `loadAllMapEntitiesServer` and `createFilteredData`,
- map colors, radii, icon sizes,
- `createLayers`,
- sidebar sections, default visibility, URL state,
- search categories and ordering,
- popup detail dispatch,
- selection rules (`resolve-selection.ts`, `selection.ts`) including grouped
  identities like `selectionGroupId` for fishing spots and altar-only monsters,
- `MapLink` URL/parameter rules.

Selection is not uniformly keyed by `entity.id`. Monsters select by
`monsterId`, fishing spots by `selectionGroupId`, and some search results are
virtual entities that resolve to highlight groups later. A capability registry
must model that.

## Approaches considered

### A. Contract-first manifest and schemas

A neutral manifest of datasets, files, artifact keys, schemas, and
requiredness improves enforcement but does not reduce implementation effort by
itself. Use schemas later as guardrails, not as the central design.

### B. Website-only read models

Extracting SQL and JSON parsing into typed modules improves route maintainability
but does not reduce exporter/pipeline work and does not solve map capability
spread unless paired with capability registration.

### C. Pipeline-only generic loaders

Removing repeated simple Python loaders is valuable, but adding a mappable
entity still requires scattered website work.

### D. Entity feature modules plus narrow capability registries

Each entity type gets focused modules per runtime layer. Central systems
iterate small, explicit capability registries instead of knowing every entity.
Shared helpers cover only repeated plumbing: exporter scans, simple pipeline
loads, map layer construction, search registration, and popup loading.

This is the recommended approach. It directly reduces entity addition effort
while keeping entity-specific logic explicit and runtime-aware.

## Recommended architecture

Build toward **entity feature slices** with **narrow, runtime-respecting
capability registries**.

An entity slice is a small set of local modules, one per runtime, that own the
entity's mapping and capabilities. Public surfaces are registry entries (one
per relevant capability) and the read-model functions they reference.

```text
mods/DataExporter/
  Exporters/MyEntityExporter.cs    # entity-specific runtime mapping
  Models/MyEntityData.cs           # JSON DTO
  ExportCatalog.cs                 # one descriptor per output (added to)

build-pipeline/src/compendium/
  models.py                        # or later models/my_entity.py
  loaders/catalog.py               # one PipelineEntity entry
  schema.sql                       # table/index definition

website/src/lib/server/entities/my-entity/
  read-model.ts                    # SQL + parsing + projections (server-only)
  overview.ts                      # server overview row builder
  detail.ts                        # server detail builder + entry ids
  map.server.ts                    # server map row builder

website/src/lib/entities/my-entity/
  definition.ts                    # stable kind/route/label metadata (shared)
  layer.ts                         # map layer capability descriptor (shared)
  search.client.ts                 # browser search capability (sql.js)
  popup.client.ts                  # browser popup capability (sql.js)
  meta.ts                          # optional title/description helpers
```

Server-only code lives under `$lib/server/entities/<entity>/` per SvelteKit's
server-only module rules. Shared metadata (kinds, labels, routes, layer
descriptors) lives under `$lib/entities/<entity>/`. Browser-only files use the
`.client.ts` convention for readability even though the runtime rule is
enforced only on the server side.

## Layer 1: Exporter catalog, atomic writes, run manifest

### Export descriptors

Replace the imperative `result.Exporters.Add(...)` blocks with explicit
descriptors:

```csharp
public sealed class ExportDefinition
{
    public required string Id { get; init; }
    public required IReadOnlyList<string> OutputFiles { get; init; }
    public required bool Required { get; init; }
    public required Func<ExportContext, ExporterRunResult> Run { get; init; }
}
```

`DataExporter.ExportAllData()` iterates a typed `ExportCatalog`. Registration
remains explicit and searchable. Each new exporter adds one descriptor line
plus its mapping class.

### Atomic writes and run manifest

`BaseExporter.WriteJson` must stop swallowing failures. Either it returns
output metadata or it throws.

Required output failures must make the exporter result fail. To prevent partial
runs leaving a stale/new mixture on disk, exporters either:

- write to a temp path beside the destination and rename atomically on
  success, or
- write into a per-run staging folder that is promoted to `exported-data/` only
  after the catalog completes successfully.

Either way, `ExportAllData` must emit a `run-manifest.json` listing the dataset
id, output paths, byte size, row count, and SHA-256 produced by this run. Build
tooling and pipeline ingestion read the manifest, not arbitrary `*.json` files.
This closes the silent partial-run window.

### Shared exporter helpers (only where patterns already repeat)

1. **Scene object scan helper** wrapping `Resources.FindObjectsOfTypeAll`,
   `TryCast`, and scene-vs-template filtering.
2. **World location helper** wrapping position extraction, zone/sub-zone
   lookup, display-name fallback, and id construction. Used by crafting
   stations, alchemy tables, scribing tables, houses, and similar world
   objects.
3. **Recipe table helper** wrapping table scanning, material projection, and
   duplicate suppression. Used by crafting, alchemy, and scribing recipes.

Helpers reduce plumbing without hiding mapping. Entity exporters still show
which game fields become which JSON fields.

## Layer 2: Pipeline entity catalog and narrow simple loader

### What “simple” means

A dataset qualifies for the generic loader only if **all** of the following
hold:

- It loads one JSON file into one SQLite table.
- Each JSON array element corresponds 1:1 to a table row.
- Row insertion is fully covered by existing `insert_model` behavior (with the
  current well-defined skipped fields treated as a fixed allowlist, not a per
  dataset knob).
- There are no junction-table writes, no derived tables, no FK fan-out, no file
  side effects, no Python-side normalization beyond what Pydantic already
  performs.
- If the dataset is required, the file must exist.

Anything outside this set stays a custom loader. The catalog records that the
loader is custom but does not pretend to configure it. This is deliberate: the
ETL literature consistently shows that the moment a generic loader accumulates
exception flags, it becomes worse than the original imperative code.

### Catalog shape

```python
@dataclass(frozen=True)
class PipelineEntity:
    id: str
    title: str
    json_file: str
    table: str | None
    model: type[BaseModel] | None
    dependencies: tuple[str, ...] = ()
    loader: Literal["simple", "custom"] = "simple"
    custom_loader: Callable[[sqlite3.Connection, Path], int] | None = None
    fts_table: str | None = None
    optional: bool = False
```

`build.py`:

1. Loads the catalog.
2. Topologically sorts by `dependencies`. Cycles abort before database
   creation.
3. Creates the database from `schema.sql`.
4. Runs simple loaders through one shared implementation and custom loaders
   through their declared callable.
5. Runs denormalizers (unchanged for this slice).
6. Optimizes FTS tables from `fts_table` metadata or from `sqlite_master`
   introspection of `*_fts` virtual tables. The hand-maintained FTS optimize
   list is removed.

### Simple loader

```python
def load_simple_entity(
    conn: sqlite3.Connection,
    export_dir: Path,
    entity: PipelineEntity,
) -> int:
    path = export_dir / entity.json_file
    if not path.exists():
        if entity.optional:
            return 0
        raise FileNotFoundError(f"required dataset {entity.id} missing: {path}")

    data = read_json_array(path)
    rows = [entity.model.model_validate(item) for item in data]

    cursor = conn.cursor()
    for row in rows:
        insert_model(cursor, entity.table, row)
    conn.commit()
    return len(rows)
```

Custom loaders remain bespoke functions referenced from the catalog. Current
custom candidates: `static_data`, `classes`, `items`, `gather_items`,
`visual_assets`, and any loader that writes multiple tables, derives
relations, or has filesystem side effects.

### Build run report

Emit a minimal `build-report.json` next to the database after every build with
one record per dataset: `id`, `source_file`, `row_count`, `duration_ms`,
`status`, `error_message`. This is local audit metadata. It is not lineage
tooling and does not require a service. It exists to make pipeline failures
debuggable without re-running the whole build.

### Validation as guardrail

After the catalog is in place, generate JSON Schema Draft 2020-12 snapshots
from the Pydantic models, check them into the repo, and add a drift test.
Validate exported JSON files against those snapshots before Pydantic
construction. This is the Slice 7 deliverable, not the core architecture.

## Layer 3: Website entity modules

### Runtime split is a first-class constraint

Each entity is split across at least two directories:

- `website/src/lib/server/entities/<entity>/` owns server SQL, Pydantic-style
  parsing, boolean/JSON coercion, route projections, and entry-id generation.
  These files import `better-sqlite3` directly or via `$lib/db.server`. They
  must never be imported from client code.
- `website/src/lib/entities/<entity>/` owns shared metadata
  (`definition.ts`), capability descriptors that need to be readable from both
  server and browser (`layer.ts`), and browser-only `*.client.ts` modules for
  search/popup logic that uses `$lib/db` (sql.js).

SvelteKit's server-only import detection enforces this at dev/build time but is
disabled in Vitest, so reviewers must read each new file's imports and ensure
no `*.client.ts` or shared file pulls a `$lib/server/...` path.

### Definition module

`definition.ts` owns the stable, runtime-agnostic identity of an entity:

```ts
export const monsterEntity = defineEntity({
  kind: "monster",
  pluralKind: "monsters",
  label: "Monster",
  pluralLabel: "Monsters",
  route: "/monsters",
  idParam: "id",
});
```

Central helpers consume this for breadcrumbs, link generation, JSON-LD types,
and central labels. The point is to stop repeating kind strings, not to render
pages generically.

### Read-model module

`read-model.ts` (under `$lib/server/entities`) owns server-side SQL and
projections:

```ts
export function getMonsterEntryIds(db: Database.Database): string[];
export function getMonsterOverviewRows(db: Database.Database): MonsterOverviewRow[];
export function getMonsterDetail(db: Database.Database, id: string): MonsterDetail | null;
export function getMonsterMapRows(db: Database.Database): MonsterMapEntity[];
```

Route loaders call these functions. Routes do not open-code SQL or JSON
parsing unless the query is genuinely route-specific.

### Overview/detail builders

`overview.ts` and `detail.ts` (under `$lib/server/entities`) return route page
data using the read-model functions, plus title/description helpers and entry
generators for static prerendering.

Route files become thin adapters, mirroring the existing
`fishing-page-data.server.ts` precedent. Do not introduce a generic
`defineOverview` / `defineDetail` DSL until at least two migrated entities have
proven they share the same shape. Generic page configuration is explicitly out
of scope until then.

## Layer 4: Three narrow map capabilities

Selecting, rendering, searching, and previewing entities are related but
materially different concerns. Forcing them through one `MapEntityCapability`
interface fails as soon as the first non-trivial entity arrives.

The design uses three small registries instead of one big one.

### MapLayerCapability (server + shared)

Owns server-side row loading and the descriptor needed to build one map layer.

```ts
export interface MapLayerCapability<TRow extends MapEntity> {
  key: string;                               // unique stable key
  entity: EntityDefinition;
  section: SidebarSection;                   // for grouping
  order: number;                             // sidebar/order index
  defaultVisible: boolean;
  visibilityKey: keyof LayerVisibility;
  label: string;
  color: [number, number, number];
  iconSize: IconSize;
  loadServer: (db: Database.Database) => TRow[];
  filterRenderable?: (rows: TRow[]) => TRow[];
  createLayer?: EntityLayerFactory<TRow>;    // optional override
  selection: SelectionStrategy<TRow>;        // see below
}
```

Central map code iterates capabilities to:

- build `MapEntityData`,
- initialize layer visibility defaults,
- render sidebar sections and toggles in declared order,
- pre-filter once via `createFilteredData`,
- create standard entity layers with stable ids and stable data references,
- prefer `visible: false` toggles over adding/removing layers (deck.gl guidance),
- avoid recreating data arrays per render.

`SelectionStrategy` makes selection identity explicit:

```ts
export type SelectionStrategy<TRow extends MapEntity> =
  | { kind: "by-entity-id"; getId: (row: TRow) => string }
  | { kind: "by-group"; getGroupId: (row: TRow) => string }
  | { kind: "delegated"; resolve: (row: TRow) => SelectionTarget };
```

This captures monsters that select by `monsterId`, fishing spots that select
by `selectionGroupId`, and altar-only monsters that delegate to their altar
marker. The registry must support these from day one or the first complex
migration will reintroduce central switches.

### MapSearchCapability (browser)

Owns one browser-side search category. Categories may resolve to physical map
entities or to virtual entities that highlight a set of physical entities.

```ts
export interface MapSearchCapability {
  category: SearchCategory;
  order: number;
  label: string;
  search: (db: SqlJsDatabase, query: string, limit: number) => Promise<MapSearchResult[]>;
  resolveSelection: (result: MapSearchResult) => SelectionTarget;
}
```

The central search dispatcher iterates capabilities in declared order, applies
round-robin distribution as today, and resolves the chosen result through the
capability's `resolveSelection`. Items and quests register as virtual
capabilities; physical entities register their own.

### MapPopupCapability (browser)

Owns lazy popup detail loading.

```ts
export interface MapPopupCapability<TRow extends MapEntity> {
  matches: (entity: AnyMapEntity) => entity is TRow;
  load: (db: SqlJsDatabase, entity: TRow) => Promise<PopupDetails>;
  href: (entity: TRow) => string;
  title: (entity: TRow) => string;
}
```

`EntityPopup.svelte` becomes a dispatcher that picks the first matching
capability instead of branching on `entity.type`.

### Migration target

Start with non-complex point layers whose current wiring is the most
repetitive:

- houses,
- chests,
- treasure locations,
- altars,
- crafting/alchemy/scribing tables.

Do not start with monsters, NPCs, portals, or gathering subtypes. Those have
classifications, role-bitmask visibility, patrols, spawn relations, teleport
arcs, grouped fishing spots, and world-boss logic. Migrate them only after the
three small capability shapes have proven themselves on simple layers. If a
complex layer cannot be expressed through `createLayer`/`selection` overrides,
keep it explicit rather than forcing it into the registry.

## Layer 5: Thin route adapters (only after read models stabilize)

Once read-models and detail/overview builders are in place for a migrated
entity, routes become small adapters:

```ts
export const prerender = true;
export const entries = getMonsterEntryIds;
export const load: PageServerLoad = ({ params }) => getMonsterDetailPageData(params.id);
```

If the same adapter shape appears two or more times, extract a helper. Do not
extract one preemptively.

## Target add-entity workflows

### New simple non-mappable entity

Expected files after migration:

1. `mods/DataExporter/Models/MyEntityData.cs`
2. `mods/DataExporter/Exporters/MyEntityExporter.cs`
3. One `ExportCatalog` descriptor.
4. Pydantic model.
5. SQL table/index block.
6. One `PipelineEntity` catalog entry.
7. `website/src/lib/entities/my-entity/definition.ts`.
8. `website/src/lib/server/entities/my-entity/read-model.ts`.
9. `overview.ts` / `detail.ts` and route adapters as needed.

No new simple loader function. No `loaders/__init__.py` edit. No `build.py`
manual call. No FTS optimize list edit. No hand-written entry query repeated
in each route.

### New simple mappable point entity

Add the non-mappable workflow plus:

1. `website/src/lib/entities/my-entity/layer.ts` exporting one
   `MapLayerCapability`.
2. `website/src/lib/server/entities/my-entity/map.server.ts` providing
   `loadServer`.
3. Optional `search.client.ts` and `popup.client.ts` capability descriptors.

No manual edits to central map layer creation, layer visibility defaults,
sidebar toggles, search category dispatch, popup dispatch, or `MapLink` rules
unless the entity needs custom behavior.

### New complex entity

Complex entities keep custom mapping. The architecture should still reduce
surrounding boilerplate:

- custom exporter using the scene-object/world-location helpers when
  applicable,
- custom pipeline loader registered through the catalog,
- entity-specific overview/detail components,
- map layer that overrides `createLayer` and `selection` while still
  registering as a capability.

The capability registration is what keeps complex entities visible to central
infrastructure even when their implementation is bespoke.

## Migration discipline

- One entity is owned by exactly one path at a time. Adding a migrated
  capability requires removing the legacy registration in the same change.
- Hybrid support at the system level is fine; per-entity dual registration is
  a failure state surfaced by validation tests.
- Each slice must independently improve an existing path. No slice depends on
  completing the whole architecture.
- Each migrated entity must come with tests covering at least one route, one
  read-model projection, and (if applicable) layer/search/popup parity.

## Registry validation

Add architecture tests that fail builds on:

- duplicate entity `kind`, route, JSON file, table, exporter output file, FTS
  table reference, layer `visibilityKey`, layer `key`, search `category`, or
  popup `matches` overlap,
- pipeline dependency cycles,
- entity definitions whose `route` points to a route that does not exist (or
  vice versa),
- entities registered both in the legacy central switch and in the new
  capability registry,
- read-model functions referenced by a capability but not exported,
- exporter descriptor whose declared output file conflicts with another
  descriptor's output file.

These checks catch the most common registry failure modes (collisions,
half-migrations, broken references) without runtime cost.

## Testing strategy

### Exporter / build-tool

- `ExportCatalog` has unique ids and unique output files.
- A required exporter whose `WriteJson` throws yields `Ok = false` with an
  error.
- A required exporter cannot return success when its declared output file is
  missing or zero bytes.
- `run-manifest.json` lists every required output, with non-zero byte sizes.
- `build-tool export` rejects an export run where the manifest is missing or
  any required dataset's manifest entry is missing.

### Pipeline

- Dependency sort fails on cycles and produces the same load order as the old
  hand-maintained list for migrated entities.
- Generic simple loader loads a representative dataset into an in-memory
  SQLite database and produces identical rows to the previous bespoke loader.
- Missing required file aborts before loader execution.
- Optional absent files skip with a clear message.
- `build-report.json` is generated and contains a row per dataset.
- FTS optimize targets match between catalog metadata and `sqlite_master`
  introspection.

### Website

- Read-model fixture tests for SQL parsing and boolean/JSON coercion.
- For each migrated route, a parity test asserting the same page-data shape
  comes out of the new path as the old one.
- Selection strategy tests covering by-entity-id, by-group, and delegated
  cases on real data.
- Map layer capability test that visibility defaults, sidebar order, layer
  ids, and filtered data match the legacy `createLayers` output for the
  migrated layers.
- Search capability tests that round-robin distribution still works after
  category dispatch becomes registry-driven.
- Popup capability tests that the dispatcher picks the right handler for each
  entity kind.

### Static / architecture

- Server-only imports do not appear in shared or `.client.ts` modules
  (reviewable, since Vitest does not enforce this).
- Registry collision/uniqueness checks above.
- No entity dual-registered in legacy and new paths.

## Migration sequence

### Slice 1: Pipeline generic simple loader and catalog

- Add `PipelineEntity` metadata with dependency sorting.
- Add the narrow simple loader and the build report.
- Migrate 3-5 obviously simple datasets (e.g. professions, luck tokens, altars,
  recipes, zones).
- Derive FTS optimization from metadata or introspection.
- Tests prove row parity and dependency sort.
- Cutover only: any migrated dataset must be removed from the legacy call list
  and `loaders/__init__.py`.

### Slice 2: Exporter orchestration and run safety

- Add `ExportCatalog` descriptors.
- `WriteJson` fails required output errors.
- `BaseExporter` switches to temp-file + atomic rename, or per-run staging.
- `ExportAllData` emits `run-manifest.json`.
- `build-tool export` consumes the manifest instead of scanning `data.*`.
- Tests cover write failure, missing output, manifest verification, and stale
  artifact rejection.

### Slice 3: Website read-model + thin route adapter for one entity domain

- Pick a domain with repeated queries but manageable complexity (chests,
  altars, houses are good first candidates).
- Move SQL/parsing into `$lib/server/entities/<entity>/read-model.ts`.
- Reduce overview/detail route loaders to adapters that call read-model
  functions.
- Preserve existing page-data shapes.
- Add fixture tests.

### Slice 4: Map layer capability for simple point layers

- Define `MapLayerCapability` and `SelectionStrategy`.
- Migrate houses or chests first.
- Generate layer visibility defaults and sidebar metadata from capabilities.
- Replace central `loadAllMapEntitiesServer`/`createLayers` paths for migrated
  layers with capability iteration.
- Keep monsters, NPCs, portals, patrols, arcs, and zone polygons explicit.

### Slice 5: Search and popup capabilities

- Define `MapSearchCapability` and `MapPopupCapability`.
- Migrate the entity from Slice 4 plus one search-only virtual category (for
  example, items or quests).
- Replace central search/popup dispatch for migrated capabilities with registry
  iteration.
- Round-robin ordering stays central but is driven by capability `order`
  metadata.

### Slice 6: Second website domain

- Migrate a second entity through the same read-model + capability pattern.
- Only after two migrated entities share visible page-data shape should
  `defineOverview`/`defineDetail` helpers be extracted.

### Slice 7: Schema guardrails

- Generate Draft 2020-12 schema snapshots from Pydantic models.
- Validate JSON files before simple loader ingestion.
- Add snapshot drift tests.
- Optionally adopt Ajv strict mode for build-time generated-data validation.

## Acceptance criteria

The architecture is successful when:

1. Adding a simple pipeline dataset requires no new loader function,
   `loaders/__init__.py` edit, manual `build.py` call, or FTS optimize-list
   edit.
2. DataExporter registration is descriptor-driven, required output write
   failures cannot report success, and downstream tooling consumes a run
   manifest rather than scanning the output directory.
3. At least one existing website entity domain has SQL and parsing owned by a
   server-only read-model module and route loaders reduced to adapters.
4. At least one simple map point entity is driven by a `MapLayerCapability`
   for layer creation, sidebar visibility metadata, default visibility, and
   selection identity.
5. Search and popup dispatch for a migrated entity come from the capability
   registries, not central switches.
6. URLs, page-data shapes, generated database contents, and observable map
   behavior remain unchanged for migrated entities.
7. New-entity documentation changes from "edit these 20 central places" to
   "add these entity modules/descriptors; custom behavior only where needed."
8. Schema validation exists as a boundary guardrail (Slice 7), not as the core
   abstraction.
9. Architecture tests prevent registry collisions, dual registration, and
   broken capability references from merging.

## Non-goals

- No standalone cross-language manifest as the first deliverable.
- No schema registry service.
- No Pact broker or microservice contract platform.
- No OpenLineage/Marquez deployment; the local `build-report.json` is enough.
- No ORM.
- No reflection or filesystem-discovery-based exporter, loader, or capability
  registration.
- No fully generic entity page renderer.
- No SQLite schema generation from Pydantic or JSON Schema.
- No big-bang migration of monsters, NPCs, or the entire map.
- No shared file that imports both server-only `better-sqlite3` code and
  browser `sql.js` code.

## Risks and mitigations

### Risk: registries become a new maintenance burden

Mitigation: registries replace existing central lists and switches. A new
registry entry must delete or prevent at least one prior edit elsewhere.

### Risk: the generic loader accretes exception flags

Mitigation: the spec's definition of "simple" is the gate. Any dataset that
needs new metadata knobs is custom by definition. Reject pull requests that
expand `PipelineEntity` to support edge cases instead of staying custom.

### Risk: `MapLayerCapability` cannot model complex layers

Mitigation: monsters/NPCs/portals stay explicit. The capability supports
overrides (`createLayer`, `selection`) so a complex layer can register without
forcing its shape on others. If even overrides are not enough, keep the layer
out of the registry.

### Risk: server-only code leaks into the browser

Mitigation: file naming and folder placement enforce the split at the
SvelteKit level. Reviewers explicitly check `*.client.ts` and shared files for
`$lib/server/...` imports because Vitest does not.

### Risk: partial export runs corrupt downstream consumption

Mitigation: atomic writes or per-run staging plus a run manifest. Pipeline
ingestion uses the manifest.

### Risk: registries hide dual ownership or collisions

Mitigation: explicit architecture tests for uniqueness and dual registration.

### Risk: deck.gl layer churn from registry changes

Mitigation: capability iteration must produce stable layer ids and stable
prefiltered data references; visibility toggles via `visible: false`, not
add/remove. Layer/picking count budgets reviewed before merging.

### Risk: migration stalls halfway

Mitigation: each slice is independently valuable. Cutover discipline ensures
no entity ends up registered in both old and new paths.

### Risk: over-generalization disguised as YAGNI compliance

Mitigation: this design explicitly rejects a master cross-language manifest,
auto-discovery, and a generic page renderer. Reviewers cite this section when
new abstractions appear.

## Recommended next action

Write an implementation plan for Slice 1 through Slice 4. That sequence
delivers real architecture improvement: generic simple pipeline loads, atomic
exporter orchestration with a run manifest, one website read-model migration,
and one map layer capability migration. Schema validation and additional
website domains come after those foundations.
