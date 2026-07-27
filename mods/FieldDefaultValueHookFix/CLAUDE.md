# FieldDefaultValueHookFix

Compatibility shim for an Il2CppInterop field-default-value hook that resolves the target without byte-signature scanning.

## Why It Exists

Il2CppInterop resolves `Class::GetDefaultFieldValue` by scanning `GameAssembly.dll` for hardcoded byte signatures. On some game builds, the scan matches an unrelated function. The detour then corrupts that function and the process dies with `System.AccessViolationException` inside `Class_GetFieldDefaultValue_Hook.Hook` when a character enters the world.

## How It Works

- `OnEarlyInitializeMelon` reflects the hook type from the `ClassInjector` assembly and locates `FindTargetMethod` plus Il2CppInterop's non-public `FindClassGetFieldDefaultValueXref` method.
- A private Harmony instance named `ancientkingdoms.fielddefaultvaluehookfix` adds a postfix to `FindTargetMethod`.
- The postfix invokes the signature-free xref traversal with `false`, then replaces the stock signature result with the xref result.
- The patch is installed from `OnEarlyInitializeMelon` because the hook is installed during the first Il2Cpp type injection. That injection happens before `OnInitializeMelon`, so a normal initialize callback is too late.

## Verification and Fallbacks

A successful resolution logs both addresses in a message shaped like:

```text
Class::GetDefaultFieldValue signature=0x... xref=0x...
```

Missing required reflection members are logged as errors and leave the stock behavior alone. If xref invocation throws, or returns a null pointer, the postfix logs the problem and keeps the original signature match. The shim therefore degrades to Il2CppInterop's stock path when its compatibility lookup cannot run.

## Project

The project targets `net6.0` and references MelonLoader, `0Harmony`, and `Il2CppInterop.Runtime`. It does not reference the game assembly.
