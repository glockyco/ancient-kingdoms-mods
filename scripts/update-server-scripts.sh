#!/bin/bash
# Downloads Ancient Kingdoms via Steam and decompiles server scripts.
# These are for REFERENCE ONLY - understanding game mechanics, not for data export.
#
# Prerequisites:
#   - steamcmd installed (brew install steamcmd)
#   - ilspycmd installed (dotnet tool install -g ilspycmd)
#   - dotnet 8 runtime (brew install dotnet@8)
#
# Usage: ./scripts/update-server-scripts.sh <version>
#   Steam username is read from config.toml [steam] username.
#   Override with: STEAM_USER=username ./scripts/update-server-scripts.sh <version>
#
# Creates server-scripts/ (working copy) and server-scripts-<version>/ (backup)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

GAME_ID="2241380"
STEAM_DIR="$REPO_DIR/.steam-download"
OUTPUT_DIR="$REPO_DIR/server-scripts"
VERSION="$1"

# ilspycmd requires dotnet 8 (not compatible with dotnet 10+)
DOTNET8="/opt/homebrew/opt/dotnet@8/libexec/dotnet"
ILSPYCMD_DLL="$HOME/.dotnet/tools/.store/ilspycmd/9.1.0.7988/ilspycmd/9.1.0.7988/tools/net8.0/any/ilspycmd.dll"

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
rm -rf "$OUTPUT_DIR"
"$DOTNET8" "$ILSPYCMD_DLL" -p -o "$OUTPUT_DIR" "$DLL"

# Create versioned backup
BACKUP_DIR="$REPO_DIR/server-scripts-$VERSION"
echo "Creating backup at $BACKUP_DIR"
rm -rf "$BACKUP_DIR"
cp -r "$OUTPUT_DIR" "$BACKUP_DIR"

echo "Done! $(ls "$OUTPUT_DIR"/*.cs 2>/dev/null | wc -l) files extracted"
echo "  Working copy: $OUTPUT_DIR"
echo "  Backup: $BACKUP_DIR"
