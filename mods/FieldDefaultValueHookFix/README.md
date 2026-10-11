# FieldDefaultValueHookFix

Prevents the crash on world entry that MelonLoader causes in Ancient Kingdoms. Every other mod needs it.

[Download FieldDefaultValueHookFix.dll](https://ancient-kingdoms.compendiums.org/mods/FieldDefaultValueHookFix.dll)

## Use

Install MelonLoader, then put the DLL in the game's `Mods` folder. It needs no input.

Il2CppInterop finds one of the game's functions by a byte-signature scan, which matches the wrong function in this game. The mod makes it find the function by following references from a known one instead.

## Settings

None.

## Limits

If the Il2CppInterop version lacks the expected methods, or following the references fails, the mod logs it and keeps the signature scan's result.

## Requirements

MelonLoader.
