---
title: "Integrated Runtime Image Export Implementation Plan"
type: plan
status: implemented
created: 2026-04-27
parent:
superseded_by:
archived: 2026-06-25
---

# Integrated Runtime Image Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move selected runtime image extraction into the normal DataExporter export flow so `dotnet run --project build-tool export` produces JSON data, image files, and a visual manifest in one pipeline.

**Architecture:** DataExporter owns image extraction through a shared `VisualAssetRegistry` used by existing domain exporters. Exported images are written under `exported-data/images/...`; `visual_assets.json` records the authoritative mapping from `(domain, entity_id, kind)` to exported image metadata. Website/build-pipeline consumption is explicitly out of scope for this plan and will be planned separately.

**Tech Stack:** C# MelonLoader DataExporter, Unity `Sprite`/`SpriteRenderer`/`ImageConversion`, Newtonsoft.Json.

---

## Scope decisions

- Do not use worktrees. Do not push.
- Do not use UnityPy or static asset-name matching for visual mappings.
- Export only currently selected/useful visuals:
  - monster primary image
  - NPC primary image
  - item icon
  - skill icon
- Do not export treasure map images in this pass.
- Do not export any pet images in this pass.
- Do not export monster boss portraits, bestiary images, animation frames, child renderers, UI renderers, skill effects, or prefabs.
- Do not silently fall back to alternate visual sources when the selected source is missing.
- Do not integrate images into website pages or build-pipeline DB tables in this pass.

## Current visual export contract

| Domain | Kind | Runtime source | Behavior |
|---|---|---|---|
| `monster` | `primary` | Direct `SpriteRenderer` on `Monster.gameObject` | One image per canonical monster. This is the Ancient Cyclops `current_main_renderer` image (`Cyclops_1`). |
| `npc` | `primary` | Direct `SpriteRenderer` on `Npc.gameObject` | Same direct-renderer rule as monsters. |
| `item` | `icon` | `ScriptableItem.image` | Runtime item icon sprite. |
| `skill` | `icon` | `ScriptableSkill.image` | Runtime skill icon sprite. |

`docs/visual-audit-runtime-findings.md` remains the record for observed but excluded sources: boss portraits, bestiary images, animation clips, child UI renderers, treasure map images, pet images, skill effects, and static assets.

## Target files

### Create

- `mods/DataExporter/Models/VisualAssetData.cs`
- `mods/DataExporter/Exporters/VisualAssetRegistry.cs`

### Modify

- `mods/DataExporter/Exporters/BaseExporter.cs`
- `mods/DataExporter/DataExporter.cs`
- `mods/DataExporter/Exporters/MonsterExporter.cs`
- `mods/DataExporter/Exporters/NpcExporter.cs`
- `mods/DataExporter/Exporters/ItemExporter.cs`
- `mods/DataExporter/Exporters/SkillExporter.cs`
- `mods/DataExporter/CLAUDE.md`
- `docs/visual-audit-runtime-findings.md`

### Remove or de-authorize

- `tools/visual-audit/probes/*.csx`
- `build-pipeline/src/compendium/commands/visual_audit.py`
- `build-pipeline/src/compendium/visual_audit/*`
- `build-pipeline/tests/test_visual_audit_*.py`
- `build-pipeline/CLAUDE.md` visual-audit CLI references

Removal of the old visual-audit code is included because keeping a second runtime/UnityPy mapping pipeline would contradict the requested clean integration. Build-pipeline and website usage of the new manifest are separate future work.

---

## Task 1: Add DataExporter visual asset model and registry

**Files:**
- Create: `mods/DataExporter/Models/VisualAssetData.cs`
- Create: `mods/DataExporter/Exporters/VisualAssetRegistry.cs`
- Modify: `mods/DataExporter/Exporters/BaseExporter.cs`

- [ ] **Step 1: Add serialized manifest model**

Create `mods/DataExporter/Models/VisualAssetData.cs`:

