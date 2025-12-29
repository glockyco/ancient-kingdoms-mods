# Project Map

## Data Flow

```
Game (IL2CPP Unity)
  ↓ MelonLoader Mods
exported-data/*.json + map-screenshots/
  ↓ Python Build Pipeline
build/compendium.db + build/tiles/
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
mods/              # C# MelonLoader mods (Windows only)
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
