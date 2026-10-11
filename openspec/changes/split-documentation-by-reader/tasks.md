## 1. Document every mod

- [x] 1.1 Write `README.md` for the published player mods: `FieldDefaultValueHookFix`, `BetterBestiary`, `BossSkillTracker`, and `BossTracker`. Give each the design's sections and its download link. Verify every input, setting key and default, and limit stated against that mod's source, including BossTracker's host-only respawn countdowns.
- [x] 1.2 Write `README.md` for the gameplay mods kept out of the downloads: `MapEnhancer`, `MapTeleporter`, `MonsterRespawner`, and `ResourceRespawner`. State what each changes in the world or on the character, including MapEnhancer's fog persisting with the character. Verify each statement against the mod's source and `server-scripts`.
- [x] 1.3 Write `README.md` for the pipeline and development mods: `DataExporter`, `MapScreenshotter`, `HotReplCommands`, `CombatVerification`, `CharacterCapture`, and `HierarchyLogger`. List each mod's hotkeys or HotRepl commands, outputs, and dependencies on the HotRepl host or sibling mods. Verify each command name against its registration and each output path against the code that writes it.
- [x] 1.4 Write `mods/README.md`: player installation, the three groups with one line per mod linking its README, and how `build-tool` builds and deploys the rest. Verify that it links every directory under `mods/` that holds a project file exactly once.

## 2. Split the project documents

- [ ] 2.1 Write `ARCHITECTURE.md`: bird's-eye view, code map, the invariants that code, tests, or specs enforce, the boundaries between game, exports, pipeline, site, and tooling, the cross-cutting concerns, and the game runtime facts. Open it with its reader and scope. State no principle or framing that the code and specs do not establish, and re-verify every claim against the current checkout, because the game, the classes, and the docs have changed since the README was last verified.
- [ ] 2.2 Write `CONTRIBUTING.md`: requirements, setup including the ignored local state and the primary-checkout rule, the workflows, making changes (OpenSpec, Conventional Commits, documentation placement), the checks, and troubleshooting. Open it with its reader and scope. Verify that every `build-tool` verb, `pnpm` script, and `compendium` command it names exists.
- [ ] 2.3 Rewrite `README.md` as the front page: the hero, what's inside, the four downloads, how it works in the diagram and one line per step, a short development section that links both guides without inviting contributions, and the license. Verify that it stays under 1,000 visible words by the design's counting rule, that its downloads match `website/mod-downloads.json`, and that GitHub's Markdown API renders it with the diagram.
- [ ] 2.4 Repoint the references to moved README sections in `knip.config.ts` (two comments), `Local.props.example`, `.agent/skills/hotrepl-runtime-inspection/references/observing-behaviour.md`, `openspec/changes/consolidate-website-design-system/design.md`, and `openspec/changes/harden-export-sessions/tasks.md`. Verify that a search of live files for `README` finds no reference to a section that moved.
- [ ] 2.5 Walk the previous README section by section against the design's section table. Verify that each fact appears exactly once in the new documents or was dropped for a stated reason, and record the dropped facts in the commit body.

## 3. Add the documentation skill

- [ ] 3.1 Write `.agent/skills/project-documentation/SKILL.md` with `name` and `description` frontmatter, the placement table, the editing procedure, and how to run the documentation check. Verify that every document and path its table names exists and that a new agent session lists the skill.
- [ ] 3.2 Link the skill from the making-changes section of `CONTRIBUTING.md`. Verify the link resolves.

## 4. Enforce the structure

- [ ] 4.1 Add a `docs` command group with a `check` command to the `compendium` CLI, and make the callback skip configuration for that group, with a comment that states why. Verify with a CLI test that `compendium docs check` runs in a checkout without `config.toml`.
- [ ] 4.2 Resolve references: inline, reference-style, and HTML links and images, heading anchors by GitHub's slug rules including repeated headings, repository paths in inline code and shell code blocks, `build-tool` verbs, `pnpm` scripts, and `compendium` commands. Treat ignored paths as resolved and skip placeholders, wildcards, URLs, and `openspec/`. Verify with a passing and a failing pytest case for each rule and each exemption.
- [ ] 4.3 Check the structure: a README in every mod project, a catalogue link to each, the front page's word budget and guide links, and its downloads against `website/mod-downloads.json`. Verify with a passing and a failing pytest case for each.
- [ ] 4.4 Report sorted `path:line: problem` findings, a count, and the skill's path, and exit 1 when anything is found. Verify the format and the exit status in a test.
- [ ] 4.5 Add `check:docs` to the root `package.json` and run it from `check`. Add a pre-commit job whose glob covers tracked Markdown outside `openspec/`, mod project files, `website/mod-downloads.json`, both `package.json` files, `build-tool/Commands/CommandCatalog.cs`, and the CLI and check sources. Add a documentation step to the build-pipeline CI job. Verify that `pnpm check:docs` passes on the repository, that the hook runs when only a Markdown file is staged, and that the check passes in a clean worktree without `config.toml`.
- [ ] 4.6 Describe `pnpm check:docs` in the checks section of `CONTRIBUTING.md`, and describe in the skill what the check verifies and what it cannot. Verify that the documentation check passes over both files.

## 5. Verify the whole change

- [ ] 5.1 Run the build-pipeline gates (`ruff format --check`, `ruff check`, `mypy`, `vulture`, `pytest`), `pnpm check:knip`, and `pnpm check:docs`. Render the front page, both guides, the catalogue, and one mod README through GitHub's Markdown API and review them in a browser. Verify that every gate passes and that each page reads correctly.
- [ ] 5.2 Run `openspec validate split-documentation-by-reader --strict` and the repository's OpenSpec Nix check. Verify that both pass.
