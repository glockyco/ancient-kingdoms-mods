# BossMod Plan 1 — Foundation + ImGui Renderer

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `mods/BossMod` mod skeleton with a working ImGui.NET renderer driven by `MelonMod.OnGUI`, so subsequent plans can paint windows.

**Architecture:** New MelonLoader mod referencing `ImGui.NET` via NuGet, with `cimgui.dll` embedded as a resource and extracted at runtime to a cache dir. Renderer dispatches ImGui draw lists to Unity through a `CommandBuffer` mesh-per-draw-list. Implemented from scratch against IL2CPP/MelonLoader, using Erenshor's `ImGuiRenderer.cs` as reference for stumbling blocks only.

**Tech Stack:** C# net6.0, MelonLoader, IL2CPP, Unity URP, ImGui.NET 1.89.1, ILRepack, xunit (host-side, doesn't apply here — Plan 1 has no host-testable code).

**Spec:** `docs/superpowers/specs/2026-04-29-bossmod-design.md`

**Out of scope for this plan:** Tracking, catalog, alerts, audio, individual UI windows beyond a smoke-test demo window, settings persistence. Those land in plans 2–4.

---

## File Structure

| Path | Responsibility | Status |
|---|---|---|
| `mods/BossMod/BossMod.csproj` | Project, NuGet refs, Il2Cpp refs, ILRepack, embedded resources | Create |
| `mods/BossMod/ILRepack.targets` | Merge ImGui.NET + System.Numerics.Vectors + Unsafe into single DLL | Create |
| `mods/BossMod/BossMod.cs` | `MelonMod` entry, owns `ImGuiRenderer` lifecycle, calls `ImGui.ShowDemoWindow` for smoke test | Create |
| `mods/BossMod/Imgui/CimguiNative.cs` | P/Invoke for `cimgui` entry points that take `ImVec2`/`ImVec4` (ImGui.NET does this for some, not all) | Create |
| `mods/BossMod/Imgui/ImGuiRenderer.cs` | Renderer: native loading, font atlas, draw-data → CommandBuffer, input bridge | Create |
| `mods/BossMod/Imgui/resources/cimgui.dll` | Native cimgui binary, embedded resource | Drop in |
| `mods/BossMod/CLAUDE.md` | Mod-specific docs (deferred until plan 4) | — |
| `AncientKingdomsMods.sln` | Add `BossMod` project | Modify |

---

## Task 1: Scaffold the project

**Files:**
- Create: `mods/BossMod/BossMod.csproj`
- Create: `mods/BossMod/ILRepack.targets`
- Create: `mods/BossMod/BossMod.cs`
- Modify: `AncientKingdomsMods.sln`

- [ ] **Step 1: Create `mods/BossMod/BossMod.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <AssemblyName>BossMod</AssemblyName>
    <RootNamespace>BossMod</RootNamespace>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
    <CopyLocalLockFileAssemblies>true</CopyLocalLockFileAssemblies>
  </PropertyGroup>

  <!-- NuGet -->
  <ItemGroup>
    <PackageReference Include="ImGui.NET" Version="1.89.1" PrivateAssets="all" />
    <PackageReference Include="System.Numerics.Vectors" Version="4.5.0" PrivateAssets="all" />
    <PackageReference Include="System.Runtime.CompilerServices.Unsafe" Version="4.5.3" PrivateAssets="all" />
    <PackageReference Include="ILRepack.Lib.MSBuild.Task" Version="2.0.34.2" PrivateAssets="all" />
  </ItemGroup>

  <!-- MelonLoader / Unity / IL2CPP -->
  <ItemGroup>
    <Reference Include="MelonLoader">
      <HintPath>$(MelonLoaderPath)\net6\MelonLoader.dll</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="Il2CppInterop.Runtime">
      <HintPath>$(MelonLoaderPath)\net6\Il2CppInterop.Runtime.dll</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="UnityEngine">
      <HintPath>$(Il2CppAssembliesPath)\UnityEngine.dll</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="UnityEngine.CoreModule">
      <HintPath>$(Il2CppAssembliesPath)\UnityEngine.CoreModule.dll</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="UnityEngine.IMGUIModule">
      <HintPath>$(Il2CppAssembliesPath)\UnityEngine.IMGUIModule.dll</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="Unity.InputSystem">
      <HintPath>$(Il2CppAssembliesPath)\Unity.InputSystem.dll</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="Il2Cppmscorlib">
      <HintPath>$(Il2CppAssembliesPath)\Il2Cppmscorlib.dll</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="Assembly-CSharp">
      <HintPath>$(Il2CppAssembliesPath)\Assembly-CSharp.dll</HintPath>
      <Private>False</Private>
    </Reference>
  </ItemGroup>

  <!-- Embedded resources -->
  <ItemGroup>
    <EmbeddedResource Include="Imgui/resources/cimgui.dll" LogicalName="BossMod.cimgui.dll" />
  </ItemGroup>

  <!-- ILRepack lives in its own targets file -->
  <Import Project="ILRepack.targets" />

</Project>
```

