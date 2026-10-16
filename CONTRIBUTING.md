# Working on this repository

How to set up, run, check, and troubleshoot this repository. How the parts fit together is in [ARCHITECTURE.md](ARCHITECTURE.md), and step-by-step procedures for recurring work are in [`.agent/skills`](.agent/skills/).

## Requirements

The Nix flake's dev shell provides Node and pnpm, Python and uv, the .NET 10 SDK, and `sqlite3`. With nix-direnv it loads in the working tree. Otherwise run `nix develop`. Every command below assumes the dev shell and the repository root.

Three things the shell cannot provide:

- **Ancient Kingdoms, installed by Steam in a CrossOver bottle on macOS.** The tools launch the game through CrossOver's `wine` and drive the bottle's Steam client.
- **MelonLoader in the game**, launched once so that it generates `MelonLoader/Il2CppAssemblies/`. The mods compile against those assemblies. The repository is developed against MelonLoader 0.7.3.
- **A [HotRepl](https://github.com/glockyco/HotRepl) checkout at `../HotRepl`.** `build-tool deploy-host` builds its MelonLoader host, installs it in the game, and produces the `HotRepl.Core` build that HotReplCommands and `tests/HotReplCommands.Tests` compile against.

## Setup

```sh
pnpm install                                  # packages, the Git hooks, and the hotrepl CLI
dotnet run --project build-tool setup         # finds the game and writes Local.props and config.toml
dotnet run --project build-tool deploy-host   # builds HotRepl and installs its host in the game
dotnet run --project build-tool build         # builds every project under mods/
dotnet run --project build-tool deploy        # copies the built mods into the game
```

Close the game before `deploy-host` and `deploy`.

Git ignores the local state: `Local.props` and `config.toml`, the exports in `exported-data/` (all but `README.md` and `static_data.json`), `.decompiled/` with its `server-scripts` symlink, `website/data/`, and the generated `images/`, `tiles/`, and `mods/` in `website/static/`. It exists only in the primary checkout, so work there rather than in a worktree.

## Workflows

### Export and build the data

A first build runs every step, in this order. Later builds repeat only the steps whose inputs changed.

1. `dotnet run --project build-tool export` exports the game data. Add `--screenshots` on first setup and when the world map changes, and `--update` to update the game through Steam first. The command installs nothing, so the HotRepl host and the mods must already be deployed. It needs a character in the save and refuses to start while the game runs.
2. `./scripts/update-server-scripts.sh <version>` decompiles the installed server code. `<version>` is the `game_version` in `exported-data/game_config.json`.
3. Capture zone shots on first setup, when a zone is added, and when a focal point in `build-pipeline/zone_shot_focal_points.json` changes. The [HotRepl skill](.agent/skills/hotrepl-runtime-inspection/SKILL.md#capture-zone-shots) gives the procedure.
4. `uv run compendium tiles` in `build-pipeline/` stitches the screenshots into the world image and the map tiles.
5. `uv run compendium build` in `build-pipeline/` builds the database and the images. It needs the stitched world image and a zone shot for every published zone. It replaces its outputs only when every step succeeds.

### Run and deploy the site

```sh
pnpm dev          # development server
pnpm build        # prerender the site
pnpm preview      # serve the last build
pnpm cf-deploy    # build, deploy to production, and notify IndexNow
```

`pnpm dev` and `pnpm build` first run `build-tool publish-mods`, which builds the mods that `website/mod-downloads.json` selects and publishes them under `/mods/`. Both therefore need `Local.props` and the game install, as well as `website/data/compendium.db`. After a new `compendium build`, restart `pnpm dev` so that it rebuilds the search index and the compressed database copies.

`pnpm -C website cf-deploy:demo` deploys the same build to a separate demo Worker on workers.dev, and `pnpm -C website cf-deploy:redirect` deploys the Worker that redirects the old workers.dev hostname to the site.

### Inspect the running game

```sh
dotnet run --project build-tool launch --wait
pnpm exec hotrepl info --json
pnpm exec hotrepl run world.summary '{}' --json
```

`launch --wait` returns once MelonLoader has loaded. HotReplCommands registers its commands a little later, so an early `run` can fail with `commandNotFound`. Never attach while an export holds the connection. The [HotRepl skill](.agent/skills/hotrepl-runtime-inspection/SKILL.md) covers the typed commands and how to measure live behaviour.

### Update to a new game version

The [update-game-version skill](.agent/skills/update-game-version/SKILL.md) gives the order and the gates.

## Making changes

- Plan a behaviour change as an OpenSpec change under [`openspec/changes`](openspec/changes/). [`openspec/specs`](openspec/specs/) holds the current requirements.
- Commit messages follow Conventional Commits, and commitlint checks them. A message explains the change on its own and names no OpenSpec task or decision numbers, because those are neither unique nor permanent.
- Put each new fact in the document that owns it. The [project-documentation skill](.agent/skills/project-documentation/SKILL.md) says which one.
- Keep the invariants in [ARCHITECTURE.md](ARCHITECTURE.md#invariants).

## Working files

Research notes, captures, mood boards, scratch scripts and save copies live in `.local/`, which Git ignores. This applies to agents too: their reports go here, not into `docs/` or an agent's session folder.

```text
.local/
  changes/<change-id>/      material for one OpenSpec change
  research/<date>-<topic>/  exploration not yet tied to a change
  private/                  save copies and other sensitive files
  tmp/                      scratch that can go at any time
```

- Each folder under `changes/` and `research/` starts with a `README.md` that names the question it answers and when it can be deleted.
- Conclusions go into the change's design, a spec, or a commit message. Tracked files never link into `.local/`, because nobody else has it.
- A change's folder is deleted once the change is archived. A research folder moves into a change's folder, or is deleted once its conclusions are recorded.
- `pnpm local:status` lists the folders with their size and newest file. It flags folders without a `README.md` and change folders whose change is archived or missing. It deletes nothing.

## Checks

The pre-commit hook runs the checks for the staged paths. The hooks need the full local setup: a website change runs the database suites, a mod change builds every mod against the game, and a redaction change loads the full export. CI repeats the checks that need no game data, and it builds neither the site nor the mods.

Before a release or a change across subsystems, run everything:

```sh
pnpm check                                   # svelte-check, mypy, vulture, knip, documentation
pnpm lint                                    # ESLint, ruff
pnpm --filter website format:check
pnpm --filter website test                   # includes the database suites
(cd build-pipeline && uv run pytest)
for project in tests/*/; do dotnet test "$project"; done
dotnet run --project build-tool build
pnpm check:citations                         # needs server-scripts
pnpm check:redactions                        # needs the full export
pnpm check:clean                             # the build-pipeline CI gates on a clean checkout of HEAD
pnpm build
nix build --no-link ".#checks.$(nix eval --raw --impure --expr builtins.currentSystem).openspec"
(cd website && node scripts/snapshot-mechanics.mjs)
```

`pnpm check:docs` checks the documentation: links, anchors, repository paths, and named commands resolve, every mod has a README, and the front page stays within its budget and lists exactly the published downloads. The last command compares each skill page's Mechanics card with its snapshot. After an intended change to a card, run it with `--update` and commit the snapshots with the change.

## Troubleshooting

- **A mod build cannot find the game's or HotRepl's assemblies.** Launch the game with MelonLoader once so that it generates its assemblies, check `ANCIENT_KINGDOMS_PATH` in `Local.props`, and run `deploy-host`, which builds `HotRepl.Core` in `../HotRepl`.
- **`export` reports `Timed out connecting to HotRepl` or `HotRepl command catalog not ready`.** The HotRepl host or the mods are missing from the game. Run `deploy-host`, `build`, and `deploy`.
- **`compendium tiles` fails boss-position validation.** The screenshots are incomplete or blank around boss terrain. Fix the loaded mods or the game state, then export with `--screenshots` again.
- **A mod change does nothing in the game.** A Harmony patch that no longer applies, an unregistered command, and a dead coroutine all fail without an error. Read `MelonLoader/Latest.log`, and confirm the change in the running game before reporting it as working.
