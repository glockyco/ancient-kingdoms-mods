## Context

See proposal.md for motivation. The README is the only project document: it holds the pitch, the player mods, the architecture, a list of principles, setup, five workflows, the checks, the runtime facts, and troubleshooting. The skills hold procedures, OpenSpec holds required behavior, `redactions.toml` holds redaction rules, and `docs/game-bugs/` holds defect reports. On 2026-10-04 the repository retired its `AGENTS.md` files, its scoped rules, the `agent-instructions` spec, and the checker that enforced them, because they amounted to 453 lines of rules for about 40 lines of knowledge.

GitHub traffic for the 14 days before this change came almost entirely from search engines, and the most visited paths after the front page were `mods/` and individual mod folders. The repository has no stars or forks.

The reference study compared 12 widely cited READMEs and two sibling projects. The overviews among them run from 210 to 2,283 words and keep their depth elsewhere: Zed and Path of Building in `CONTRIBUTING.md`, Supabase in `DEVELOPERS.md`, StardewMods in a guide inside each mod's folder, and rust-analyzer in an architecture document.

## Goals / Non-Goals

**Goals:**

- Give each reader one document: visitors and players the front page, contributors the contributor guide, people changing the structure the architecture document, and mod users each mod's README.
- Lose no fact in the move, and duplicate none.
- Make the placement rules discoverable at the moment an agent writes documentation, and enforce the parts a machine can verify.

**Non-Goals:**

- Verifying that prose is true. Only references and structure are mechanical. Truth stays with review and `documentation-lifecycle`.
- Checking Markdown citations of `server-scripts` lines. `compendium citations check` skips Markdown, and extending it is a separate change.
- READMEs for `build-tool/`, `build-pipeline/`, and `website/`. The architecture document's code map covers them, and visitors do not browse there.
- Checking `hotrepl run` command names. Mods register them at runtime, and the HotRepl skill's command reference owns them.
- A documentation website.

## Decisions

### Split by reader into four kinds of document

| Current README section | New home |
| --- | --- |
| Title, pitch, link row, screenshot, what it offers, license | `README.md` |
| Mods for players | `README.md` lists the four downloads. Each mod's README holds its inputs, settings, and limits. |
| The mods behind it | `mods/README.md` catalogues all 14. The architecture document's code map names their roles. |
| How it works | `README.md` keeps the diagram and one line per step. |
| Concepts worth knowing, What the project protects, Game runtime facts, Repository layout | `ARCHITECTURE.md`, keeping only invariants and concepts that the code and specs actually enforce. The "four commitments" framing was introduced by the previous rewrite and is not carried over. |
| Getting started, Workflows, Checks, Troubleshooting, ignored local state | `CONTRIBUTING.md` |
| Where knowledge lives | The `project-documentation` skill, linked from `CONTRIBUTING.md` |

Each document opens with one sentence that names its reader and its scope, and says where the rest lives. An agent that opens a file to edit it reads its contract first.

Alternatives: one README with collapsible sections keeps two readers on one page and does not stop growth. A documentation site adds a build and a host for a handful of documents.

### Catalogue the mods where visitors browse

`mods/README.md` lists every mod in three groups: the published player mods, the gameplay mods kept out of the downloads, and the pipeline and development mods. GitHub renders it when a visitor opens `mods/`. Each mod's `README.md` sits in the project folder itself, rather than in a `docs/` subfolder as in StardewMods, because GitHub renders a folder's README on the folder page that visitors already reach.

Every mod README uses the same sections: a one-sentence purpose, availability (the download link, or how the tooling installs it), Use, Settings, Limits, and Requirements. The check verifies that each README exists and that the catalogue links it. It does not verify the sections. A form check is what made the retired agent-docs checker heavy.

### Keep the architecture document to what rarely changes

`ARCHITECTURE.md` follows matklad's ARCHITECTURE.md guidance: a bird's-eye view, a code map that answers "where is the thing that does X", the invariants, the boundaries between parts, and cross-cutting concerns. It names files and types, and the documentation check resolves those names, so they do not rot silently. The game runtime facts belong here because they describe the boundary between repository code and the running game, which mods, exporters, and HotRepl sessions all cross.

### Keep documentation clean with a skill and a check, under a short spec

Four layers, from the weakest guarantee to the strongest:

