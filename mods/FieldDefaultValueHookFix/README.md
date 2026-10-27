# FieldDefaultValueHookFix

FieldDefaultValueHookFix is an unofficial MelonLoader mod for Ancient Kingdoms that prevents a crash on world entry. Install it alongside any other mod in this repository.

[Download FieldDefaultValueHookFix.dll](https://ancient-kingdoms.compendiums.org/mods/FieldDefaultValueHookFix.dll)

## Setup

The fixed MelonLoader linked from [Mods for players](../../README.md#mods-for-players) already contains FieldDefaultValueHookFix.dll in its `Mods` folder. It works automatically and has no settings.

## Limits

If MelonLoader's bundled Il2CppInterop changes or the mod cannot resolve the game function, the fix logs the failure and leaves the original lookup in place. The world-entry crash can remain. [FieldDefaultValueHookFix.cs](FieldDefaultValueHookFix.cs) contains the lookup and patch.

## Development

[CONTRIBUTING.md](../../CONTRIBUTING.md) covers build requirements, deployment, and checks.

## License

MIT. See [LICENSE](../../LICENSE).
