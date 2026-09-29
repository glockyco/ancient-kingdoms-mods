## 1. Confirm the specified behavior

- [x] 1.1 Read the `cf-deploy` script in `website/package.json` and verify that `pnpm build` runs first and that a failed build stops the command before `wrangler deploy`.
- [x] 1.2 Add a temporary link to a missing page on one prerendered route and verify that `pnpm --filter website build` fails with the status, the path, and the linking page. Remove the link and verify that the build succeeds.
- [x] 1.3 Run `uv run pytest tests/test_build_atomicity.py` from `build-pipeline/` and verify that it passes for the missing-export, failed-stage, failed-replacement, and successful-replacement cases.

## 2. Record the contract

- [x] 2.1 Run `openspec validate specify-build-and-deploy-gates --strict` and verify that it passes.
- [x] 2.2 Sync the `site-deployment` and `compendium-build` deltas into `openspec/specs/`, archive the change, and verify that `openspec validate --all --strict` passes.
