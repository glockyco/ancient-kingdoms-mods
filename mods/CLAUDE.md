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
