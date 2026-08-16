## Context

See `proposal.md` — Why. The design-relevant constraints, all from OMP's documented discovery:

| Mechanism | Location | Priority | Walks up? | Committed? |
| --- | --- | --- | --- | --- |
| Context file | `.omp/AGENTS.md` | 100 | nearest non-empty `.omp/` only | no, `.gitignore:67` |
| Context file | `<cwd>/.claude/CLAUDE.md` | 80 | no | yes |
| Context file | `.agent[s]/AGENTS.md` | 70 | yes | yes |
| Context file | standalone `AGENTS.md` | 10 | yes, all depths survive | yes |
| Rules | `.omp/rules/*.md` | 100 | no, `<cwd>` only | no |
| Rules | `.agent[s]/rules/*.md` | 70 | yes | yes |
| Skills | `.claude/skills/*/SKILL.md` | 80 | — | yes |
| Skills | `.agent[s]/skills/*/SKILL.md` | 70 | — | yes |

Also: 17 files, 1,460 lines, none loaded. There is no working behaviour to preserve, which makes
this a rewrite rather than a migration. And OMP is the only target, so no decision here needs to
accommodate a second tool.

## Goals / Non-Goals

**Goals:**

- Instructions load from any working directory in the tree.
- One home per fact, enforced by a check rather than by review.
- Every always-loaded file under 200 lines, with a mechanism that keeps it there.
- Layout named for the runtime actually in use.

**Non-Goals:**

- Compatibility with Claude Code, Cursor, Copilot, or any other agent. Cut deliberately.
- A sticky `.omp/RULES.md`. See the decision below.
- Preserving per-mod documentation.
- Rewriting `docs/plans/archive/**`.

## Decisions

### Standalone `AGENTS.md` for context files

Only two candidates walk up from the working directory: `.agent/AGENTS.md` and standalone
`AGENTS.md`. Both are committed. Standalone wins because **files at every depth survive**, which
is exactly the monorepo shape here: a session in `website/src/lib/map/` should load the root file,
the `website/` file, and the map file, in that order, with the nearest last and therefore most
prominent.

- `.omp/AGENTS.md` rejected: `.gitignore:67` ignores `.omp/`, and native discovery reads only the
  *nearest non-empty* `.omp/` directory, so it cannot express a multi-level hierarchy at all.
- `<cwd>/.claude/CLAUDE.md` rejected: no walk-up. This is the defect being fixed.

Priority 10 is the lowest of any provider, but nothing competes at these depths, so it wins
uncontested.

### `.agent/` for skills and rules, and `.claude/` deleted

`.agent/` is OMP's canonical committed location for project skills and rules, and it is the only
committed location whose *rules* walk up from the working directory. Since skills and rules should
live together, and since `.claude/` names a tool this project does not run, everything moves and
`.claude/` is removed.

`.claude/settings.local.json` grants Bash permissions to Claude Code. OMP does not read it. It is
deleted rather than translated; if OMP permissions are wanted later, they belong in OMP's own
config.

Migration hazard: `.claude/skills` is priority 80 and `.agent/skills` is priority 70, and dedup is
by skill name, first-wins. If both exist, the old copies shadow the new ones and the move appears
to do nothing. The move and the deletion must therefore land in the same commit.

### Three mechanisms, assigned by when guidance applies

This is the decision that keeps the files small, and it is only available because the target is a
single runtime.

| Applies | Mechanism | Cost |
| --- | --- | --- |
| Always, whole repo | root `AGENTS.md` | every session |
| Always, one subproject | that subproject's `AGENTS.md` | every session under it |
| Only when touching certain files | `.agent/rules/<name>.md` with `globs` | name and description listed; body read on demand via `rule://` |
| A multi-step task | `.agent/skills/<name>/SKILL.md` | name and description listed; body read on demand |
| A linter can enforce it | linter config | none |
| Describes what code does | omitted | none |

The audit classified a large share of the existing content as path-specific — the website mechanics
rules, the map coordinate model, per-mod gotchas. Previously that had nowhere to go but an
always-loaded file, which is how `website/CLAUDE.md` reached 220 lines and
`website/src/lib/map/CLAUDE.md` reached 239. Rules attach by glob, so they are more reliable than
skills for "when editing this file, remember X", and they cost only a listing line until read.

The keep test for any line remains: would removing it cause an agent to make a mistake?

### No Task Triggers table

OMP already lists every skill and rule with its description and selects by task. The table was a
second, hand-maintained copy of that mechanism, and it had already rotted into pointing at a
`commit` skill that does not exist (`CLAUDE.md:16`). Removing it also removes the maintenance
burden that produced the rot. Only pointers to non-skill destinations survive, such as
`docs/plans/INDEX.md`.

### No sticky `RULES.md` in this change

OMP re-attaches `RULES.md` near the current turn, which genuinely helps hard prohibitions survive a
long conversation. It is read only from `.omp/`, which is gitignored, so adopting it means
un-ignoring a directory whose other contents are not yet characterised. Deferred rather than
guessed. Trigger for revisiting: if the fail-fast or generated-file rules are observed being
violated late in long sessions, un-ignore `.omp/` narrowly and add a short `RULES.md`.

### The check is a shell script, and deliberately conservative

`scripts/check-agent-docs.sh` matches the existing `scripts/*.sh` convention and needs no toolchain
beyond the Nix shell. To avoid crying wolf, reference checking is limited to backticked strings
that look like repository paths — containing `/`, no spaces, no glob characters. Prose mentions and
shell placeholders are ignored. Skill and rule names resolve against their directory listings.
`docs/plans/archive/**` is excluded. It reports every violation in one run rather than exiting at
the first.

## Risks / Trade-offs

- **The skills move silently no-ops** → `.claude/skills` outranks `.agent/skills`, so a partial
  migration leaves the old copies winning. Mitigated by moving and deleting in one commit, and by
  task 6.4, which counts discovered skills afterward.
- **Deleting 13 per-mod files loses a load-bearing fact** → The hoist is driven by the audit's
  classification rather than in-the-moment judgement, and git history retains everything. Recovery
  costs one `git show` and one line.
- **Rules are advisory** → OMP lists rules and asks the model to read applicable ones; glob
  applicability is not enforced in code. A rule is therefore weaker than always-loaded text. Only
  content that is genuinely conditional goes there; anything that must never be missed stays in an
  `AGENTS.md`.
- **The reference checker misfires and gets disabled** → Conservative matching, explicit archive
  exclusion, single-run reporting. Narrow the matcher rather than skip the hook.
- **Instructions decay again** → The failure mode that produced the current state, so the check
  ships with this change rather than after it. The size limit is the pressure that keeps content
  routed out to rules and skills.

## Migration Plan

1. Write the five `AGENTS.md` from the audit's always-on classification, hoisting the shared mod
   facts into `mods/AGENTS.md` once.
2. Extract the path-specific content into `.agent/rules/*.md` with `globs` and `description`.
3. Move the 15 skills to `.agent/skills/`, merge and repair them, and delete `.claude/` in the same
   commit.
4. Delete the 17 `CLAUDE.md` and `docs/claude-md-guide.md`.
5. Rewrite live prose references; leave `docs/plans/archive/**` untouched.
6. Add the check, wire it into `lefthook.yml`, and prove it fails before trusting it.
7. Verify empirically by opening sessions at three depths and observing the loaded context.
   Doc-reading is not evidence that discovery works.

**Rollback:** `git revert`. No generated artifact, build output, or deployed surface depends on
these files.
