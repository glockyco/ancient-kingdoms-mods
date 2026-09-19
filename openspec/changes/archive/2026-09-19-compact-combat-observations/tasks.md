## 1. Runtime evidence

- [x] 1.1 Add bounded resource-transition and effect-observation records to each rotation window. Verify `CombatVerification.Tests` proves repeated states are deduplicated and first/last effect observations are retained.
- [x] 1.2 Keep the detailed hit and attempt trace in the run-owned artifact without adding diagnostic fields to committed records. Verify the runtime DTO serialization contains both diagnostic data and bounded evidence.

## 2. Host normalization

- [x] 2.1 Add the schema version 2 observation model and a Tier D normalizer in `build-tool/`. Verify `BuildTool.Tests` covers player totals, companion identity and totals, relative duration, counts, fidelity, resource transitions, and class-effect evidence.
- [x] 2.2 Make normalization fail when required Tier D evidence is missing or malformed. Verify focused tests name the fixture and missing field instead of writing a partial observation.
- [x] 2.3 Normalize the trusted runtime artifact before `build-tool verify` writes the committed file. Verify Tier A, Tier B, and Tier C payloads remain unchanged apart from the schema version.

## 3. Website verification

- [x] 3.1 Require observation schema version 2 and add a dedicated compact Tier D sample parser. Verify the parser refuses legacy versions, non-finite values, missing counts, missing resource transitions, and class samples without effect evidence.
- [x] 3.2 Read player and companion totals directly from compact Tier D samples. Verify the existing statistical verdicts and minimum-window behavior remain unchanged.
- [x] 3.3 Credit Tier D class and archetype coverage only from compact observed evidence. Verify fixture labels alone cannot satisfy coverage.

## 4. Corpus migration

- [x] 4.1 Move all Tier A, Tier B, and Tier C observations to schema version 2 and compact the 12 companion Tier D observations from their current traces. Verify no Tier D committed sample contains `hits`, `attempts`, `completions`, `intervals`, or absolute window timestamps.
- [x] 4.2 Build and deploy the verification mod, then record the six class Tier D fixtures with resource and maintained-effect evidence. Verify each run preserves the player save and sidecars.
- [x] 4.3 Run the complete committed corpus comparison and coverage report. Verify every fixture passes, every required class and archetype is covered, and the Tier D corpus is below 2 MB.

## 5. Closure

- [x] 5.1 Run the focused website, `BuildTool.Tests`, and `CombatVerification.Tests` suites. Verify all pass.
- [x] 5.2 Run `pnpm check`, `pnpm lint`, the build-tool build, citation verification, and `openspec validate compact-combat-observations --strict`. Verify all pass.
