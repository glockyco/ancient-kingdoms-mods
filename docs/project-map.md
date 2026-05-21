# Project Map

## Data Flow

```
Game (IL2CPP Unity)
  ↓ MelonLoader Mods
exported-data/*.json + exported-data/images/ + exported-data/screenshots/
  ↓ Python Build Pipeline
website/static/compendium.db + website/static/images/ + website/static/tiles/
  ↓ Website generated support files
website/src/lib/generated/
  ↓ SvelteKit Static Site
Cloudflare Static Assets
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
website/           # SvelteKit static site
exported-data/     # JSON exports from game
build/             # Pipeline outputs (db, tiles)
docs/              # Task-specific guides
```

## Subproject Docs

- `mods/CLAUDE.md` - Shared mod patterns
- `build-pipeline/CLAUDE.md` - Pipeline architecture
- `website/CLAUDE.md` - Website development
