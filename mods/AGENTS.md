# Mods

MelonLoader mods run in the Windows game inside CrossOver. The native build tool owns setup, build, deployment, launch, and export.

Use `skill://hotrepl-runtime-inspection` for live state and typed command work. Use `skill://export-game-data` for exporter policy. Use `skill://ancient-kingdoms-save-files` for the external save format.

Path-specific constraints are in `rule://mods-runtime`.

## Build and smoke

Use the commands in the root `README.md`. Build through `dotnet run --project build-tool build`.
