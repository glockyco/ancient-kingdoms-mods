---
title: "NPC Composite Visual Export Implementation Plan"
type: plan
status: implemented
created: 2026-04-27
parent:
superseded_by:
archived: 2026-06-25
---

# NPC Composite Visual Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incomplete NPC root-renderer visual export with a runtime-composited `npc/primary` image built from NPC body child renderers.

**Architecture:** Keep `VisualAssetRegistry` as the sole image/manifest writer. Add a DataExporter-side compositor that renders selected runtime `SpriteRenderer` children into one transparent PNG and records it as the existing `npc/primary` manifest kind. Monster, item, skill, pet, website, and build-pipeline consumption remain unchanged.

**Tech Stack:** C# MelonLoader DataExporter, Unity `SpriteRenderer`, `RenderTexture`, `Camera`, Newtonsoft.Json, runtime export verification.

---

## Scope decisions

- Keep the exported manifest kind as `npc/primary`.
- Change only the NPC image source contract from direct root `Npc.gameObject.SpriteRenderer` to a runtime composition of NPC body child renderers.
- Use the scene instance from each NPC group as the visual source because runtime probes showed templates do not carry enough body renderers for most NPCs.
- Prefer the `Front` child subtree for a stable primary pose.
- Exclude known UI/auxiliary subtrees: speech bubbles, HP/health/hit bars, minimap markers, labels, shadows, names, and unrelated UI.
- Do not export each child sprite separately.
- Do not use UnityPy/static asset matching or static fallbacks.
- Do not change website/build-pipeline consumption in this pass.

## Task 1: Add failing runtime verification

**Files:** generated data only.

- [ ] **Step 1: Run the NPC coverage verifier against the current export**

```bash
python - <<'PY'
import json
from pathlib import Path
rows = json.loads(Path('exported-data/visual_assets.json').read_text())
npc_rows = [row for row in rows if row['domain'] == 'npc' and row['kind'] == 'primary']
print('npc_primary_rows', len(npc_rows))
if len(npc_rows) < 200:
    raise SystemExit(1)
PY
```

Expected before implementation: fails with `npc_primary_rows 3`.

## Task 2: Add composite export support to VisualAssetRegistry

**Files:**
- Modify: `mods/DataExporter/Exporters/VisualAssetRegistry.cs`
- Modify: `mods/DataExporter/Models/VisualAssetData.cs` only if needed for existing manifest fields; avoid schema expansion unless required.

- [ ] **Step 1: Add `ExportComposite`**

Add a registry method that accepts domain/entity/kind/source metadata plus an ordered list of `SpriteRenderer` objects and writes one PNG. It should:

- return `null` only when the renderer list is empty
- throw for encode/write failures
- create a temporary root GameObject, child GameObjects with copied `SpriteRenderer` sprites/transforms/sorting, an orthographic camera, and a `RenderTexture`
- render to transparent background
- crop using the selected renderers' world bounds
- record `source_type = "UnityEngine.SpriteRenderer[]"`
- record `source_name` as a stable renderer-count summary
- record `sprite_name` and `texture_name` as null/omitted for composites
- use filename shape `Npc.gameObject.Front.SpriteRenderers_composite_{width}_{height}.png`

- [ ] **Step 2: Keep existing single-sprite behavior unchanged**

Run:

```bash
dotnet run --project build-tool build
```

Expected: build succeeds.

## Task 3: Select NPC body renderers

**Files:**
- Modify: `mods/DataExporter/Exporters/NpcExporter.cs`

- [ ] **Step 1: Change visual source selection only**

Keep `NpcData` canonical selection unchanged. For visual export:

```csharp
var visualSource = group.FirstOrDefault(n => n.gameObject != null && n.gameObject.scene.IsValid())
                ?? canonical;

VisualAssets?.ExportComposite(
    "npc",
    name,
    "primary",
    "Npc.gameObject.Front.SpriteRenderers",
    SelectPrimaryNpcRenderers(visualSource));
```

- [ ] **Step 2: Add `SelectPrimaryNpcRenderers`**

The helper should:

- return an empty list when `npc.gameObject` is null
- find the direct `Front` child first; use that subtree only when present
- include `SpriteRenderer` children with non-null sprites
- exclude inactive renderers only if they are not under the chosen `Front` subtree; under `Front`, include assigned body sprites even when currently inactive so offscreen/disabled zone NPCs still export
- exclude path segments containing speechbubble, hp, health, hitbar, bar, label, minimap, shadow, name, grid, background
- sort by sorting layer value, sorting order, transform depth, and path for deterministic composition

- [ ] **Step 3: Update docs**

Update `docs/data-export-guide.md`, `docs/visual-audit-runtime-findings.md`, and `mods/DataExporter/CLAUDE.md` to describe NPC primary as a DataExporter runtime composite from body child renderers.

- [ ] **Step 4: Build**

Run:

```bash
dotnet run --project build-tool build
```

Expected: build succeeds.

## Task 4: Runtime verification and commit

**Files:** generated data under `exported-data/`.

- [ ] **Step 1: Clean visual outputs**

```bash
rm -rf exported-data/images exported-data/visual_assets.json
```

- [ ] **Step 2: Run export**

```bash
dotnet run --project build-tool export
```

If the shell wrapper times out at 60s, inspect MelonLoader logs and continue only if the log shows `Exported visual_assets.json` and `All exports complete. Quitting.`

- [ ] **Step 3: Verify manifest coverage and files**

```bash
python - <<'PY'
import json
from collections import Counter
from pathlib import Path
rows = json.loads(Path('exported-data/visual_assets.json').read_text())
counts = Counter((row['domain'], row['kind']) for row in rows)
missing = [row['export_path'] for row in rows if not (Path('exported-data') / row['export_path']).is_file()]
npc_rows = [row for row in rows if row['domain'] == 'npc' and row['kind'] == 'primary']
print('counts', dict(counts))
print('npc_primary_rows', len(npc_rows))
print('missing', len(missing))
forbidden = sorted(kind for kind in counts if kind not in {('monster', 'primary'), ('npc', 'primary'), ('item', 'icon'), ('skill', 'icon')})
print('forbidden_kinds', forbidden)
if len(npc_rows) < 200 or missing or forbidden:
    raise SystemExit(1)
PY
```

Expected: `npc_primary_rows >= 200`, zero missing files, no forbidden kinds.

- [ ] **Step 4: Run tests and build**

```bash
uv run --project build-pipeline python -m unittest discover -s build-pipeline/tests
dotnet run --project build-tool build
```

Expected: tests and build succeed.

- [ ] **Step 5: Commit**

```bash
git add mods/DataExporter docs .omp/2026-04-27-npc-composite-visual-export-plan.md
git commit -m "fix(visuals): compose npc primary images from runtime renderers" -m "NPCs are built from modular child renderers rather than a root SpriteRenderer. Exporting the selected body renderer composite keeps the manifest runtime-authoritative while covering the actual NPC set."
```

Do not push.
