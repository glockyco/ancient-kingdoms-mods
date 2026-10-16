## Context

`commands/build.py:17-55,70-124` imports and calls every loader manually, while `loaders/__init__.py:3-81` repeats the list. `redactions.py:33-49` calls `load_all` without a static output directory. `core.py:164-267` composes static and class records, while `core.py:824-865,957-1010` creates junction links. `test_registration.py:25-42` currently inspects source calls because the runtime registration has two owners.

## Goals / Non-Goals

**Goals:** One ordered registration site, executable prerequisites, and fewer edit sites for genuinely simple datasets.

**Non-Goals:** A generalized entity schema, generated SQLite DDL, runtime reflection, or a topological scheduler.

## Decisions

1. **One ordered descriptor sequence.** Each dataset declares ID, source file or files, validated model or models, output table or tables, prerequisites, and simple or custom execution. Iterate this sequence in `load_all`; stop re-exporting a second `__all__` loader catalog. Check duplicates, table ownership, required file availability, and predecessor position before executing. This makes foreign-key order visible and testable without unnecessary topological sorting.
2. **Strict simple-loader boundary.** Only one required JSON array, one validated model, one output row per element, one SQLite table, and no side effects qualify. Use `insert_model` (`db.py:40-157`) to retain the established Pydantic boundary. Multi-file class composition, static nested factions, progression validation, junction producers, and artwork publishing remain explicit custom handlers. Read-only asset recording is one custom handler mode, not an exception flag on simple descriptors. `PipelineRobustness` removes existing missing-input skips separately; this change does not reintroduce them.
3. **Prove registration by results.** Replace source-call AST assertions with a check that each loader-owned table has one owner and each declared dataset executes. A model with only a new descriptor should load rows in an isolated scratch database. Preserve `load_all`'s non-publishing artwork behavior for redaction recalculation.

## Risks / Trade-offs

- [A table receives multiple kinds of rows] → Declare one custom dataset as its owner with explicit prerequisites. Do not route those rows through the simple handler.
- [A descriptor silently omits a loader] → Compare descriptor table ownership against known schema content tables and test a representative output.
- [A test encodes current implementation rather than behavior] → Retain only tests whose failure would expose an unowned output, missing file, invalid order, or wrong published bytes.

## Migration Plan

Migrate one qualifying simple dataset and its focused tests first. Migrate remaining simple datasets, then custom handlers, without leaving parallel registration paths. Confirm one scratch `load_all` produces rows without publishing files. Update contributor guidance after measuring one simple and one complex entity addition.
