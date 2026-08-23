#!/bin/bash
# Decompiles the Ancient Kingdoms server assembly into browsable C#.
# These are for REFERENCE ONLY - understanding game mechanics, not for data export.
#
# The assembly is read from the game install named by ANCIENT_KINGDOMS_PATH in
# Local.props - the same CrossOver bottle that build-tool builds, launches and
# exports against. Keeping one install means the decompiled scripts always
# describe the build the exporter ran on. Bring it to the new patch with
# `dotnet run --project build-tool update` (or the bottle's own Steam client)
# before running this.
#
# Prerequisites:
#   - .NET 10 SDK on PATH (the pinned ilspycmd is installed into .ilspycmd/ on demand)
#
# Usage: ./scripts/update-server-scripts.sh <version> [--force]
#
# The script refuses to run when the install still yields the assembly hash that
# the current entry was built from while <version> claims otherwise: that means the
# patch has not landed in the install yet, and decompiling it would silently
# produce an out-of-date diff for the whole update. Pass --force for the rare
# patch that ships an unchanged server assembly.
#
# ## Layout
#
# Each decompile is stored once, under .decompiled/, in an entry named from values
# this script reads for itself:
#
#   .decompiled/steam-<build id>-<first 12 of assembly sha256>/
#   server-scripts -> .decompiled/steam-<build id>-<...>   (the citation path)
#
# `Source: server-scripts/File.cs:NN` citations resolve through the symlink, so the
# path they record never carries a version and never moves. <version> comes from a
# changelog and cannot be derived from the assembly, so it is recorded inside
# SNAPSHOT.toml and never used to name anything.
#
# The store keeps the current entry and RETENTION previous ones. The update
# workflow diffs a new decompile against the entry it replaces, so one previous is
# required; nothing reads the one before that, and the assembly needed to
# regenerate a pruned entry is gone once the installation moves on.
#
# ## Updating ILSpy
#
# 1. Bump ILSPYCMD_VERSION to a *stable* release only - never a -preview.
# 2. Never bump the tool and the game version in the same change. Both shift
#    line numbers identically, and `compendium citations check` cannot
#    attribute the drift if they move together.
# 3. Before committing a bump, decompile the *same* DLL with the old and the new
#    version into two temp directories and `diff -rq` them, ignoring
#    Assembly-CSharp.csproj (its HintPath values always differ by output
#    location). An empty diff means the bump is free; a non-empty diff is a
#    review item and requires `citations check` -> `citations fix` ->
#    `citations sync` afterwards.
# 4. Bump when a new game build fails to decompile, when ILSpy fixes a construct
#    that appears in this assembly, or opportunistically when no mechanics work
#    is in flight - not on a schedule.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

GAME_ID="2241380"
STORE_DIR="$REPO_DIR/.decompiled"
POINTER="$REPO_DIR/server-scripts"
LOCAL_PROPS="$REPO_DIR/Local.props"

# Entries kept besides the current one. The update workflow needs the previous
# entry for its diff step, which is the floor and the value.
RETENTION=1

# Pinned so that line numbers in `Source:` citations stay attributable to game
# patches rather than to decompiler changes. See "Updating ILSpy" above.
ILSPYCMD_VERSION="10.1.1.8388"
TOOL_DIR="$REPO_DIR/.ilspycmd/$ILSPYCMD_VERSION"
# `dotnet tool install --tool-path` stores the managed entrypoint under `.store`.
ILSPYCMD_DLL="$TOOL_DIR/.store/ilspycmd/$ILSPYCMD_VERSION/ilspycmd/$ILSPYCMD_VERSION/tools/net10.0/any/ilspycmd.dll"

VERSION=""
FORCE=0

die() {
  echo "Error: $1" >&2
  exit 1
}

usage() {
  echo "Usage: $0 <version> [--force]" >&2
  exit 1
}

# The decompiled assembly is not ours to redistribute, so a mistaken destination
# is a disclosure rather than an inconvenience. Ask Git rather than trusting a
# .gitignore entry to be correct.
#
# The path checked is the one that will be written, not the directory above it: a
# `dir/` pattern only matches a path Git can see is a directory, so checking a
# store that does not exist yet would refuse every first run.
assert_ignored() {
  local path="$1"
  git -C "$REPO_DIR" check-ignore -q "$path" ||
    die "refusing to write output that Git does not ignore: $path
  Decompiled game source must not be committed. Add it to .gitignore first."
}

# Store entry name. Both values are read from the installation, so the name is a
# claim that can be checked against the tree it names.
entry_name() {
  echo "steam-$1-$(echo "$2" | cut -c1-12)"
}

