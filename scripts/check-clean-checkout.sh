#!/bin/bash
# Runs the CI build-pipeline gates against a pristine checkout of HEAD.
#
# CI differs from a local run in two ways, and both have caused green-locally,
# red-in-CI failures:
#
#   1. File state. CI checks out tracked files only, while the working tree also
#      holds gitignored inputs - config.toml, server-scripts/,
#      website/static/compendium.db - so a test can accidentally depend on one.
#      Reproduced here with a temporary git worktree, which contains tracked
#      files only by construction.
#
#   2. Environment. GitHub Actions sets GITHUB_ACTIONS, which makes Typer force
#      Rich into terminal mode and emit ANSI colour. Interactive shells often
#      set NO_COLOR or TERM=dumb, which suppresses it again, hiding the
#      difference. Reproduced here by clearing the local colour overrides and
#      exporting the CI markers.
#
# Usage: ./scripts/check-clean-checkout.sh
#
# Run it after touching anything that reads repository state or renders CLI
# output at test time. It is deliberately not a pre-commit hook: it re-resolves
# the virtualenv each run, which is too slow to pay on every commit.

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

# Match CI's environment, not the invoking shell's. Local colour overrides are
# cleared and the CI markers exported so Rich-rendered output looks the way it
# does on a runner.
unset NO_COLOR FORCE_COLOR PY_COLORS CLICOLOR CLICOLOR_FORCE
unset TERMINAL_WIDTH _TYPER_FORCE_DISABLE_TERMINAL
export CI=true GITHUB_ACTIONS=true
export TERM=xterm-256color

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
