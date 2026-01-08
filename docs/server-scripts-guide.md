# Server Scripts Guide

Decompiled server scripts for understanding game mechanics. These are for **reference only**, not for data export.

## Directory Structure

- `server-scripts/` - Working copy (current version)
- `server-scripts-<version>/` - Versioned backups for diffing between versions

## Updating Server Scripts

When a new game version is released:

```bash
STEAM_USER=username ./scripts/update-server-scripts.sh <new-version>
```

This will:
1. Download the game via steamcmd
2. Decompile Assembly-CSharp.dll using ilspycmd
3. Create `server-scripts/` (working copy)
4. Create `server-scripts-<version>/` (backup)

## Comparing Versions

```bash
diff -rq server-scripts-<old-version> server-scripts-<new-version>
```

To see specific changes in a file:
```bash
diff server-scripts-<old>/File.cs server-scripts-<new>/File.cs
```

## Prerequisites

- steamcmd: `brew install steamcmd`
- dotnet 8: `brew install dotnet@8`
- ilspycmd: `dotnet tool install -g ilspycmd`

## Important

Server scripts are **not** used for data export. Game data is exported via the DataExporter mod (see docs/data-export-guide.md).
