#!/bin/bash
# Lists the working files under .local/ so that stale folders get noticed.
#
# Usage: ./scripts/local-status.sh
#
# Each folder under .local/changes/ and .local/research/ is listed with its
# size and the date of its newest file. A folder is flagged when it lacks a
# README.md, and a change folder also when its OpenSpec change is archived or
# does not exist. Nothing is deleted. CONTRIBUTING.md describes the layout.
#
# Written for the bash 3.2 that macOS ships, so it avoids arrays under set -u.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_DIR="$REPO_DIR/.local"
CHANGES_DIR="$REPO_DIR/openspec/changes"

if [ ! -d "$LOCAL_DIR" ]; then
  echo "No .local/ folder."
  exit 0
fi

size_of() {
  du -sh "$1" | cut -f1
}

# BSD and GNU date both accept -r FILE. ISO dates sort as text.
newest_date() {
  local newest
  newest="$(find "$1" -type f -exec date -r {} +%F \; | sort | tail -n 1)"
  echo "${newest:-empty}"
}

change_state() {
  local name="$1" match
  if [ -d "$CHANGES_DIR/$name" ]; then
    echo "active"
    return
  fi
  for match in "$CHANGES_DIR"/archive/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-"$name"; do
    if [ -d "$match" ]; then
      echo "archived, delete this folder"
      return
    fi
  done
  echo "no OpenSpec change of this name"
}

list_folders() {
  local kind="$1" dir name notes
  echo ".local/$kind/"
  for dir in "$LOCAL_DIR/$kind"/*/; do
    [ -d "$dir" ] || continue
    name="$(basename "$dir")"
    notes=""
    if [ "$kind" = "changes" ]; then
      notes="$(change_state "$name")"
    fi
    if [ ! -f "$dir/README.md" ]; then
      notes="${notes:+$notes, }no README.md"
    fi
    printf '  %-48s %6s  %s  %s\n' "$name" "$(size_of "$dir")" "$(newest_date "$dir")" "$notes"
  done
}

list_folders changes
list_folders research
for kind in private tmp; do
  if [ -d "$LOCAL_DIR/$kind" ]; then
    printf '%-50s %6s\n' ".local/$kind/" "$(size_of "$LOCAL_DIR/$kind")"
  fi
done
printf '%-50s %6s\n' "Total" "$(size_of "$LOCAL_DIR")"
