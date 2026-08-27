---
description: Change the owner and regenerate when editing a generated export, database, published asset, decompiled source, or lock ledger.
condition: ".*"
scope: "tool:edit(exported-data/**), tool:write(exported-data/**), tool:edit(website/data/**), tool:write(website/data/**), tool:edit(website/static/images/**), tool:write(website/static/images/**), tool:edit(website/static/tiles/**), tool:write(website/static/tiles/**), tool:edit(server-scripts/**), tool:write(server-scripts/**), tool:edit(citations.lock.json), tool:write(citations.lock.json), tool:edit(redactions.lock.json), tool:write(redactions.lock.json)"
interruptMode: "never"
---
This file is produced. Change the code or configuration that produces it, then regenerate.

## Why

- A hand edit is overwritten by the next run of the owner, silently and without a conflict.
- The owner keeps producing the wrong value, so the defect survives the edit that appeared to fix it.
- A ledger records what was verified. Editing it asserts a verification that nobody performed.

## Use

| Artifact | Owner |
|---|---|
| `exported-data/` | the export mods, then `dotnet run --project build-tool export` |
| `website/data/compendium.db` | `build-pipeline`, then `uv run compendium build` |
| `website/static/images`, `website/static/tiles` | `build-pipeline`, then `compendium build` or `compendium tiles` |
| `server-scripts/` | the decompiler snapshot for the published game version |
| `citations.lock.json` | `compendium citations sync` after reviewing the claim |
| `redactions.lock.json` | the redaction commands, not an editor |

## Exceptions

None for these paths. A value that has no owner is a defect in the owner, not a case for editing the
output.

## Incident

The repository states this prohibition in its root instructions, where it competes with everything
else loaded at session open. It is keyed to the paths instead, so it arrives when one is opened.
