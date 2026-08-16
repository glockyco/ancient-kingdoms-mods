# Project Map

## Data Flow

```
Game (IL2CPP Unity)
  ↓ MelonLoader Mods
exported-data/*.json + exported-data/images/ + exported-data/screenshots/
  ↓ Python Build Pipeline
website/data/compendium.db + website/static/images/ + website/static/tiles/
  ↓ Website prebuild (`generate-home-counts.mjs`)
website/src/lib/generated/
  ↓ SvelteKit mostly prerendered site
Cloudflare Worker + Static Assets
```

## Entry Points

| Subproject | Main File |
|------------|-----------|
| Mods | mods/*/[ModName].cs |
| Build Pipeline | build-pipeline/src/compendium/cli.py |
| Website | website/src/routes/+page.svelte |

## Config Files

| File | Purpose | Gitignored |
|------|---------|------------|
| Local.props | Game install path (MSBuild) | Yes |
| config.toml | Build pipeline paths | Yes |

Templates: `Local.props.example`, `config.toml.example`

## Key Directories

```
mods/              # C# MelonLoader mods (build cross-platform; run via Windows/CrossOver)
build-pipeline/    # Python CLI (Typer + SQLite)
website/           # SvelteKit site, mostly prerendered on Cloudflare with a dynamic home page
exported-data/     # JSON exports from game
website/static/    # Pipeline outputs (database, images, tiles)
build/             # Not written by build or tiles. Used only as stats database lookup directory
docs/              # Task-specific guides
```

## Subproject Docs

- `mods/CLAUDE.md` - Shared mod patterns
- `build-pipeline/CLAUDE.md` - Pipeline architecture
- `website/CLAUDE.md` - Website development
