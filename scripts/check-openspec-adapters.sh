#!/bin/bash
# Verifies that the tracked OpenSpec agent adapters match what the installed
# OpenSpec CLI generates.
#
# .omp/commands/ and .omp/skills/ are generated files that are committed, so an
# OpenSpec upgrade changes what every agent reads without anyone editing them.
# Committing them is what makes the difference reviewable; this check is what
# makes it visible.
#
# The regeneration happens in a temporary directory rather than in place, for
# two reasons:
#
#   1. A check must not rewrite the working tree. Running the generator here
#      would edit tracked files during a pre-commit hook.
#
#   2. Only .omp/ and openspec/config.yaml are copied, which is everything the
#      generator reads. Copying the whole repository would also expose other
#      agent directories, and the generator would offer to add adapters for
#      tools this repository does not track, making the result depend on which
#      tools happen to be configured locally.
#
# Usage: ./scripts/check-openspec-adapters.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# The pinned CLI from the root devDependencies, not whatever is on PATH. The
# generator stamps its own version into every generated skill, so the tracked
# adapters correspond to exactly one version and a globally installed CLI would
# report drift that does not exist. Resolved as a path because the generator
# runs in a temporary directory, where `pnpm exec` cannot resolve the workspace.
OPENSPEC="$REPO_DIR/node_modules/.bin/openspec"

if [ ! -x "$OPENSPEC" ]; then
  echo "Error: $OPENSPEC is missing. Run 'pnpm install' first."
  exit 1
fi

TMP_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

mkdir -p "$TMP_ROOT/openspec"
cp -R "$REPO_DIR/.omp" "$TMP_ROOT/"
cp "$REPO_DIR/openspec/config.yaml" "$TMP_ROOT/openspec/"

# CI keeps the generator non-interactive; OPENSPEC_TELEMETRY stops it reporting
# the run, so the check needs no network.
echo "Regenerating adapters with openspec $("$OPENSPEC" --version)..."
(cd "$TMP_ROOT" && CI=1 OPENSPEC_TELEMETRY=0 "$OPENSPEC" update . --force >/dev/null)

drifted=0
for dir in commands skills; do
  if ! diff -ru "$REPO_DIR/.omp/$dir" "$TMP_ROOT/.omp/$dir"; then
    drifted=1
  fi
done

if [ "$drifted" -ne 0 ]; then
  echo ""
  echo "Error: tracked OpenSpec adapters differ from the generator's output."
  echo "Run 'openspec update . --force' from the repository root, review the"
  echo "diff, and commit it."
  exit 1
fi

echo "OpenSpec adapters are current."
