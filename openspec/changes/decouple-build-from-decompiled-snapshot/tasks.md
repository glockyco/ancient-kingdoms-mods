## 1. Establish a verification-only producer

- [ ] 1.1 Add a dedicated `compendium planner-payload` command in `cli.py` that reads the built database, compatible export, redaction subject, and `server-scripts/SNAPSHOT.toml`. Verify matching versions produce raw and compressed files with the snapshot's assembly SHA, and missing or mismatched identity leaves no partial output.
- [ ] 1.2 Move payload outputs into an ignored verification-only directory and migrate `website/src/lib/planner/verification/corpus.ts` and its tests. Verify the corpus reads its new path and stale observations still report their assembly mismatch.

## 2. Remove build's snapshot dependency

- [ ] 2.1 Remove planner-payload reads, deletion, and writes from `commands/build.py`; remove obsolete source-call tests in `test_registration.py`. Verify a normal `compendium build` succeeds without `server-scripts/SNAPSHOT.toml` and publishes no verification payload.
- [ ] 2.2 Remove stale `website/data/planner-data.json` and `.gz` outputs from site publication and ensure no live import requires them. Verify a website build contains neither verification file and the server-side corpus still reads its explicit output.

## 3. Exercise the full protocol

- [ ] 3.1 Update game-version verification instructions to run the explicit payload command before corpus comparison. Verify its output against a matching snapshot and one stale observation without weakening the source-identity gate.
