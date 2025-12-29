# CLI Overview

## build-tool (C# mods)

**Windows only** - requires .NET SDK and game installation.

```bash
dotnet run --project build-tool build   # Build all mods (Release)
dotnet run --project build-tool deploy  # Copy DLLs to game Mods/
dotnet run --project build-tool all     # Build + deploy (default)
```

Close game before deploying (DLLs are locked while running).

## compendium (Python build pipeline)

```bash
cd build-pipeline
uv run compendium build   # JSON → SQLite database
uv run compendium tiles   # Generate map tiles from screenshots
uv run compendium stats   # Show database statistics
```

Global option: `--config FILE` to override config.toml location.

## pnpm (Website)

```bash
cd website
pnpm dev        # Dev server with HMR (localhost:5173)
pnpm build      # Production build
pnpm preview    # Preview production build
pnpm check      # TypeScript + Svelte validation
pnpm lint       # ESLint
pnpm cf-deploy  # Build + deploy to Cloudflare
```

Pre-commit hooks run automatically: ESLint --fix, Prettier --write.
