# FieldDefaultValueHookFix

Redirects Il2CppInterop's default-field-value hook to its export-based method lookup.

[Download FieldDefaultValueHookFix.dll](https://ancient-kingdoms.compendiums.org/mods/FieldDefaultValueHookFix.dll).

## Use

With MelonLoader installed, put the DLL in the game's `Mods` folder.

Runs automatically during early initialization; no hotkey or command.

## Settings

None.

## Limits

If the expected Il2CppInterop methods are absent, it leaves the hook unchanged. If lookup fails or returns null, it retains the signature match.

## Requirements

MelonLoader and Ancient Kingdoms.
