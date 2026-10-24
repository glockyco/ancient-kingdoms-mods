# Design

## Context

`docs/game-bugs/` holds 11 Markdown reports with a README index and `evidence/` screenshots. The reports serve the game's developer and carry process records: save-file hashes, instrumentation notes and session timings. Five site pages warn about five of the defects, in six notes that use three looks: an `Alert` on the Druid class page, an amber box on skill pages, and plain paragraphs on the death, inventory and experience mechanics pages. Each note reaches its report only through an `Observed:` or `Runtime verification:` HTML comment.

The site has no About page. The home page footer (`+page.svelte`, and `ClassicHome.svelte`) is where the site describes itself. Standalone pages enter search through the `page(...)` builder in `$lib/server/search/documents.ts` and the sitemap through `scripts/build-sitemap-manifest.mjs`.

## Goals / Non-Goals

**Goals:**

- One typed source for every defect, read by the page, the notes and the update workflow.
- One note look, chosen once.

**Non-Goals:**

- Reporting defects to the developer through another channel. The page is the record they can be pointed at.
- Changing which defects exist or re-running reproductions. The migration moves the 11 reports as they stand, with their confirmed versions.
- A site-wide footer. Only the home page footer gains the link.

## Decisions

### A typed registry in the website, not Markdown

The entries live in a TypeScript module, one object per defect: id, title, summary, affected players, workaround, steps, expected behaviour, cause, evidence images with captions, and the confirmed game version and Steam build. The page renders every entry. A note takes an entry id and fails type-checking when the id is unknown, so a removed entry cannot leave a note behind.

Alternative: keep Markdown files and render them with a Markdown loader. This adds a dependency and a second content format to the site, and a note's link to a removed file would only fail at build time if extra tooling checked it.

### Player facts first, developer facts below

Each entry opens with what a player needs: what happens, who it affects and how to avoid it. Steps to reproduce, expected behaviour, cause and screenshots follow under the same entry, because the spec requires an entry the developer can act on without the repository. Per-trial measurement tables shrink to the observed result that proves the defect.

Process records stay out: save-file hashes, scratch-database confirmations, instrumentation and session timings. They show how this repository verified a report and belong in the commit that records the reproduction.

### One note component with an optional page-specific body

`GameBugNote` renders a fixed frame: a label naming it a known game bug, the body, and a link to `/known-bugs#<id>`. Pages pass a body when their wording depends on page data, as the skill page does with a skill's point cost. Otherwise the note shows the entry's summary.

The frame reuses the site's existing `Alert` component in one variant, so the note matches other callouts instead of adding a fourth look.

### Evidence in the site's static assets

Screenshots move to `website/static/images/game-bugs/` and keep their WebP files. The entry's caption replaces the report's evidence list.

### Citations stay with the rule

A note sits beside the rule the defect changes, and that rule keeps its `Source:` comment, which the citation check verifies. The `Observed:` and `Runtime verification:` comments go, because the note's link now carries the observation.

## Risks / Trade-offs

- [Developer-facing detail makes the page long] → Entries use their own anchors, and each entry starts with the player facts, so a player can stop after the summary.
- [A game update fixes a defect silently] → The update skill rechecks every entry against the changed code, as it did for the Markdown reports, and the confirmed version shows readers how recent the check is.
- [The registry's cause text cites game members that a patch renames] → The cause names members in prose, not as `Source:` citations, so the citation check does not cover it. The update skill's recheck reads each cause against the new code.

## Migration Plan

1. Add the registry with all 11 entries and their evidence, the page, and the component.
2. Replace the six notes with the component.
3. Link the page from the home page footer, the sitemap and search.
4. Update the two skills, `.agent/skills/project-documentation/SKILL.md` and `ARCHITECTURE.md`.
5. Delete `docs/game-bugs/` once no file names it.

Rollback is a revert of the change. No data or export depends on it.