```csharp
namespace DataExporter.Models;

public class VisualAssetData
{
    public string domain { get; set; }
    public string entity_id { get; set; }
    public string kind { get; set; }
    public string export_path { get; set; }
    public string source_field { get; set; }
    public string source_type { get; set; }
    public string source_name { get; set; }
    public string sprite_name { get; set; }
    public string texture_name { get; set; }
    public int width { get; set; }
    public int height { get; set; }
}
```

- [ ] **Step 2: Add shared registry**

Create `mods/DataExporter/Exporters/VisualAssetRegistry.cs` implementing:

- `ExportSprite(domain, entityId, kind, sourceField, sourceType, sourceName, Sprite sprite)`
- `ExportRendererSprite(domain, entityId, kind, sourceField, SpriteRenderer renderer)`
- `WriteManifest()` writing `visual_assets.json`
- image writes under `images/{domain}/{entity_id}/{kind}/`
- `export_path` relative to `ExportPath`
- Wine-safe writes through `Z:` for absolute macOS paths
- fail-loud behavior for non-null sprites that cannot be encoded/written

Use this exact path conversion pattern:

```csharp
private static string ToPortablePath(string path) => path.Replace("\\", "/");

private static string ToWritablePath(string path)
{
    var portable = ToPortablePath(path);
    return portable.StartsWith("/") ? "Z:" + portable : portable;
}
```

Use a stable filename shape that does not depend on runtime instance ids:

```text
{SafeSegment(sourceField)}_{SafeSegment(sprite.name)}_{rectX}_{rectY}_{rectW}_{rectH}.png
```

The registry should return `null` only when the selected source sprite/renderer itself is null. It should throw for encoding/write failures so broken image exports are visible.

- [ ] **Step 3: Add optional registry to `BaseExporter`**

Modify `mods/DataExporter/Exporters/BaseExporter.cs`:

```csharp
protected readonly VisualAssetRegistry VisualAssets;

protected BaseExporter(MelonLogger.Instance logger, string exportPath, VisualAssetRegistry visualAssets = null)
{
    Logger = logger;
    ExportPath = exportPath;
    VisualAssets = visualAssets;
}
```

Existing non-image exporters keep compiling through the optional parameter.

- [ ] **Step 4: Verify compile**

Run:

```bash
dotnet run --project build-tool build
```

Expected: build succeeds. If local setup is missing, report the exact missing `Local.props`/game-path prerequisite instead of changing local config without approval.

---

## Task 2: Wire one registry into the export run

**Files:**
- Modify: `mods/DataExporter/DataExporter.cs`
- Modify constructors in `MonsterExporter`, `NpcExporter`, `ItemExporter`, `SkillExporter`

- [ ] **Step 1: Instantiate one registry per export**

In `DataExporter.ExportAllData()`, after `startTime`:

```csharp
var visualAssets = new VisualAssetRegistry(LoggerInstance, ExportPath);
```

Pass it to image-producing exporters only:

```csharp
var monsterExporter = new MonsterExporter(LoggerInstance, ExportPath, visualAssets);
var npcExporter = new NpcExporter(LoggerInstance, ExportPath, visualAssets);
var itemExporter = new ItemExporter(LoggerInstance, ExportPath, visualAssets);
var skillExporter = new SkillExporter(LoggerInstance, ExportPath, visualAssets);
```

Do not pass it to `PetExporter` in this pass.

Before the final success log, write the manifest:

```csharp
visualAssets.WriteManifest();
```

- [ ] **Step 2: Update constructors**

For each image-producing exporter, add a registry constructor:

```csharp
public MonsterExporter(MelonLogger.Instance logger, string exportPath, VisualAssetRegistry visualAssets)
    : base(logger, exportPath, visualAssets)
{
}
```

Use the matching class name for `NpcExporter`, `ItemExporter`, and `SkillExporter`.

- [ ] **Step 3: Verify compile**

Run:

```bash
dotnet run --project build-tool build
```

Expected: build succeeds.

---

## Task 3: Register selected visuals from exporters

