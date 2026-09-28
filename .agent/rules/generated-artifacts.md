---
description: Change the owner and regenerate when editing a generated export, database, published asset, decompiled source, or lock ledger.
condition: ".*"
scope: "tool:edit(exported-data/**), tool:write(exported-data/**), tool:edit(website/data/**), tool:write(website/data/**), tool:edit(website/static/images/**), tool:write(website/static/images/**), tool:edit(website/static/tiles/**), tool:write(website/static/tiles/**), tool:edit(server-scripts/**), tool:write(server-scripts/**), tool:edit(citations.lock.json), tool:write(citations.lock.json), tool:edit(redactions.lock.json), tool:write(redactions.lock.json)"
interruptMode: "never"
---
This file is produced unless it is a named curated input below. Change the producer, then regenerate its output.

The gate is the `scope`, and the `condition` is deliberately vacuous. A write to a path is an action
rather than a text pattern, so the paths carry the whole trigger.

## Why

- A hand edit is overwritten by the next run of the owner, silently and without a conflict.
- The owner keeps producing the wrong value, so the defect survives the edit that appeared to fix it.
- A ledger records what was verified. Editing it asserts a verification that nobody performed.

## Use

| Artifact | Owner |
|---|---|
| `exported-data/` except `README.md` and `static_data.json` | the export mods, then `dotnet run --project build-tool export` |
| `website/data/compendium.db` | `build-pipeline`, then `uv run compendium build` |
| `website/static/images`, `website/static/tiles` | `build-pipeline`, then `compendium build` or `compendium tiles` |
| `server-scripts/` | the decompiler snapshot for the published game version |
| `citations.lock.json` | `compendium citations sync` after reviewing the claim |
| `redactions.lock.json` | the redaction commands, not an editor |

## Curated input

`exported-data/static_data.json` is hand-maintained data for the pipeline. It has no exporter.
`mods/DataExporter/Curated/classes.json` is the editable class source. The exporter overwrites its
copy at `exported-data/classes.json`. Never edit that copy.

## Incident

The repository states this prohibition in its root instructions, where it competes with everything
else loaded at session open. It is keyed to the paths instead, so it arrives when one is opened.
