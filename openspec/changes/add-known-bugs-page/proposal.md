# Proposal

## Why

Eleven reproduced game defects live in `docs/game-bugs/`, where players never look, while the site warns about only five of them, in six notes on five pages that each look different and link to their report only through an HTML comment. A player who hits one of the other six, or who wants the workaround and the evidence behind a warning, has nowhere on the site to find it.

## What Changes

- Add a Known Bugs page at `/known-bugs`, linked from the home page footer, with one entry per reproduced game defect. Each entry stands alone: what happens, who it affects, how to avoid it, steps to reproduce it in an unmodded game, the cause in the game's code, the screenshots, and the game version it was last confirmed on.
- Add a typed `GameBugNote` component for in-context warnings. A page that mentions a defect renders the note, which shares one look and links to the defect's entry on the Known Bugs page.
- Replace the six existing inline defect notes (Druid class page, death mechanics, two in inventory mechanics, the skill page veteran-cost box, experience mechanics) with `GameBugNote`.
- Hold the defects in one typed registry in the website, so the page, the notes and the update workflow read the same entries.
- Move the report screenshots from `docs/game-bugs/evidence/` into the site's static assets.
- **BREAKING** for contributors: remove `docs/game-bugs/` and its README. The `Observed:` and `Runtime verification:` HTML comments that point at those files go. A note's link to the Known Bugs entry replaces them.
- Update `skill://game-defect-reports` to add entries to the registry instead of writing Markdown reports, and `skill://update-game-version` to re-check registry entries on each patch. Update the project documentation that names `docs/game-bugs/`.

## Capabilities

### New Capabilities

- `known-game-bugs`: how the site records reproduced defects in the game itself, presents them on the Known Bugs page, warns about them in context, and keeps them current across game updates.

### Modified Capabilities

None.

## Impact

- Website: a new `/known-bugs` route, a defect registry module, a `GameBugNote` component, the home page footer, the five pages with existing notes, the sitemap and search index entries for the new page, and the static evidence images.
- Documentation: `docs/game-bugs/` is removed. `ARCHITECTURE.md`, `.agent/skills/game-defect-reports/SKILL.md`, `.agent/skills/update-game-version/SKILL.md` and `.agent/skills/project-documentation/SKILL.md` name the new home instead.
- No exporter, pipeline or database change.
