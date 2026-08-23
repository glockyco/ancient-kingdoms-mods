## Context

See `proposal.md` — Why. Two constraints shape the approach:

- `omp-plans` is not installed here, so the `lefthook.yml:68-75` plans job skips and
  `docs/plans/INDEX.md` is maintained by hand.
- The deleted documents are reached from `CLAUDE.md`, which OMP does not load. Removing them
  changes what a reader finds, not what a session loads.

## Goals / Non-Goals

**Goals:**

- Remove documents whose claims are false, and every pointer to them.
- State the standard once, so the next case is decided by rule rather than by argument.

**Non-Goals:**

- Sweeping `docs/plans/archive/`. Raised in the proposal as a separate decision.
- Rewriting the kept plans. Unstarted is not stale.
- Replacing the deleted project map with a better one.

## Decisions

### The project map is deleted, not corrected

The obvious repair is to fix the two wrong lines and add the eight missing directories. Rejected:
the document is a hand-maintained inventory of a tree that changes every week, and it was wrong
within a month of its last edit. Its own failure is the argument against rewriting it. An agent
navigates with `glob` and `read`, which cannot drift, so the task trigger that pointed here is
removed rather than repointed.

This is the same rule the agent-instructions capability already states: documentation that
restates the codebase loses to the codebase.

### The superseded search spec is deleted rather than archived

The repository has an `archive/` directory, so moving the file there is the established
alternative. Rejected for this document: its successor exists, the architecture shipped as
`marker-registry.ts`, and archiving would preserve a design that is now readable in code and in
its successor. Archiving is for a record with something unique left in it.

That choice is deliberately not generalised to the 26 documents already in `archive/`. Whether
those retain value is the policy question the proposal defers.

### `claude-md-guide.md` goes now, ahead of the migration

The migration change already schedules this deletion, but it is blocked there behind writing the
root `AGENTS.md`. It can go earlier at no cost, because the policy exists twice and the
`edit-claude-md` skill is the copy that actually loads. Removing the duplicate now shrinks the
migration's surface rather than competing with it.

## Risks / Trade-offs

- **A deleted document held something nobody noticed** → Every deletion is evidenced by a specific
  false claim or a named successor, and git history retains the text. Recovery is one `git show`.
- **The kept plans are also stale and this change looks arbitrary** → Each was checked against code
  and found to describe work that has not happened: `site.ts:13,31-32` for the OG plan,
  `jsonld.ts` for structured data, `meta-description.ts:169-170` for title suffixes. Unstarted is
  not stale, and the spec says so.
- **`INDEX.md` drifts because the tool is missing** → Task 2.3 checks the remaining entries against
  disk by hand, and task 3.1 greps for the deleted names.

## Migration Plan

Delete, repair referrers, verify by grep and test run. Rollback is `git revert`.