# Entry names other than the current one, newest first. The build identifier in
# the name orders them; a name that does not carry one sorts last.
other_entries() {
  local current="$1" name build key
  [ -d "$STORE_DIR" ] || return 0
  for path in "$STORE_DIR"/*/; do
    [ -d "$path" ] || continue
    name="$(basename "$path")"
    [ "$name" = "$current" ] && continue
    build="$(echo "$name" | cut -d- -f2)"
    case "$build" in
      '' | *[!0-9]*) key=0 ;;
      *) key="$build" ;;
    esac
    printf '%s\t%s\n' "$key" "$name"
  done | sort -rn -k1,1 | cut -f2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    -h | --help) usage ;;
    -*) echo "Unknown option: $1" >&2; usage ;;
    *)
      [ -z "$VERSION" ] || usage
      VERSION="$1"
      shift
      ;;
  esac
done

[ -n "$VERSION" ] || usage

[ -f "$LOCAL_PROPS" ] || die "$LOCAL_PROPS not found (copy Local.props.example)"
GAME_DIR=$(sed -n 's:.*<ANCIENT_KINGDOMS_PATH>\(.*\)</ANCIENT_KINGDOMS_PATH>.*:\1:p' "$LOCAL_PROPS")
[ -n "$GAME_DIR" ] || die "ANCIENT_KINGDOMS_PATH not set in $LOCAL_PROPS"

# The dedicated-server build is a Mono assembly with real method bodies. The
# client is Il2Cpp: the Assembly-CSharp.dll copies MelonLoader writes under
# MelonLoader/ are interop stubs without bodies, so the path is pinned rather
# than searched for.
DLL="$GAME_DIR/server/server_Data/Managed/Assembly-CSharp.dll"
[ -f "$DLL" ] || die "server assembly not found: $DLL"

ASSEMBLY_SHA256=$(shasum -a 256 "$DLL" | cut -d' ' -f1)

# Steam's build id is the only machine-readable identifier of the game build:
# the assembly carries no version string (MelonLoader logs "Game Version:
# UNKNOWN"). It names the entry, so a decompile that cannot read it cannot be
# stored under a name that identifies its build.
MANIFEST="$GAME_DIR/../../appmanifest_$GAME_ID.acf"
[ -f "$MANIFEST" ] || die "Steam application manifest not found: $MANIFEST"
BUILD_ID=$(sed -n 's/.*"buildid"[^"]*"\([0-9]*\)".*/\1/p' "$MANIFEST" | head -1)
[ -n "$BUILD_ID" ] || die "no buildid recorded in $MANIFEST"

ENTRY_NAME="$(entry_name "$BUILD_ID" "$ASSEMBLY_SHA256")"
ENTRY="$STORE_DIR/$ENTRY_NAME"
STAGING="$STORE_DIR/.staging-$ENTRY_NAME"

# Guard against decompiling an install that has not received the patch yet. The
# pointer resolves to the current entry, so this reads what the citations read.
SNAPSHOT="$POINTER/SNAPSHOT.toml"
if [ "$FORCE" -eq 0 ] && [ -f "$SNAPSHOT" ]; then
  snapshot_value() {
    sed -n "s/^$1 *= *\"\(.*\)\"/\1/p" "$SNAPSHOT" | head -1
  }
  if [ "$(snapshot_value assembly_sha256)" = "$ASSEMBLY_SHA256" ] &&
    [ "$(snapshot_value game_version)" != "$VERSION" ]; then
    echo "Error: the install still carries the $(snapshot_value game_version) server assembly." >&2
    echo "  $DLL" >&2
    echo "  sha256 $ASSEMBLY_SHA256, Steam build $BUILD_ID" >&2
    echo "" >&2
    echo "Update it first: dotnet run --project build-tool update" >&2
    echo "Pass --force if $VERSION genuinely ships an unchanged server assembly." >&2
    exit 1
  fi
fi

assert_ignored "$ENTRY"
assert_ignored "$STAGING"
assert_ignored "$POINTER"

echo "Decompiling: $DLL"
echo "  sha256 $ASSEMBLY_SHA256, Steam build $BUILD_ID"
echo "  Entry: $ENTRY"

# Install the pinned tool before writing anything: `set -e` then aborts on a
# network failure with the store and the pointer untouched.
if [ ! -f "$ILSPYCMD_DLL" ]; then
  echo "Installing ilspycmd $ILSPYCMD_VERSION into $TOOL_DIR"
  dotnet tool install ilspycmd --version "$ILSPYCMD_VERSION" --tool-path "$TOOL_DIR"
fi
[ -f "$ILSPYCMD_DLL" ] || die "ilspycmd.dll not found at $ILSPYCMD_DLL"

# Decompile into staging so a failed run cannot leave a partial tree under a name
# that claims to hold a complete decompile of that build.
mkdir -p "$STORE_DIR"
rm -rf "$STAGING"
dotnet "$ILSPYCMD_DLL" -p -o "$STAGING" "$DLL"

# Record what produced this snapshot so `compendium citations check` can tell a
# game patch apart from a decompiler change. The version is recorded here and
# nowhere else, because it is the one value nothing verifies.
cat > "$STAGING/SNAPSHOT.toml" <<EOF
game_version = "$VERSION"
ilspycmd_version = "$ILSPYCMD_VERSION"
assembly_sha256 = "$ASSEMBLY_SHA256"
steam_build_id = "$BUILD_ID"
generated_at = "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
EOF

rm -rf "$ENTRY"
mv "$STAGING" "$ENTRY"

# Only now move the pointer. Until this line the citations resolve against the
# previous entry, so an aborted run leaves a working tree rather than a gap.
ln -sfn "$(basename "$STORE_DIR")/$ENTRY_NAME" "$POINTER"

PRUNED=0
KEPT=0
while read -r name; do
  [ -n "$name" ] || continue
  if [ "$KEPT" -lt "$RETENTION" ]; then
    KEPT=$((KEPT + 1))
    continue
  fi
  echo "  Pruning $name"
  rm -rf "${STORE_DIR:?}/$name"
  PRUNED=$((PRUNED + 1))
done <<EOF
$(other_entries "$ENTRY_NAME")
EOF

echo "Done! $(ls "$ENTRY"/*.cs 2>/dev/null | wc -l | tr -d ' ') files extracted"
echo "  Entry:    $ENTRY"
echo "  Pointer:  $POINTER -> $(readlink "$POINTER")"
echo "  Retained: $((KEPT + 1)) of $((KEPT + 1 + PRUNED)) entries, pruned $PRUNED"
