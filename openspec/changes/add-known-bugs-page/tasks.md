# Tasks

## 1. Defect registry and evidence

- [ ] 1.1 Add the typed defect registry module with the fields from design.md and verify `pnpm check` passes with the module and its type exported.
- [ ] 1.2 Move each of the 11 reports into a registry entry, rewriting it player facts first, keeping steps, expected behaviour, cause and confirmed version, and dropping the process records design.md lists. Verify that every report in `docs/game-bugs/` has exactly one entry by comparing the two lists.
- [ ] 1.3 Move the screenshots the reports cite into `website/static/images/game-bugs/` with captions in their entries, and verify every image an entry names exists and every moved image is named by an entry.

## 2. Known Bugs page

- [ ] 2.1 Add the `/known-bugs` route rendering every entry under its own anchor, with page metadata, and verify in the browser that each entry shows its summary, workaround, steps, cause, images and confirmed version.
- [ ] 2.2 Register the page in site search through the `page(...)` builder and in `scripts/build-sitemap-manifest.mjs`, and verify that a search for "bug" returns the page and that the built sitemap lists it.
- [ ] 2.3 Link the page from the home page footer in both `+page.svelte` and `ClassicHome.svelte`, and verify the link in the browser on both home variants.

## 3. In-context notes

- [ ] 3.1 Add `GameBugNote` on the existing `Alert` component, taking an entry id and an optional body, and verify that an unknown id fails `pnpm check`.
- [ ] 3.2 Replace the six notes on the Druid class page, the death, inventory and experience mechanics pages and the skill page with `GameBugNote`, removing the `Observed:` and `Runtime verification:` comments while keeping each `Source:` comment, and verify in the browser that each page shows one consistent note linking to its entry.
- [ ] 3.3 Review the 6 defects that have no note against the pages that describe the affected rule, add a note where a page states the rule the defect changes, and verify each added note in the browser.

## 4. Workflow and documentation

- [ ] 4.1 Update `.agent/skills/game-defect-reports/SKILL.md` to record a defect as a registry entry with its evidence in the site's assets, and verify `pnpm check:docs` passes.
- [ ] 4.2 Update `.agent/skills/update-game-version/SKILL.md` to recheck registry entries, remove fixed entries with their notes, and update confirmed versions, and verify `pnpm check:docs` passes.
- [ ] 4.3 Point `.agent/skills/project-documentation/SKILL.md` and `ARCHITECTURE.md` at the registry, delete `docs/game-bugs/`, and verify that no file in the repository names `docs/game-bugs`.

## 5. Integration

- [ ] 5.1 Run the release gate from `CONTRIBUTING.md` and verify it passes, including `pnpm build`.
