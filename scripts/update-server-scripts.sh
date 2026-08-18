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
# server-scripts/ was built from while <version> claims otherwise: that means the
# patch has not landed in the install yet, and decompiling it would silently
# produce an out-of-date diff for the whole update. Pass --force for the rare
# patch that ships an unchanged server assembly.
#
# Creates server-scripts/ (working copy) and server-scripts-<version>/ (backup),
# each carrying a SNAPSHOT.toml that records what produced it.
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
OUTPUT_DIR="$REPO_DIR/server-scripts"
LOCAL_PROPS="$REPO_DIR/Local.props"

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
# UNKNOWN"). Recorded so a snapshot can be traced back to a specific patch.
MANIFEST="$GAME_DIR/../../appmanifest_$GAME_ID.acf"
BUILD_ID=""
if [ -f "$MANIFEST" ]; then
  BUILD_ID=$(sed -n 's/.*"buildid"[^"]*"\([0-9]*\)".*/\1/p' "$MANIFEST" | head -1)
fi

# Guard against decompiling an install that has not received the patch yet.
SNAPSHOT="$OUTPUT_DIR/SNAPSHOT.toml"
if [ "$FORCE" -eq 0 ] && [ -f "$SNAPSHOT" ]; then
  snapshot_value() {
    sed -n "s/^$1 *= *\"\(.*\)\"/\1/p" "$SNAPSHOT" | head -1
  }
  if [ "$(snapshot_value assembly_sha256)" = "$ASSEMBLY_SHA256" ] &&
    [ "$(snapshot_value game_version)" != "$VERSION" ]; then
    echo "Error: the install still carries the $(snapshot_value game_version) server assembly." >&2
    echo "  $DLL" >&2
    echo "  sha256 $ASSEMBLY_SHA256${BUILD_ID:+, Steam build $BUILD_ID}" >&2
    echo "" >&2
    echo "Update it first: dotnet run --project build-tool update" >&2
    echo "Pass --force if $VERSION genuinely ships an unchanged server assembly." >&2
    exit 1
  fi
fi

echo "Decompiling: $DLL"
echo "  sha256 $ASSEMBLY_SHA256${BUILD_ID:+, Steam build $BUILD_ID}"

# Install the pinned tool before destroying the working copy: `set -e` then
# aborts on a network failure with server-scripts/ still intact.
if [ ! -f "$ILSPYCMD_DLL" ]; then
  echo "Installing ilspycmd $ILSPYCMD_VERSION into $TOOL_DIR"
  dotnet tool install ilspycmd --version "$ILSPYCMD_VERSION" --tool-path "$TOOL_DIR"
fi
[ -f "$ILSPYCMD_DLL" ] || die "ilspycmd.dll not found at $ILSPYCMD_DLL"

rm -rf "$OUTPUT_DIR"
dotnet "$ILSPYCMD_DLL" -p -o "$OUTPUT_DIR" "$DLL"

# Record what produced this snapshot so `compendium citations check` can tell a
# game patch apart from a decompiler change.
cat > "$SNAPSHOT" <<EOF
game_version = "$VERSION"
ilspycmd_version = "$ILSPYCMD_VERSION"
assembly_sha256 = "$ASSEMBLY_SHA256"
steam_build_id = "$BUILD_ID"
generated_at = "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
EOF

# Create versioned backup
BACKUP_DIR="$REPO_DIR/server-scripts-$VERSION"
echo "Creating backup at $BACKUP_DIR"
rm -rf "$BACKUP_DIR"
cp -r "$OUTPUT_DIR" "$BACKUP_DIR"

echo "Done! $(ls "$OUTPUT_DIR"/*.cs 2>/dev/null | wc -l) files extracted"
echo "  Working copy: $OUTPUT_DIR"
echo "  Backup: $BACKUP_DIR"
