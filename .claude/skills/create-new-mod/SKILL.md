---
name: create-new-mod
description: Create a new MelonLoader mod for Ancient Kingdoms
---

## Overview

MelonLoader mods for Ancient Kingdoms (IL2CPP Unity game). Code can be written on any platform, but building requires Windows with .NET SDK and game installation.

## Steps

1. **Create directory** in `mods/`
2. **Create `ModName.csproj`** (copy from existing mod like `BossTracker`)
3. **Create `ModName.cs`** with mod entry point
4. **Optionally create `CLAUDE.md`** for mod-specific documentation
5. **Build** (Windows only): `dotnet run --project build-tool all`

## Project File Template

Copy from an existing mod like `BossTracker.csproj` and modify:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <AssemblyName>ModName</AssemblyName>
    <RootNamespace>ModName</RootNamespace>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>

  <ItemGroup>
    <!-- MelonLoader -->
    <Reference Include="MelonLoader">
      <HintPath>$(MelonLoaderPath)\net6\MelonLoader.dll</HintPath>
      <Private>False</Private>
    </Reference>

    <!-- Unity Engine -->
    <Reference Include="UnityEngine.CoreModule">
      <HintPath>$(Il2CppAssembliesPath)\UnityEngine.CoreModule.dll</HintPath>
      <Private>False</Private>
    </Reference>

    <!-- Game Assembly -->
    <Reference Include="Assembly-CSharp">
      <HintPath>$(Il2CppAssembliesPath)\Assembly-CSharp.dll</HintPath>
      <Private>False</Private>
    </Reference>

    <!-- IL2CPP Dependencies -->
    <Reference Include="Il2Cppmscorlib">
      <HintPath>$(Il2CppAssembliesPath)\Il2Cppmscorlib.dll</HintPath>
      <Private>False</Private>
    </Reference>

    <Reference Include="Il2CppInterop.Runtime">
      <HintPath>$(MelonLoaderPath)\net6\Il2CppInterop.Runtime.dll</HintPath>
      <Private>False</Private>
    </Reference>

    <!-- Add other references as needed from BossTracker.csproj -->
  </ItemGroup>

</Project>
```

## Entry Point Template

```csharp
using MelonLoader;

[assembly: MelonInfo(typeof(ModName.ModName), "ModName", "1.0.0", "Author")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace ModName;

public class ModName : MelonMod
{
    public override void OnInitializeMelon()
    {
        LoggerInstance.Msg("ModName initialized!");
    }

    public override void OnUpdate()
    {
        // Called every frame
    }
}
```

## IL2CPP Patterns

```csharp
// Type operations
Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Monster>()

// Casting
gameObject.Cast<Il2Cpp.SomeType>()

// Safe casting
var result = obj.TryCast<Il2Cpp.SomeType>();
if (result != null) { ... }

// Input (new Input System)
var mouse = UnityEngine.InputSystem.Mouse.current;
var keyboard = UnityEngine.InputSystem.Keyboard.current;
```

## Key Files

- `mods/CLAUDE.md` - Shared patterns documentation
- `mods/BossTracker/BossTracker.csproj` - Reference for project structure
- `mods/BossTracker/BossTracker.cs` - Example mod with UI
- `mods/DataExporter/DataExporter.cs` - Complex mod example

## Configuration

Before building, copy `Local.props.example` to `Local.props` and set:

```xml
<ANCIENT_KINGDOMS_PATH>C:\Path\To\Ancient Kingdoms</ANCIENT_KINGDOMS_PATH>
```

MSBuild properties (auto-derived):
- `$(MelonLoaderPath)` - MelonLoader directory
- `$(Il2CppAssembliesPath)` - IL2CPP assemblies

## Common Issues

- **"ANCIENT_KINGDOMS_PATH not set"**: Create `Local.props`
- **"file in use"**: Close game before deploying
- **Assembly reference errors**: Verify MelonLoader is installed

## Gotchas

- `Resources.FindObjectsOfTypeAll()` returns prefabs AND scene instances - filter with `gameObject.scene.IsValid()`
- Always use `TryCast<>()` for safe IL2CPP type conversions
- The build tool auto-discovers all `.csproj` files in `mods/`
- Use `"ancientpixels"` and `"ancientkingdoms"` for MelonGame attribute