**Files:**
- Modify: `mods/DataExporter/Exporters/MonsterExporter.cs`
- Modify: `mods/DataExporter/Exporters/NpcExporter.cs`
- Modify: `mods/DataExporter/Exporters/ItemExporter.cs`
- Modify: `mods/DataExporter/Exporters/SkillExporter.cs`

- [ ] **Step 1: Monster primary image**

After canonical `MonsterData` is created in `MonsterExporter`, register only the direct primary renderer:

```csharp
var primaryRenderer = canonical.gameObject != null
    ? canonical.gameObject.GetComponent<SpriteRenderer>()
    : null;

VisualAssets?.ExportRendererSprite(
    "monster",
    name,
    "primary",
    "Monster.gameObject.SpriteRenderer",
    primaryRenderer);
```

Do not call `GetComponentsInChildren<SpriteRenderer>()`. Do not export `imageBossBestiary`, `portraitBoss`, or animator data.

- [ ] **Step 2: NPC primary image**

After canonical `NpcData` is created in `NpcExporter`, use the same direct-renderer rule:

```csharp
var primaryRenderer = canonical.gameObject != null
    ? canonical.gameObject.GetComponent<SpriteRenderer>()
    : null;

VisualAssets?.ExportRendererSprite(
    "npc",
    name,
    "primary",
    "Npc.gameObject.SpriteRenderer",
    primaryRenderer);
```

- [ ] **Step 3: Item icons only**

After `ItemData` is created in `ItemExporter`, register `ScriptableItem.image` as `item/icon`:

```csharp
VisualAssets?.ExportSprite(
    "item",
    itemData.id,
    "icon",
    "ScriptableItem.image",
    scriptableItem.image != null ? scriptableItem.image.GetType().FullName : "UnityEngine.Sprite",
    scriptableItem.image != null ? scriptableItem.image.name : null,
    scriptableItem.image);
```

Do not register `TreasureMapItem.imageLocation` in this pass.

- [ ] **Step 4: Skill icons only**

After `SkillData` is created in `SkillExporter`, register `ScriptableSkill.image` as `skill/icon`:

```csharp
VisualAssets?.ExportSprite(
    "skill",
    skillData.id,
    "icon",
    "ScriptableSkill.image",
    skill.image != null ? skill.image.GetType().FullName : "UnityEngine.Sprite",
    skill.image != null ? skill.image.name : null,
    skill.image);
```

- [ ] **Step 5: Verify compile**

Run:

```bash
dotnet run --project build-tool build
```

Expected: build succeeds.

---

## Task 4: De-authorize the standalone visual audit system

**Files:**
- Modify/remove:
  - `build-pipeline/src/compendium/cli.py`
  - `build-pipeline/src/compendium/commands/visual_audit.py`
  - `build-pipeline/src/compendium/visual_audit/*`
  - `build-pipeline/tests/test_visual_audit_*.py`
  - `tools/visual-audit/probes/*.csx`
  - `build-pipeline/pyproject.toml`
  - `config.toml`
  - `build-pipeline/CLAUDE.md`

- [ ] **Step 1: Remove visual-audit CLI registration**

Remove `visual-audit` Typer registration from `build-pipeline/src/compendium/cli.py` so runtime visual mapping is no longer exposed as a separate pipeline.

- [ ] **Step 2: Remove old probe/static mapping code**

Delete the standalone HotRepl probe scripts and Python visual-audit modules after DataExporter can build with the new registry.

- [ ] **Step 3: Remove unused UnityPy mapping dependency/config**

Remove `unitypy` from `build-pipeline/pyproject.toml` if no remaining code imports it. Remove the stale `[build_pipeline.icons]` UnityPy icon extraction config from `config.toml` if no implemented command reads it.

- [ ] **Step 4: Update build-pipeline guidance**

Update `build-pipeline/CLAUDE.md` so it describes visuals as DataExporter outputs (`visual_assets.json` and `images/`) rather than `compendium visual-audit probe/assets/reconcile` outputs.

