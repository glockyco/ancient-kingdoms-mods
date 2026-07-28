#!/bin/bash
# Runs the CI build-pipeline gates against a pristine checkout of HEAD.
#
# CI checks out only tracked files. Locally the repository also holds gitignored
# inputs - config.toml, server-scripts/, website/static/compendium.db - so a test
# that accidentally depends on one passes locally and fails in CI. This script
# reproduces CI's view by running the gates inside a temporary git worktree,
# which by construction contains tracked files only.
#
# Usage: ./scripts/check-clean-checkout.sh
#
# Run it after touching anything that reads repository state at test time. It is
# deliberately not a pre-commit hook: it re-resolves the virtualenv each run,
# which is too slow to pay on every commit.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

TMP_ROOT="$(mktemp -d)"
WORKTREE="$TMP_ROOT/clean"

cleanup() {
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE" 2>/dev/null || true
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

echo "Creating pristine worktree at HEAD..."
git -C "$REPO_DIR" worktree add --detach --quiet "$WORKTREE" HEAD

for leaked in config.toml server-scripts website/static/compendium.db; do
  if [ -e "$WORKTREE/$leaked" ]; then
    echo "Error: $leaked is tracked but expected to be gitignored."
    exit 1
  fi
done

cd "$WORKTREE/build-pipeline"

echo "Installing dependencies..."
uv sync --frozen --quiet

echo "Format check..."
uv run ruff format --check .
echo "Lint..."
uv run ruff check .
echo "Type-check..."
uv run mypy .
echo "Dead-code scan..."
uv run vulture src/ --min-confidence 80
echo "Tests..."
uv run pytest

echo ""
echo "Clean-checkout gates passed."