- [ ] **Step 2: Create `mods/BossMod/ILRepack.targets`**

```xml
<Project>
  <Target Name="ILRepacker" AfterTargets="Build">
    <ItemGroup>
      <InputAssemblies Include="$(OutputPath)$(AssemblyName).dll" />
      <MergeAssemblies Include="$(OutputPath)ImGui.NET.dll" />
      <MergeAssemblies Include="$(OutputPath)System.Numerics.Vectors.dll" />
      <MergeAssemblies Include="$(OutputPath)System.Runtime.CompilerServices.Unsafe.dll" />
    </ItemGroup>
    <ILRepack
      Parallel="true"
      Internalize="true"
      DebugInfo="true"
      InputAssemblies="@(InputAssemblies);@(MergeAssemblies)"
      OutputFile="$(OutputPath)$(AssemblyName).dll"
      LibraryPath="$(MelonLoaderPath)\net6;$(Il2CppAssembliesPath)" />
    <Delete Files="@(MergeAssemblies)" />
  </Target>
</Project>
```

- [ ] **Step 3: Create `mods/BossMod/BossMod.cs` (entry stub, no rendering yet)**

```csharp
using MelonLoader;

[assembly: MelonInfo(typeof(BossMod.BossMod), "BossMod", "0.1.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossMod;

public class BossMod : MelonMod
{
    public override void OnInitializeMelon()
    {
        LoggerInstance.Msg("BossMod initialized (skeleton)");
    }
}
```

- [ ] **Step 4: Add `BossMod` project to the solution**

```bash
dotnet sln AncientKingdomsMods.sln add mods/BossMod/BossMod.csproj
```

Expected output: `Project ... added to the solution.`

- [ ] **Step 5: Drop placeholder cimgui.dll into resources directory**

