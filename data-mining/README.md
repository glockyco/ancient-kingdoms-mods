# Data Mining Scripts

Utility scripts for extracting game data from Ancient Kingdoms.

## Usage

These scripts are designed to be run from the **UnityExplorer** console while the game is running.

### UnityExplorer Setup

1. Install UnityExplorer for MelonLoader IL2CPP
2. Launch Ancient Kingdoms
3. Open UnityExplorer (F7 by default)
4. Navigate to the C# Console tab

### Available Scripts

#### Drops.cs

Extracts monster drop tables and loot information.

**Usage:**
1. Copy the contents of `Drops.cs`
2. Paste into UnityExplorer C# Console
3. Execute to dump drop data

The script will output structured data about monster loot tables, drop rates, and item information.

## Notes

- Scripts require the game to be running with MelonLoader + UnityExplorer
- Run scripts in the "World" scene for best results
- Output will appear in the UnityExplorer console or game logs