- [ ] **Step 5: Verify build-pipeline tests**

Run:

```bash
uv run --project build-pipeline python -m unittest discover -s build-pipeline/tests
```

Expected: all remaining tests pass and no removed visual-audit imports remain.

---

## Task 5: Runtime export verification

**Files:** generated under `exported-data/`.

- [ ] **Step 1: Build and deploy mods**

Run:

```bash
dotnet run --project build-tool all
```

Expected: DataExporter and AutoExporter deploy successfully.

- [ ] **Step 2: Run full export**

Run:

```bash
dotnet run --project build-tool export
```

Expected: AutoExporter enters `World`, waits for local player, runs DataExporter, writes normal JSON files, writes `visual_assets.json`, writes images under `exported-data/images/`, and quits.

- [ ] **Step 3: Verify manifest and files**

Run:

```bash
python - <<'PY'
import json
from collections import Counter
from pathlib import Path
rows = json.loads(Path('exported-data/visual_assets.json').read_text())
counts = Counter((row['domain'], row['kind']) for row in rows)
missing = [row['export_path'] for row in rows if not (Path('exported-data') / row['export_path']).is_file()]
print('rows', len(rows))
print('counts', dict(counts))
print('missing', len(missing))
expected = {('monster', 'primary'), ('npc', 'primary'), ('item', 'icon'), ('skill', 'icon')}
absent = sorted(expected - set(counts))
print('absent_expected_kinds', absent)
if missing or absent:
    if missing:
        print('\n'.join(missing[:20]))
    raise SystemExit(1)
PY
```

Expected: zero missing files and non-zero counts for `monster/primary`, `npc/primary`, `item/icon`, and `skill/icon`. There should be no `pet/*` or `item/treasure_map` rows.

---

## Task 6: Documentation and commit

**Files:**
- Modify: `mods/DataExporter/CLAUDE.md`
- Modify: `build-pipeline/CLAUDE.md`
- Modify: `docs/visual-audit-runtime-findings.md`
- Modify or create: `docs/data-export-guide.md` only if keeping the current `mods/DataExporter/CLAUDE.md` reference to that path.

- [ ] **Step 1: Update DataExporter docs**

Document that DataExporter writes `visual_assets.json` and `images/` as first-class export outputs. State the current included domains/kinds and the excluded domains/kinds.

- [ ] **Step 2: Update runtime findings**

Add a short section to `docs/visual-audit-runtime-findings.md` saying integrated DataExporter exports supersede standalone HotRepl probes for selected visuals. Keep the notes about animations, portraits, treasure maps, pets, and static assets as future context.

- [ ] **Step 3: Fix stale DataExporter guide reference**

`mods/DataExporter/CLAUDE.md` points to `docs/data-export-guide.md`, but that file was not present during planning. Create the guide from current exporter rules or update the reference to an existing file. Do not leave the broken path.

- [ ] **Step 4: Final verification**

Run:

```bash
uv run --project build-pipeline python -m unittest discover -s build-pipeline/tests
dotnet run --project build-tool build
```

- [ ] **Step 5: Commit**

Run:

```bash
git add mods/DataExporter build-pipeline docs config.toml tools/visual-audit
git commit -m "feat(visuals): export runtime images with game data" -m "Visual mapping now comes from the same runtime export flow as the rest of the compendium data. DataExporter writes authoritative selected image files and a manifest without UnityPy or standalone HotRepl probes."
```

Do not push.

---

## Plan self-review

- Scope feedback applied: treasure map images are excluded, all pet images are excluded, and website usage is removed from this plan.
- Spec coverage: DataExporter integration, de-authorizing the old separate visual mapping system, runtime verification, documentation, and commit are covered.
- Type consistency: `visual_assets.json`, `VisualAssetData`, `VisualAssetRegistry`, and `export_path` are used consistently.
- Risk boundaries: selected image writes fail loudly when broken; absent selected source sprites produce no asset rather than guessed fallbacks.