The actual cimgui.dll must be the 1.89.1-matching Windows build (32-bit vs 64-bit must match the game's process architecture; Ancient Kingdoms is x64 Unity). Source: download from [ImGui.NET deps](https://github.com/ImGuiNET/ImGui.NET/tree/master/deps/cimgui/win-x64) at the matching tag, OR extract from the NuGet package `ImGui.NET.Native.win-x64`.

```bash
mkdir -p mods/BossMod/Imgui/resources
# Manually place cimgui.dll (Win64, ImGui v1.89.1) at:
# mods/BossMod/Imgui/resources/cimgui.dll
ls -la mods/BossMod/Imgui/resources/cimgui.dll
```

Expected: file exists, ~700-1200 KB.

- [ ] **Step 6: Build and verify**

```bash
dotnet run --project build-tool build
```

Expected: `BossMod` listed in build output, single `BossMod.dll` produced under `mods/BossMod/bin/Release/net6.0/`. ILRepack should have merged in ImGui.NET and System.* assemblies and deleted the unmerged copies.

- [ ] **Step 7: Deploy and verify game starts**

Close the game first.

```bash
dotnet run --project build-tool all
```

Launch game manually, then:

```bash
tail -50 "$ANCIENT_KINGDOMS_PATH/MelonLoader/Latest.log" | grep -i bossmod
```

Expected: `[BossMod] BossMod initialized (skeleton)` line.

- [ ] **Step 8: Commit**

```bash
git add mods/BossMod/ AncientKingdomsMods.sln
git commit -m "feat(bossmod): scaffold mod project with ILRepack + cimgui resource"
```

---

## Task 2: Cimgui native P/Invoke shim

**Files:**
- Create: `mods/BossMod/Imgui/CimguiNative.cs`

ImGui.NET wraps most cimgui entry points but a few that take `ImVec2`/`ImVec4` by value have ABI quirks. We declare the small set we need directly. (Erenshor's `CimguiNative.cs` is a reference for which entry points are commonly missing.)

- [ ] **Step 1: Write the P/Invoke shim**

```csharp
using System.Numerics;
using System.Runtime.InteropServices;

namespace BossMod.Imgui;

/// <summary>
/// Direct P/Invoke for cimgui entry points where ImGui.NET's wrapper has
/// ABI quirks around ImVec2/ImVec4 by-value parameters. Functions added
/// here only when an ImGui.NET call returns wrong values or crashes.
/// </summary>
internal static class CimguiNative
{
    private const string Lib = "cimgui";

    // Size struct mirror — used when we need to pass to native by value.
    [StructLayout(LayoutKind.Sequential)] internal struct Vec2 { public float X, Y; public Vec2(float x, float y) { X = x; Y = y; } public Vec2(Vector2 v) { X = v.X; Y = v.Y; } }
    [StructLayout(LayoutKind.Sequential)] internal struct Vec4 { public float X, Y, Z, W; }

    // Add native entry points here as needed during renderer implementation.
    // Empty for now; populated in Task 5/6 if ImGui.NET wrappers misbehave.
}
```

- [ ] **Step 2: Verify build**

```bash
dotnet run --project build-tool build
```

Expected: builds.

- [ ] **Step 3: Commit**

```bash
git add mods/BossMod/Imgui/CimguiNative.cs
git commit -m "feat(bossmod): add cimgui P/Invoke shim placeholder"
```

---

## Task 3: ImGuiRenderer skeleton + cimgui native loading + context creation

**Files:**
- Create: `mods/BossMod/Imgui/ImGuiRenderer.cs`

Skeleton that handles the IL2CPP-friendly cimgui DLL extraction + LoadLibrary, ImGui context creation, and an explicit IniPath. Font atlas + render path land in subsequent tasks. This is roughly the analog of Erenshor's `Init` minus font/material — split for review-ability.

- [ ] **Step 1: Write the renderer skeleton**

```csharp
using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using ImGuiNET;
using MelonLoader;

namespace BossMod.Imgui;

/// <summary>
/// Self-contained Dear ImGui rendering backend for Unity IL2CPP under MelonLoader.
///
/// Responsibilities:
///   - Extract bundled cimgui.dll from embedded resources, load it via LoadLibrary
///   - Create the ImGui context, configure IniPath, build the font atlas
///   - Render ImGui draw data each frame as Unity meshes through a CommandBuffer
///   - Forward Unity input (new InputSystem) into ImGui IO
///
/// Skeleton in Task 3; font atlas in Task 4; render path in Task 5; input in Task 6.
/// </summary>
public sealed partial class ImGuiRenderer : IDisposable
{
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool FreeLibrary(IntPtr hModule);

    private readonly MelonLogger.Instance _log;
    private IntPtr _nativeLib;
    private IntPtr _context;
    private GCHandle _iniPathHandle;

    /// <summary>Layout callback invoked between NewFrame and EndFrame each repaint.</summary>
    public Action? OnLayout { get; set; }

    /// <summary>True when ImGui's IO captured the mouse this frame.</summary>
    public bool WantCaptureMouse { get; private set; }

    /// <summary>True when an ImGui text input is actively being edited.</summary>
    public bool WantTextInput { get; private set; }

    public ImGuiRenderer(MelonLogger.Instance log) => _log = log;

    /// <summary>
    /// Bring up cimgui native + ImGui context + font atlas + render material.
    /// Returns false if any step fails; caller should not call OnGUI then.
    /// </summary>
    /// <param name="iniPath">Absolute path for ImGui's window-state ini.</param>
    /// <param name="cacheDir">Writable directory for extracting cimgui.dll.</param>
    public bool Init(string iniPath, string cacheDir)
    {
        try
        {
            if (!ExtractAndLoadNative(cacheDir)) return false;

            _context = ImGui.CreateContext();
            ImGui.SetCurrentContext(_context);
            var io = ImGui.GetIO();
            io.BackendFlags |= ImGuiBackendFlags.RendererHasVtxOffset;

            PinIniPath(iniPath, io);
            ImGui.StyleColorsDark();

            BuildFontAtlas(io);   // Task 4
            CreateMaterial();     // Task 5
            CreateCommandBuffer();// Task 5

            _log.Msg("ImGui.NET initialized");
            return true;
        }
        catch (Exception ex)
        {
            _log.Error($"ImGui init failed: {ex}");
            return false;
        }
    }

    private bool ExtractAndLoadNative(string cacheDir)
    {
        var asm = Assembly.GetExecutingAssembly();
        using var stream = asm.GetManifestResourceStream("BossMod.cimgui.dll");
        if (stream == null) { _log.Error("cimgui.dll not embedded"); return false; }

        Directory.CreateDirectory(cacheDir);
        var dllPath = Path.Combine(cacheDir, "cimgui.dll");

        // LoadLibrary on an already-loaded DLL increments refcount cleanly,
        // so we skip the rewrite if it exists (avoids file-locked errors on
        // hot reload or restart after crash).
        if (!File.Exists(dllPath))
        {
            var bytes = new byte[stream.Length];
            stream.Read(bytes, 0, bytes.Length);
            File.WriteAllBytes(dllPath, bytes);
        }

        _nativeLib = LoadLibrary(dllPath);
        if (_nativeLib == IntPtr.Zero)
        {
            _log.Error($"LoadLibrary failed: {dllPath} (Win32 error {Marshal.GetLastWin32Error()})");
            return false;
        }
        return true;
    }

    private unsafe void PinIniPath(string iniPath, ImGuiIOPtr io)
    {
        // ImGui reads io.IniFilename's bytes each frame, so the buffer must be
        // pinned for the context's lifetime. UTF-8 + null terminator.
        var bytes = System.Text.Encoding.UTF8.GetBytes(iniPath + "\0");
        _iniPathHandle = GCHandle.Alloc(bytes, GCHandleType.Pinned);
        io.NativePtr->IniFilename = (byte*)_iniPathHandle.AddrOfPinnedObject();
    }

    public void Dispose()
    {
        DisposeCommandBuffer();  // Task 5
        DisposeFontAtlas();      // Task 4
        DisposeMaterial();       // Task 5

        if (_iniPathHandle.IsAllocated) _iniPathHandle.Free();

        if (_context != IntPtr.Zero)
        {
            ImGui.DestroyContext(_context);
            _context = IntPtr.Zero;
        }
        if (_nativeLib != IntPtr.Zero)
        {
            FreeLibrary(_nativeLib);
            _nativeLib = IntPtr.Zero;
        }
    }
}
```

This file declares partial-method-style stubs that subsequent tasks fill in. We use `partial` so each major piece (font atlas, render path, input) lives in its own file for reviewability.

- [ ] **Step 2: Add empty partial-class stubs so the project still builds**

Append to the same file (`ImGuiRenderer.cs`) — these will be moved to dedicated files in later tasks:

```csharp
public sealed partial class ImGuiRenderer
{
    private void BuildFontAtlas(ImGuiIOPtr io) { /* Task 4 */ }
    private void DisposeFontAtlas() { /* Task 4 */ }
    private void CreateMaterial() { /* Task 5 */ }
    private void DisposeMaterial() { /* Task 5 */ }
    private void CreateCommandBuffer() { /* Task 5 */ }
    private void DisposeCommandBuffer() { /* Task 5 */ }
}
```

- [ ] **Step 3: Build, verify ImGui.NET resolves**

```bash
dotnet run --project build-tool build
```

Expected: builds. ImGui.NET types should resolve.

- [ ] **Step 4: Commit**

```bash
git add mods/BossMod/Imgui/ImGuiRenderer.cs
git commit -m "feat(bossmod): add ImGuiRenderer skeleton with cimgui native loading"
```

---

## Task 4: Font atlas

**Files:**
- Modify: `mods/BossMod/Imgui/ImGuiRenderer.cs` (replace BuildFontAtlas/DisposeFontAtlas stubs; or split into a new `ImGuiRenderer.FontAtlas.cs`)

Default ProggyClean is good enough for a v1 boss mod. We can swap in a TTF later. Key constraints (per spec stumbling-blocks list):
- TTF allocated via `ImGui.MemAlloc` if we add one (skipped here — using default font means no allocation).
- Font texture lives in our own field; stored separately from user-registered textures because UV transforms differ.

- [ ] **Step 1: Replace `BuildFontAtlas` and `DisposeFontAtlas`**

In `mods/BossMod/Imgui/ImGuiRenderer.cs`, replace the stubs with:

```csharp
public sealed partial class ImGuiRenderer
{
    private Il2CppUnityEngine.Texture2D? _fontTexture;

    private unsafe void BuildFontAtlas(ImGuiIOPtr io)
    {
        // Use default font for v1. Swap in a TTF in plan 4 if Roboto is desired.
        io.Fonts.AddFontDefault();
        io.Fonts.Build();

        io.Fonts.GetTexDataAsRGBA32(out byte* pixels, out int width, out int height, out int _);

        _fontTexture = new Il2CppUnityEngine.Texture2D(width, height, Il2CppUnityEngine.TextureFormat.RGBA32, false);

        var data = new byte[width * height * 4];
        Marshal.Copy((IntPtr)pixels, data, 0, data.Length);
        // Il2Cpp byte[] interop: convert managed array via Il2CppInterop.
        var il2cppData = new Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppStructArray<byte>(data);
        _fontTexture.LoadRawTextureData(il2cppData);
        _fontTexture.Apply();

        io.Fonts.SetTexID(_fontTexture.GetNativeTexturePtr());
    }

    private void DisposeFontAtlas()
    {
        if (_fontTexture != null)
        {
            Il2CppUnityEngine.Object.Destroy(_fontTexture);
            _fontTexture = null;
        }
    }
}
```

Add at top of file:

```csharp
using Il2CppUnityEngine = Il2Cpp.UnityEngine;
```

- [ ] **Step 2: Build**

```bash
dotnet run --project build-tool build
```

Expected: builds. If `Il2Cpp.UnityEngine.Texture2D` resolution fails, the assembly reference path in `BossMod.csproj` is wrong; verify `$(Il2CppAssembliesPath)\UnityEngine.CoreModule.dll` exists.

- [ ] **Step 3: Commit**

```bash
git add mods/BossMod/Imgui/ImGuiRenderer.cs
git commit -m "feat(bossmod): build ImGui font atlas into Unity Texture2D"
```

---

## Task 5: Render path — material + CommandBuffer + draw-data dispatch

**Files:**
- Modify: `mods/BossMod/Imgui/ImGuiRenderer.cs` (replace material/command-buffer stubs and add `OnGUI` + `RenderDrawData`)

This is the biggest task in this plan. We render each `ImDrawList` as a single Unity `Mesh` and dispatch via `CommandBuffer.DrawMesh`. Per spec:
- Mesh batching: one mesh per ImDrawList (simplest correct option; pool added later if perf demands).
- Material: `UI/Default` shader with alpha blending.
- Texture switching: per-`ImDrawCmd` material property override using ImGui's texture id (Unity native texture pointer).
- Scissor rects: applied to mesh sub-meshes via `CommandBuffer.EnableScissorRect` / `DisableScissorRect`.

- [ ] **Step 1: Add fields + material/CommandBuffer creation/dispose**

Replace `CreateMaterial` / `DisposeMaterial` / `CreateCommandBuffer` / `DisposeCommandBuffer` stubs with:

```csharp
public sealed partial class ImGuiRenderer
{
    private Il2CppUnityEngine.Material? _material;
    private Il2CppUnityEngine.Rendering.CommandBuffer? _commandBuffer;
    private readonly System.Collections.Generic.List<Il2CppUnityEngine.Mesh> _meshPool = new();
    private readonly System.Collections.Generic.Dictionary<IntPtr, Il2CppUnityEngine.Texture> _userTextures = new();

    private void CreateMaterial()
    {
        var shader = Il2CppUnityEngine.Shader.Find("UI/Default");
        _material = new Il2CppUnityEngine.Material(shader)
        {
            hideFlags = Il2CppUnityEngine.HideFlags.HideAndDontSave
        };
        _material.SetInt("_SrcBlend", (int)Il2CppUnityEngine.Rendering.BlendMode.SrcAlpha);
        _material.SetInt("_DstBlend", (int)Il2CppUnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
        _material.SetInt("_ZWrite", 0);
        _material.SetInt("_Cull", (int)Il2CppUnityEngine.Rendering.CullMode.Off);
        _material.mainTexture = _fontTexture;
    }

    private void DisposeMaterial()
    {
        foreach (var m in _meshPool) Il2CppUnityEngine.Object.Destroy(m);
        _meshPool.Clear();

        if (_material != null) { Il2CppUnityEngine.Object.Destroy(_material); _material = null; }
    }

    private void CreateCommandBuffer()
    {
        _commandBuffer = new Il2CppUnityEngine.Rendering.CommandBuffer { name = "BossMod_ImGui" };
    }

    private void DisposeCommandBuffer()
    {
        _commandBuffer?.Dispose();
        _commandBuffer = null;
    }

    /// <summary>Register a Unity texture so it can be used as ImGui.Image texture id.</summary>
    public IntPtr RegisterTexture(Il2CppUnityEngine.Texture tex)
    {
        var id = tex.GetNativeTexturePtr();
        _userTextures[id] = tex;
        return id;
    }

    public void UnregisterTexture(IntPtr id) => _userTextures.Remove(id);
}
```

- [ ] **Step 2: Implement `OnGUI` + render dispatch**

Append to `ImGuiRenderer.cs`:

```csharp
public sealed partial class ImGuiRenderer
{
    /// <summary>
    /// Drive ImGui from MelonMod.OnGUI. We only render on Repaint events; other
    /// event types are skipped.
    /// </summary>
    public void OnGUI()
    {
        var current = Il2CppUnityEngine.Event.current;
        if (current == null || current.type != Il2CppUnityEngine.EventType.Repaint) return;

        try
        {
            var io = ImGui.GetIO();
            io.DisplaySize = new System.Numerics.Vector2(
                Il2CppUnityEngine.Screen.width,
                Il2CppUnityEngine.Screen.height);
            io.DeltaTime = Il2CppUnityEngine.Time.deltaTime > 0
                ? Il2CppUnityEngine.Time.deltaTime
                : 1f / 60f;

            UpdateInput(io);  // Task 6

            ImGui.NewFrame();
            OnLayout?.Invoke();
            ImGui.EndFrame();

            WantCaptureMouse = io.WantCaptureMouse;
            WantTextInput = io.WantTextInput;

            ImGui.Render();
            RenderDrawData();
        }
        catch (Exception ex)
        {
            _log.Error($"ImGui render error: {ex}");
        }
    }

    private unsafe void RenderDrawData()
    {
        if (_commandBuffer == null || _material == null) return;

        var draw = ImGui.GetDrawData();
        if (draw.CmdListsCount == 0) return;

        float screenW = Il2CppUnityEngine.Screen.width;
        float screenH = Il2CppUnityEngine.Screen.height;
        var projection = Il2CppUnityEngine.Matrix4x4.Ortho(0, screenW, screenH, 0, -1, 1);

        _commandBuffer.Clear();
        _commandBuffer.SetProjectionMatrix(projection);
        _commandBuffer.SetViewMatrix(Il2CppUnityEngine.Matrix4x4.identity);

        // Grow mesh pool to match ImDrawList count
        while (_meshPool.Count < draw.CmdListsCount)
        {
            _meshPool.Add(new Il2CppUnityEngine.Mesh
            {
                hideFlags = Il2CppUnityEngine.HideFlags.HideAndDontSave,
                indexFormat = Il2CppUnityEngine.Rendering.IndexFormat.UInt32
            });
        }

        for (int i = 0; i < draw.CmdListsCount; i++)
        {
            var cmdList = draw.CmdListsRange[i];
            BuildMesh(cmdList, _meshPool[i]);

            for (int c = 0; c < cmdList.CmdBuffer.Size; c++)
            {
                var cmd = cmdList.CmdBuffer[c];
                if (cmd.UserCallback != IntPtr.Zero) continue;

                var clip = cmd.ClipRect;
                _commandBuffer.EnableScissorRect(new Il2CppUnityEngine.Rect(
                    clip.X, screenH - clip.W,
                    clip.Z - clip.X, clip.W - clip.Y));

                var texId = cmd.TextureId;
                var tex = _userTextures.TryGetValue(texId, out var t) ? t : (Il2CppUnityEngine.Texture)_fontTexture!;
                var mpb = new Il2CppUnityEngine.MaterialPropertyBlock();
                mpb.SetTexture("_MainTex", tex);

                _commandBuffer.DrawMesh(
                    _meshPool[i],
                    Il2CppUnityEngine.Matrix4x4.identity,
                    _material,
                    submeshIndex: c,
                    shaderPass: 0,
                    properties: mpb);
            }
        }
        _commandBuffer.DisableScissorRect();

        Il2CppUnityEngine.Graphics.ExecuteCommandBuffer(_commandBuffer);
    }

    private unsafe void BuildMesh(ImDrawListPtr cmdList, Il2CppUnityEngine.Mesh mesh)
    {
        int vtxCount = cmdList.VtxBuffer.Size;
        int idxCount = cmdList.IdxBuffer.Size;

        var verts = new Il2CppUnityEngine.Vector3[vtxCount];
        var uvs = new Il2CppUnityEngine.Vector2[vtxCount];
        var colors = new Il2CppUnityEngine.Color32[vtxCount];

        var vptr = (ImDrawVert*)cmdList.VtxBuffer.Data;
        for (int i = 0; i < vtxCount; i++)
        {
            verts[i] = new Il2CppUnityEngine.Vector3(vptr[i].pos.X, vptr[i].pos.Y, 0);
            uvs[i] = new Il2CppUnityEngine.Vector2(vptr[i].uv.X, vptr[i].uv.Y);
            uint c = vptr[i].col;
            colors[i] = new Il2CppUnityEngine.Color32(
                (byte)(c & 0xff),
                (byte)((c >> 8) & 0xff),
                (byte)((c >> 16) & 0xff),
                (byte)((c >> 24) & 0xff));
        }

        mesh.Clear(true);
        mesh.SetVertices(new Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppStructArray<Il2CppUnityEngine.Vector3>(verts));
        mesh.SetUVs(0, new Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppStructArray<Il2CppUnityEngine.Vector2>(uvs));
        mesh.SetColors(new Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppStructArray<Il2CppUnityEngine.Color32>(colors));

        // One subMesh per ImDrawCmd, indices laid out contiguously
        mesh.subMeshCount = cmdList.CmdBuffer.Size;
        var idxPtr = (ushort*)cmdList.IdxBuffer.Data;
        var allIndices = new int[idxCount];
        for (int i = 0; i < idxCount; i++) allIndices[i] = idxPtr[i];

        int idxOffset = 0;
        for (int c = 0; c < cmdList.CmdBuffer.Size; c++)
        {
            var cmd = cmdList.CmdBuffer[c];
            int eltCount = (int)cmd.ElemCount;
            var subIndices = new int[eltCount];
            Array.Copy(allIndices, idxOffset, subIndices, 0, eltCount);
            mesh.SetTriangles(
                new Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppStructArray<int>(subIndices),
                c, calculateBounds: false);
            idxOffset += eltCount;
        }

        mesh.RecalculateBounds();
    }
}
```

> Implementation note: index format is `UInt32` to handle large UI updates safely; ImGui itself emits 16-bit indices but we cast/expand on the way in. The IL2CPP-managed array constructions through `Il2CppStructArray` are how MelonLoader bridges managed arrays to Unity's Il2Cpp expectations.

- [ ] **Step 3: Build**

```bash
dotnet run --project build-tool build
```

Expected: builds clean, no warnings about Il2Cpp casting.

- [ ] **Step 4: Commit**

```bash
git add mods/BossMod/Imgui/ImGuiRenderer.cs
git commit -m "feat(bossmod): render ImGui draw data via CommandBuffer + DrawMesh"
```

---

## Task 6: Input bridge against the new InputSystem

**Files:**
- Modify: `mods/BossMod/Imgui/ImGuiRenderer.cs` (replace `UpdateInput` stub)

Per `mods/CLAUDE.md`, this codebase uses the new InputSystem. We bridge `Mouse.current` and `Keyboard.current` into ImGui's IO.

- [ ] **Step 1: Implement `UpdateInput`**

Append to `ImGuiRenderer.cs`:

```csharp
public sealed partial class ImGuiRenderer
{
    private void UpdateInput(ImGuiIOPtr io)
    {
        var mouse = Il2Cpp.UnityEngine.InputSystem.Mouse.current;
        var keyboard = Il2Cpp.UnityEngine.InputSystem.Keyboard.current;
        if (mouse == null || keyboard == null) return;

        // Mouse position — Unity Y is bottom-up, ImGui is top-down
        var mpos = mouse.position.ReadValue();
        io.AddMousePosEvent(mpos.x, Il2CppUnityEngine.Screen.height - mpos.y);

        // Buttons
        io.AddMouseButtonEvent(0, mouse.leftButton.isPressed);
        io.AddMouseButtonEvent(1, mouse.rightButton.isPressed);
        io.AddMouseButtonEvent(2, mouse.middleButton.isPressed);

        // Scroll
        var scroll = mouse.scroll.ReadValue();
        if (scroll.x != 0f || scroll.y != 0f)
            io.AddMouseWheelEvent(scroll.x / 120f, scroll.y / 120f);

        // Modifier keys
        io.AddKeyEvent(ImGuiKey.ModCtrl,  keyboard.leftCtrlKey.isPressed  || keyboard.rightCtrlKey.isPressed);
        io.AddKeyEvent(ImGuiKey.ModShift, keyboard.leftShiftKey.isPressed || keyboard.rightShiftKey.isPressed);
        io.AddKeyEvent(ImGuiKey.ModAlt,   keyboard.leftAltKey.isPressed   || keyboard.rightAltKey.isPressed);

        // Common keys (extend as needed by Settings widgets)
        Map(io, ImGuiKey.Tab, keyboard.tabKey);
        Map(io, ImGuiKey.LeftArrow, keyboard.leftArrowKey);
        Map(io, ImGuiKey.RightArrow, keyboard.rightArrowKey);
        Map(io, ImGuiKey.UpArrow, keyboard.upArrowKey);
        Map(io, ImGuiKey.DownArrow, keyboard.downArrowKey);
        Map(io, ImGuiKey.PageUp, keyboard.pageUpKey);
        Map(io, ImGuiKey.PageDown, keyboard.pageDownKey);
        Map(io, ImGuiKey.Home, keyboard.homeKey);
        Map(io, ImGuiKey.End, keyboard.endKey);
        Map(io, ImGuiKey.Insert, keyboard.insertKey);
        Map(io, ImGuiKey.Delete, keyboard.deleteKey);
        Map(io, ImGuiKey.Backspace, keyboard.backspaceKey);
        Map(io, ImGuiKey.Space, keyboard.spaceKey);
        Map(io, ImGuiKey.Enter, keyboard.enterKey);
        Map(io, ImGuiKey.Escape, keyboard.escapeKey);
        Map(io, ImGuiKey.A, keyboard.aKey);
        Map(io, ImGuiKey.C, keyboard.cKey);
        Map(io, ImGuiKey.V, keyboard.vKey);
        Map(io, ImGuiKey.X, keyboard.xKey);

        // Text input via onTextInput → buffered into io.AddInputCharacter.
        // Simplest path: poll keyboard.onTextInput is event-driven; for the
        // bridge we hook it once and queue characters in a ConcurrentQueue.
        // Implemented in Task 7.
    }

    private static void Map(ImGuiIOPtr io, ImGuiKey key, Il2Cpp.UnityEngine.InputSystem.Controls.KeyControl ctrl)
        => io.AddKeyEvent(key, ctrl.isPressed);
}
```

- [ ] **Step 2: Build, verify InputSystem types resolve**

```bash
dotnet run --project build-tool build
```

If `Il2Cpp.UnityEngine.InputSystem` types don't resolve, the assembly path is wrong; verify `$(Il2CppAssembliesPath)\Unity.InputSystem.dll` is referenced (it is, in csproj from Task 1).

- [ ] **Step 3: Commit**

```bash
git add mods/BossMod/Imgui/ImGuiRenderer.cs
git commit -m "feat(bossmod): bridge new InputSystem into ImGui IO"
```

---

## Task 7: Text input

**Files:**
- Modify: `mods/BossMod/Imgui/ImGuiRenderer.cs`

InputSystem text input is event-driven via `keyboard.onTextInput += handler`. We subscribe in `Init` (after `_context` exists), buffer characters into a `ConcurrentQueue<char>`, and drain into `io.AddInputCharacter` each `UpdateInput` call.

- [ ] **Step 1: Add the text-input subscription + queue**

Append to `ImGuiRenderer.cs`:

```csharp
public sealed partial class ImGuiRenderer
{
    private readonly System.Collections.Concurrent.ConcurrentQueue<char> _charQueue = new();
    private Il2Cpp.UnityEngine.InputSystem.Keyboard? _hookedKeyboard;
    private Action<char>? _textHandler;

    private void HookTextInput()
    {
        var keyboard = Il2Cpp.UnityEngine.InputSystem.Keyboard.current;
        if (keyboard == null || keyboard == _hookedKeyboard) return;

        _textHandler = ch =>
        {
            // Filter: printable ASCII + extended; strip control codes except tab.
            if (ch >= ' ' && ch != '\u007f') _charQueue.Enqueue(ch);
        };
        keyboard.onTextInput += _textHandler;
        _hookedKeyboard = keyboard;
    }

    private void UnhookTextInput()
    {
        if (_hookedKeyboard != null && _textHandler != null)
            _hookedKeyboard.onTextInput -= _textHandler;
        _hookedKeyboard = null;
        _textHandler = null;
    }

    private void DrainCharsInto(ImGuiIOPtr io)
    {
        while (_charQueue.TryDequeue(out var c))
            io.AddInputCharacter(c);
    }
}
```

- [ ] **Step 2: Wire `HookTextInput` into `Init` and `DrainCharsInto` into `UpdateInput`**

In `Init`, after `_context` is set and material/font are built, add:

```csharp
HookTextInput();
```

In `UpdateInput`, near the end (after `Map(io, ImGuiKey.X, ...)`), add:

```csharp
DrainCharsInto(io);
```

In `Dispose`, before context destruction:

```csharp
UnhookTextInput();
```

- [ ] **Step 3: Build**

```bash
dotnet run --project build-tool build
```

Expected: builds.

- [ ] **Step 4: Commit**

```bash
git add mods/BossMod/Imgui/ImGuiRenderer.cs
git commit -m "feat(bossmod): forward keyboard text input into ImGui IO"
```

---

## Task 8: Smoke-test demo window from BossMod entry

**Files:**
- Modify: `mods/BossMod/BossMod.cs`

Wire `ImGuiRenderer` into `MelonMod.OnGUI` and render `ImGui.ShowDemoWindow` to validate end-to-end. This is the moment where success means "demo window appears in-game".

- [ ] **Step 1: Replace `mods/BossMod/BossMod.cs`**

```csharp
using System.IO;
using BossMod.Imgui;
using ImGuiNET;
using MelonLoader;

[assembly: MelonInfo(typeof(BossMod.BossMod), "BossMod", "0.1.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossMod;

public class BossMod : MelonMod
{
    private ImGuiRenderer? _renderer;
    private bool _showDemo = true;

    public override void OnInitializeMelon()
    {
        var userData = Path.Combine(MelonUtils.UserDataDirectory, "BossMod");
        Directory.CreateDirectory(userData);
        var iniPath = Path.Combine(userData, "imgui.ini");
        var cacheDir = Path.Combine(userData, "cache");

        _renderer = new ImGuiRenderer(LoggerInstance);
        if (!_renderer.Init(iniPath, cacheDir))
        {
            LoggerInstance.Error("Renderer init failed; mod disabled");
            _renderer = null;
            return;
        }

        _renderer.OnLayout = () =>
        {
            if (_showDemo) ImGui.ShowDemoWindow(ref _showDemo);
        };

        LoggerInstance.Msg("BossMod initialized");
    }

    public override void OnGUI() => _renderer?.OnGUI();

    public override void OnDeinitializeMelon() => _renderer?.Dispose();
}
```

- [ ] **Step 2: Build**

```bash
dotnet run --project build-tool build
```

Expected: builds clean.

- [ ] **Step 3: Deploy and run**

Close the game. Then:

```bash
dotnet run --project build-tool all
```

Launch game manually. Once at the main menu, observe whether the ImGui demo window appears. (It should — we render in OnGUI which fires regardless of scene.)

- [ ] **Step 4: Verification**

| Check | How |
|---|---|
| Init succeeded | `grep "BossMod" "$ANCIENT_KINGDOMS_PATH/MelonLoader/Latest.log"` shows `ImGui.NET initialized` and `BossMod initialized` |
| Demo window renders | Visible on main menu and in-world; can drag, resize, type into text fields |
| Mouse capture works | Hovering demo window sets `WantCaptureMouse` (visible in demo's Tools tab) |
| No render errors | No `[BossMod] ImGui render error:` lines in the log over 60 s |
| ini persists | `cat "$ANCIENT_KINGDOMS_PATH/UserData/BossMod/imgui.ini"` shows window state after move/resize |

If any check fails, debug **before** committing.

- [ ] **Step 5: Commit**

```bash
git add mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): render ImGui demo window end-to-end as smoke test"
```

---

## Definition of done

- `mods/BossMod/BossMod.dll` builds via `dotnet run --project build-tool build` with ImGui.NET / System.* merged in via ILRepack.
- Game launches with mod loaded; `Latest.log` shows `BossMod initialized` and `ImGui.NET initialized`.
- ImGui demo window is visible, draggable, accepts mouse + keyboard input.
- `UserData/BossMod/imgui.ini` persists window state across launches.
- `UserData/BossMod/cache/cimgui.dll` exists after first run; second run does not rewrite it.

## Open items (deferred to plan 4 — not gating this plan)

- Click-through / `NoInputs` flag handling for HUD windows (decided when individual windows are wired in plans 2–3).
- Config Mode toggle (plan 4).
- Custom font (Roboto) — default font is sufficient for plans 1–3.
