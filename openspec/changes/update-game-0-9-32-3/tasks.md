## 1. Evidence and export

- [x] 1.1 Update the installed game, snapshot build 25286018, reconcile source citations, and verify them with `uv run compendium citations check`.
- [ ] 1.2 Export per-class skill-template positions and verify that the Bard sequence places Grand Symphony and Song of Varensea after the tier progression.
- [ ] 1.3 Regenerate the 0.9.32.3 export and SQLite consumers; verify schema validation and a second reproducible export.

## 2. Bard completeness and mechanics

- [ ] 2.1 Classify and order class skills from their authoritative per-class position; verify that the Bard page shows both mastery songs in Mastery after Tier 4.
- [ ] 2.2 Update maintained Bard song aura mechanics and citations; verify the affected skill mechanics snapshots.
- [ ] 2.3 Update Leadership to use `round((WIS + CON + CHA) / 2)`; verify the Leadership page and mechanics snapshot.
- [ ] 2.4 Publish Bardic Strike cast time and cooldown from the regenerated data; verify the Bard class and skill pages.
- [ ] 2.5 Reconcile the remote-player song timer source change; verify that no compendium text claims that other players' song timers are visible.

## 3. Other hotfix data and behavior

- [ ] 3.1 Publish Dazing Strike's corrected requirement from regenerated data; verify its skill page.
- [ ] 3.2 Publish Slagmaw's deduplicated loot from regenerated data; verify that its drop rows contain no duplicate item identifiers.
- [ ] 3.3 Publish Archmage Illidan as Notable from regenerated data; verify his NPC page and map marker.
- [ ] 3.4 Reconcile melee mercenary attacks against fleeing enemies; verify that no compendium text contradicts the corrected targeting behavior.

## 4. Publication

- [ ] 4.1 Set the published version to 0.9.32.3, validate citations and OpenSpec strictly, run the release gate, and verify the affected pages in the built site.
