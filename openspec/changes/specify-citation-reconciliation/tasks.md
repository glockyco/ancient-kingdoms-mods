## 1. Enforce the re-anchor order

- [x] 1.1 Make the re-anchor action fail when any target reports `moved`, and print the pending locators with the relocation command that resolves them
- [x] 1.2 Leave the ledger unwritten on that failure, and return a non-zero exit code
- [x] 1.3 Add a CLI test that a re-anchor refuses a tree with a pending relocation and writes the ledger once the relocation is applied
- [x] 1.4 Run the pipeline citation tests and `uv run mypy .`

## 2. Reorder the update skill

- [ ] 2.1 Move citation reconciliation ahead of exporter compatibility in `.agent/skills/update-game-version/SKILL.md`, and state that the pre-commit gate reads the whole tree
- [ ] 2.2 Record which verification statuses block a commit, and state that a relocated or unjudged reference does not block
- [ ] 2.3 Record that relocation runs before re-anchoring, and that re-anchoring stamps one game version for the whole ledger
- [ ] 2.4 State that a claim the new snapshot falsified is a defect in the code that carries it, that the reconciliation commit records the remaining claims, and that the version publication step confirms none remain
- [ ] 2.5 State that the ledger version and `COMPENDIUM_VERSION` differ between reconciliation and publication
- [ ] 2.6 Add anchor verification to the diff reading the skill already requires, and add no scheduled audit
- [ ] 2.7 Name the commit order the phases produce, replacing the current list that puts the exporter contract first

## 3. Verify

- [ ] 3.1 Run `scripts/check-agent-docs.sh`
- [ ] 3.2 Confirm the skill stays within its size budget
- [ ] 3.3 Rehearse the guard against the current snapshot: relocate a locator by hand, confirm the refusal names it, restore the locator, and confirm the re-anchor proceeds
- [ ] 3.4 Run `openspec validate specify-citation-reconciliation --strict`
