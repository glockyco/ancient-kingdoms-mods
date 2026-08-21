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

## 3. Make the workflow discoverable

- [ ] 3.1 Add a Task Triggers row to `CLAUDE.md` that routes permanent behavior changes to the OpenSpec workflow and names `openspec/specs/` for accepted behavior and `openspec/changes/` for active work.
- [ ] 3.2 Check whether `migrate-agent-docs-to-agents-md` has already moved the Task Triggers table to `AGENTS.md`; if it has, add the row there instead and record in that change that this row exists.

## 4. Verify

- [ ] 4.1 Run `openspec validate setup-openspec-workflow --strict` and confirm it passes.
- [ ] 4.2 Confirm from a clean checkout of the committed state that `.omp/commands/` and `.omp/skills/` are present without running any generator.
- [ ] 4.3 Confirm the OpenSpec commands are offered by the agent after a session restart.
