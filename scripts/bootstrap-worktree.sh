#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/bootstrap-worktree.sh [options] <trusted-source-checkout>

Bootstrap a fresh Ancient Kingdoms git worktree using local generated export
inputs from a trusted checkout.

Options:
  -h, --help          Show this help text.

The script links input artifacts into the current worktree:
  config.toml, when absent
  missing entries under exported-data/
  Local.props, when present in the trusted checkout

It regenerates worktree-local outputs:
  website/static/compendium.db
  website/static/images/
  website/static/tiles/
  website/src/lib/generated/home-counts.ts
USAGE
}

source_checkout=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -n "$source_checkout" ]]; then
        echo "Unexpected extra argument: $1" >&2
        usage >&2
        exit 2
      fi
      source_checkout="$1"
      shift
      ;;
  esac
done

if [[ -z "$source_checkout" ]]; then
  echo "Missing trusted source checkout path." >&2
  usage >&2
  exit 2
fi

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "Run this script from inside an Ancient Kingdoms git worktree." >&2
  exit 1
}
repo_root=$(cd "$repo_root" && pwd -P)

source_checkout_arg="$source_checkout"
if [[ ! -d "$source_checkout_arg" ]]; then
  echo "Trusted source checkout does not exist: $source_checkout_arg" >&2
  exit 1
fi
source_checkout=$(cd "$source_checkout_arg" && pwd -P)

if [[ "$source_checkout" == "$repo_root" ]]; then
  echo "Trusted source checkout must be a different checkout than the worktree being bootstrapped." >&2
  exit 1
fi

require_path() {
  local path="$1"
  local description="$2"

  if [[ ! -e "$path" ]]; then
    echo "Missing ${description}: ${path}" >&2
    exit 1
  fi
}

link_if_missing() {
  local source="$1"
  local dest="$2"
  local label="$3"

  if [[ -L "$dest" ]]; then
    local current
    current=$(readlink "$dest")
    if [[ "$current" == "$source" ]]; then
      printf 'Already linked %s: %s -> %s\n' "$label" "$dest" "$source"
      return
    fi

    echo "Refusing to replace existing symlink for ${label}: ${dest} -> ${current}" >&2
    exit 1
  fi

  if [[ -e "$dest" ]]; then
    printf 'Using existing %s: %s\n' "$label" "$dest"
    return
  fi

  ln -s "$source" "$dest"
  printf 'Linked %s: %s -> %s\n' "$label" "$dest" "$source"
}

link_exported_data_entries() {
  local source_dir="$1"
  local dest_dir="$2"

  mkdir -p "$dest_dir"

  shopt -s nullglob
  local source_path
  for source_path in "$source_dir"/*; do
    local name
    name=$(basename "$source_path")
    link_if_missing "$source_path" "$dest_dir/$name" "exported-data/$name"
  done
  shopt -u nullglob
}

run() {
  printf '\n$'
  printf ' %q' "$@"
  printf '\n'
  "$@"
}

require_path "$source_checkout/config.toml" "source config.toml"
require_path "$source_checkout/exported-data" "source exported-data directory"
require_path "$source_checkout/exported-data/visual_assets.json" "source visual asset manifest"
require_path "$source_checkout/exported-data/images" "source exported runtime images"
require_path "$source_checkout/exported-data/screenshots/metadata.json" "source screenshot metadata"

cd "$repo_root"
link_if_missing "$source_checkout/config.toml" "$repo_root/config.toml" "config.toml"
link_exported_data_entries "$source_checkout/exported-data" "$repo_root/exported-data"

if [[ -e "$source_checkout/Local.props" ]]; then
  link_if_missing "$source_checkout/Local.props" "$repo_root/Local.props" "Local.props"
fi

run pnpm install --no-frozen-lockfile
run bash -lc 'cd build-pipeline && uv run compendium build'
run bash -lc 'cd build-pipeline && uv run compendium tiles'
run bash -lc 'cd website && pnpm exec svelte-kit sync'
run bash -lc 'cd website && node scripts/generate-home-counts.mjs'

require_path "$repo_root/website/node_modules" "website dependencies"
require_path "$repo_root/website/static/compendium.db" "generated website database"
require_path "$repo_root/website/static/images" "generated website images"
require_path "$repo_root/website/static/tiles" "generated map tiles"
require_path "$repo_root/website/src/lib/generated/home-counts.ts" "generated home counts module"

cat <<'DONE'

Worktree bootstrap complete.

You can now run website validation:
  cd website
  pnpm check
  pnpm lint
  pnpm build
DONE
