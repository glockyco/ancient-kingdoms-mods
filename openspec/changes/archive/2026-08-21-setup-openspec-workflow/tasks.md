## 1. Track the generated adapters

- [x] 1.1 Replace the blanket `.omp/` entry in `.gitignore` with `.omp/plugins/`, and update the comment to say that commands, skills, and rules are tracked while plugin installs are local. Match the `phd-thesis` convention.
- [x] 1.2 Confirm `openspec init --tools oh-my-pi .` has produced 6 files in `.omp/commands/` and 6 `SKILL.md` files in `.omp/skills/`, regenerating them if the working tree lacks them.
- [x] 1.3 Verify `git status --short -- .omp` lists all 12 files as untracked rather than ignored, then stage them.
- [x] 1.4 Commit the `.gitignore` change together with the 12 adapter files as one subject, using the `personal_commit` tool and a body that states why the adapters are tracked.

## 2. Add the adapter freshness check

- [x] 2.1 Add a check that copies `.omp/` and `openspec/config.yaml` into a temporary directory, runs `openspec update <tmp> --force` with `CI=1` and `OPENSPEC_TELEMETRY=0`, and diffs the regenerated `commands/` and `skills/` against the tracked ones. Model it on `~/.config/nix-darwin/flake.nix:282-301`. The check must not modify the working tree.
- [x] 2.2 Make the check exit non-zero and name the differing files when the regenerated output differs.
- [x] 2.3 Register the check as a `lefthook.yml` pre-commit job scoped by `glob: ".omp/**"`, following the existing job style in that file.
- [x] 2.4 Register the same check in `.github/workflows/ci.yml` so a clone without hooks is still covered.
- [x] 2.5 Prove the check fails on drift: edit one tracked adapter file, run the check, confirm a non-zero exit that names the file, then restore the file and confirm the check passes.
- [x] 2.6 Confirm the check left the working tree unchanged with `git status --short`.

## 3. Cancelled by supersession

Groups 1 and 2 were carried out and then reversed. `centralize-openspec-workflow-adapters` in `glockyco/omp-agent-setup` made the personal plugin the only tracked source of the generated workflow, because 108 identical files across nine repositories had acquired two owners and three distinct contents. Commits `d1d08d02` and `e1592a1c` performed the work here, and `4cac89f2` removed the adapters, the freshness check, its pinned generator dependency, the pre-commit job and the CI job.

The remaining work was cancelled rather than completed, so it is recorded here instead of left pending:

- **The Task Triggers row in `CLAUDE.md`, and the check for whether the table had already moved.** `migrate-agent-docs-to-agents-md` deletes the table this row would have joined, and its task 1.1 forbids restating one in `AGENTS.md`. The discoverability requirement moves to that change in full.
- **Confirming from a clean checkout that `.omp/commands/` and `.omp/skills/` are present without running a generator.** This can no longer hold. Both directories are absent here by design, and the plugin supplies the workflow.
- **Confirming the commands are offered after a session restart, and validating this change under `--strict`.** The superseding change verified command resolution against the built plugin payload instead, including that each command registers exactly once.
