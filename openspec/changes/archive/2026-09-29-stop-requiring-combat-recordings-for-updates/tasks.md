## 1. Align documents

- [x] 1.1 Replace the update-completion rule in `docs/combat-model/verification.md` with the non-blocking rule, and verify it agrees with `.agent/skills/update-game-version/SKILL.md`.
- [x] 1.2 Run `openspec validate stop-requiring-combat-recordings-for-updates --strict`, sync the delta, archive the change, and verify `openspec validate --all --strict` passes.
