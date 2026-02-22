# Mods Development

Shared patterns for all MelonLoader mods. **Windows only** - requires .NET SDK and game installation.

## Quick Start

```bash
dotnet run --project build-tool all  # Build + deploy
```

Close game before deploying (DLLs are locked while running).

## Configuration

Copy `Local.props.example` to `Local.props` and set:

```xml
<ANCIENT_KINGDOMS_PATH>C:\Path\To\Ancient Kingdoms</ANCIENT_KINGDOMS_PATH>
```

MSBuild properties (auto-derived):
- `$(MelonLoaderPath)` - MelonLoader directory
- `$(Il2CppAssembliesPath)` - IL2CPP assemblies
- `$(ModsPath)` - Game's Mods directory

## IL2CPP Patterns

```csharp
// Type operations
Il2CppInterop.Runtime.Il2CppType.Of<T>()

// Casting
gameObject.Cast<Il2Cpp.SomeType>()

// Input (new Input System, not legacy)
var mouse = UnityEngine.InputSystem.Mouse.current;
var keyboard = UnityEngine.InputSystem.Keyboard.current;
```

## MelonLoader Basics

```csharp
[assembly: MelonInfo(typeof(MyMod), "ModName", "1.0.0", "Author")]
[assembly: MelonGame("GameCompany", "AncientKingdoms")]

public class MyMod : MelonMod
{
    public override void OnInitializeMelon() { }
    public override void OnUpdate() { }
}
```

## Adding a New Mod

1. Create directory in `mods/`
2. Create `ModName.csproj` (copy from existing mod)
3. Create `ModName.cs` with mod code
4. Build: `dotnet run --project build-tool all`

The build tool auto-discovers all projects in `mods/`.

## Common Issues

**Build fails: "ANCIENT_KINGDOMS_PATH not set"**
- Copy `Local.props.example` to `Local.props`
- Set path to game installation

**Deploy fails: "file in use"**
- Close Ancient Kingdoms before deploying

**Assembly reference errors**
- Verify MelonLoader is installed in game directory
- Check `MelonLoader\Il2CppAssemblies\` folder exists

## Running on macOS via CrossOver

MelonLoader can't auto-download its dependencies under Wine — they must be placed manually. After installing MelonLoader, if the game crashes before loading mods:

**1. Cpp2IL** — must be ≥ `2022.1.0-pre-release.21` (earlier versions don't support IL2CPP metadata v39 used by Unity 6000.3.x). Download the Windows self-contained exe from [SamboyCoding/Cpp2IL releases](https://github.com/SamboyCoding/Cpp2IL/releases) and place at:
```
MelonLoader/Dependencies/Il2CppAssemblyGenerator/Cpp2IL/Cpp2IL.exe
MelonLoader/Dependencies/Il2CppAssemblyGenerator/Cpp2IL/Plugins/Cpp2IL.Plugin.StrippedCodeRegSupport.dll
```
Also update `Config.cfg` in the `Il2CppAssemblyGenerator/` folder to reflect the version:
```
DumperVersion = "2022.1.0-pre-release.21"
DumperSCRSVersion = "2022.1.0-pre-release.21"
```

**2. Unity Dependencies** — download `Managed.zip` from [LavaGang/MelonLoader.UnityDependencies](https://github.com/LavaGang/MelonLoader.UnityDependencies/releases) for the matching Unity version and place at:
```
MelonLoader/Dependencies/Il2CppAssemblyGenerator/UnityDependencies_<version>.zip
```
e.g. for Unity 6000.3.4: `UnityDependencies_6000.3.4.zip`

Check the MelonLoader log (`MelonLoader/Latest.log`) after each launch — errors are specific and point to exactly what's missing.
