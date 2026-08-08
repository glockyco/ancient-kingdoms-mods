#!/bin/bash
# Downloads Ancient Kingdoms via Steam and decompiles server scripts.
# These are for REFERENCE ONLY - understanding game mechanics, not for data export.
#
# Prerequisites:
#   - steamcmd installed (brew install steamcmd)
#   - .NET 10 SDK on PATH (the pinned ilspycmd is installed into .ilspycmd/ on demand)
#
# Usage: ./scripts/update-server-scripts.sh <version>
#   Steam username is read from config.toml [steam] username.
#   Override with: STEAM_USER=username ./scripts/update-server-scripts.sh <version>
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

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

GAME_ID="2241380"
STEAM_DIR="$REPO_DIR/.steam-download"
OUTPUT_DIR="$REPO_DIR/server-scripts"
VERSION="$1"

# Pinned so that line numbers in `Source:` citations stay attributable to game
# patches rather than to decompiler changes. See "Updating ILSpy" above.
ILSPYCMD_VERSION="10.1.1.8388"
TOOL_DIR="$REPO_DIR/.ilspycmd/$ILSPYCMD_VERSION"
# `dotnet tool install --tool-path` stores the managed entrypoint under `.store`.
ILSPYCMD_DLL="$TOOL_DIR/.store/ilspycmd/$ILSPYCMD_VERSION/ilspycmd/$ILSPYCMD_VERSION/tools/net10.0/any/ilspycmd.dll"

# Fall back to config.toml [steam] username if STEAM_USER not set in environment
if [ -z "$STEAM_USER" ]; then
  CONFIG_FILE="$REPO_DIR/config.toml"
  if [ -f "$CONFIG_FILE" ]; then
    STEAM_USER=$(grep -A5 '^\[steam\]' "$CONFIG_FILE" | grep '^username' | sed 's/username *= *"\(.*\)"/\1/')
  fi
fi

if [ -z "$STEAM_USER" ]; then
  echo "Error: Steam username not set. Add it to config.toml:"
  echo "  [steam]"
  echo "  username = \"your_steam_username\""
  echo ""
  echo "See config.toml.example for reference, or set STEAM_USER environment variable."
  exit 1
fi

if [ -z "$VERSION" ]; then
  echo "Error: Version parameter required"
  echo "Usage: STEAM_USER=username $0 <version>"
  exit 1
fi

echo "Downloading Ancient Kingdoms (app $GAME_ID)..."
steamcmd +@sSteamCmdForcePlatformType windows \
         +force_install_dir "$STEAM_DIR" \
         +login "$STEAM_USER" \
         +app_update "$GAME_ID" validate \
         +quit

# Find Assembly-CSharp.dll (prefer Server path if exists)
DLL=$(find "$STEAM_DIR" -name "Assembly-CSharp.dll" -path "*/server/*" 2>/dev/null | head -1)
if [ -z "$DLL" ]; then
  DLL=$(find "$STEAM_DIR" -name "Assembly-CSharp.dll" 2>/dev/null | head -1)
fi

if [ -z "$DLL" ]; then
  echo "Error: Assembly-CSharp.dll not found"
  exit 1
fi

echo "Decompiling: $DLL"

# Install the pinned tool before destroying the working copy: `set -e` then
# aborts on a network failure with server-scripts/ still intact.
if [ ! -f "$ILSPYCMD_DLL" ]; then
  echo "Installing ilspycmd $ILSPYCMD_VERSION into $TOOL_DIR"
  dotnet tool install ilspycmd --version "$ILSPYCMD_VERSION" --tool-path "$TOOL_DIR"
fi
if [ ! -f "$ILSPYCMD_DLL" ]; then
  echo "Error: ilspycmd.dll not found at $ILSPYCMD_DLL"
  exit 1
fi

rm -rf "$OUTPUT_DIR"
dotnet "$ILSPYCMD_DLL" -p -o "$OUTPUT_DIR" "$DLL"

# Record what produced this snapshot so `compendium citations check` can tell a
# game patch apart from a decompiler change.
cat > "$OUTPUT_DIR/SNAPSHOT.toml" <<EOF
game_version = "$VERSION"
ilspycmd_version = "$ILSPYCMD_VERSION"
assembly_sha256 = "$(shasum -a 256 "$DLL" | cut -d' ' -f1)"
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
