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
///
/// IL2CPP namespace note: Il2CppInterop generates UnityEngine types under the
/// bare <c>UnityEngine</c> namespace (not <c>Il2Cpp.UnityEngine</c>). The
/// <c>Il2Cpp.*</c> prefix is used only for types from <c>Assembly-CSharp.dll</c>.
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
    public Action OnLayout { get; set; }

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
            HookTextInput();      // Task 7

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

        // LoadLibrary on an already-loaded DLL increments refcount cleanly, so
        // we skip the rewrite if it exists (avoids file-locked errors on hot
        // reload or restart after a previous crash).
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
        UnhookTextInput();       // Task 7
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

/// <summary>Stubs filled in by Tasks 4/5/7. Kept here so the project compiles incrementally.</summary>
public sealed partial class ImGuiRenderer
{
    private void BuildFontAtlas(ImGuiIOPtr io) { /* Task 4 */ }
    private void DisposeFontAtlas() { /* Task 4 */ }
    private void CreateMaterial() { /* Task 5 */ }
    private void DisposeMaterial() { /* Task 5 */ }
    private void CreateCommandBuffer() { /* Task 5 */ }
    private void DisposeCommandBuffer() { /* Task 5 */ }
    private void HookTextInput() { /* Task 7 */ }
    private void UnhookTextInput() { /* Task 7 */ }
}
