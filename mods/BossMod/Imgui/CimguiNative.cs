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
    [StructLayout(LayoutKind.Sequential)]
    internal struct Vec2
    {
        public float X, Y;
        public Vec2(float x, float y) { X = x; Y = y; }
        public Vec2(Vector2 v) { X = v.X; Y = v.Y; }
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct Vec4
    {
        public float X, Y, Z, W;
    }

    // Add native entry points here as needed during renderer implementation.
    // Empty for now; populated in Tasks 5/6 if ImGui.NET wrappers misbehave.
}