1. **Self-describing documents.** Each file states its reader and scope at the top.
2. **The `project-documentation` skill.** It holds a placement table, from the fact a writer has to the document that owns it, and an editing procedure: verify each claim, link instead of copying, relocate before deleting, repair referrers, prefer fixing an error message over adding a troubleshooting entry, and run the check. The session skill list names it in every session, and its description triggers on edits to the documents and on requests to document something.
3. **`compendium docs check`.** It enforces references, mod documentation, the front-page budget, and the download list on every commit that touches them and on every CI run.
4. **The `documentation-structure` spec.** It is the reviewed contract that the skill explains and the check enforces, with six requirements.

Alternatives considered:

- **Restore `AGENTS.md`.** The runtime loads it every session, but the repository retired it because it restated the README and the skills. The skill list already reaches every session.
- **Scoped rules in `.agent/rules/`.** They were retired with the `agent-instructions` spec. A skill whose description names the documents fires at the same moment.
- **A form checker like the retired one.** It enforced a Why/Use/Exceptions/Incident template. This check enforces only properties that are true or false: a reference resolves or it does not.
- **A skill without a check.** The README grew into a grab-bag while guidance existed, and the audit after 0.9.35.0 corrected stale references by hand.

### Implement the check as a `compendium` command group

The pipeline CLI already hosts the repository-wide citation check over tracked files, and the build-pipeline project brings ruff, mypy, vulture, pytest, and a CI job. The check can also enumerate the CLI's own commands instead of parsing them. A Node script under `scripts/` would have no linter, type check, or test runner at the repository root. The retired Python checker there needed its own test wiring.

The CLI callback loads `config.toml` for every command, but the documentation check reads only tracked files and must run in CI, which has no configuration. The callback therefore skips configuration when the invoked group is `docs`, and a comment states why.

The check reads every tracked Markdown file outside `openspec/` and reports `path:line: problem`, sorted, followed by a count and the skill's path. It exits 1 when it finds a problem.

- **Links and images:** inline, reference-style, and HTML `href` and `src` targets. URLs with a scheme are skipped. Relative targets resolve against the document's folder.
- **Anchors:** GitHub's heading slugs. A slug is the lowercased heading text with punctuation removed and spaces turned into hyphens. A repeated heading gains `-1`, `-2`, and so on.
- **Repository paths:** inline code and shell code blocks. A token counts as a path when its first segment is a tracked top-level entry or a tracked root file. A `:line` or `:Member` suffix is dropped. Placeholders and wildcards are skipped. A path resolves when Git tracks it, or when Git ignores it, because an ignored path names local state.
- **Commands:** `build-tool` verbs against the verbs that `build-tool/Commands/CommandCatalog.cs` registers, `pnpm` scripts against the root and website `package.json` files plus pnpm's own commands, and `compendium` commands against the CLI.
- **Structure:** every mod project's README and its catalogue link, the front page's word budget and its two guide links, and its download links against `website/mod-downloads.json`.

### Count the budget in visible words

The budget counts words a reader sees: fenced code blocks, HTML comments, link targets, image syntax, HTML tags, and table rules are removed, and a word is a whitespace-separated token with a letter or a digit. The planned front page is about 600 words, and the reference overviews have a median of about 700. A limit of 1,000 leaves room for a new section but not for a manual.

## Risks / Trade-offs

- [Path detection reports prose that only looks like a path] → Only tokens whose first segment is a tracked top-level entry count, ignored paths resolve, placeholders are skipped, and a test covers each rule.
- [An agent puts a fact in the wrong document without breaking the check] → The skill and the self-describing openings catch what review catches. The budget stops only front-page growth.
- [Three documents mean three places to look] → The front page links both guides on its first screen, and each guide states its scope in its first sentence.
- [The front page's download links depend on the live site] → The check compares them with `website/mod-downloads.json`, and `build-tool publish-mods` publishes each selected mod at `/mods/<Project>.dll`.
- [Moving a section between files loses or duplicates a fact] → The split lands in one commit, and the section table above is checked off against the old README before that commit.

## Migration Plan

1. Write the mod READMEs and the catalogue.
2. Write `ARCHITECTURE.md` and `CONTRIBUTING.md`, rewrite `README.md`, and repoint the references in one commit, so that no fact exists twice or nowhere.
3. Add the `project-documentation` skill.
4. Add `compendium docs check` with its tests and wiring. It lands after the documents, so that every commit passes its own hooks.
5. Archive the change, which creates the `documentation-structure` main spec.

Rollback is a revert of these commits. Nothing at runtime, in the data, or on the site depends on them.

## Open Questions

None. `CONTRIBUTING.md` is the maintainer's and agents' working guide for a solo project. It does not invite outside contributions or describe a contribution process.
