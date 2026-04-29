using System;
using System.Runtime.InteropServices;
using ImGuiNET;
using UnityEngine;

namespace BossMod.Imgui;

/// <summary>
/// Builds the ImGui font atlas into a Unity Texture2D and hands the texture's
/// native pointer back to ImGui via <c>io.Fonts.SetTexID</c>. Default ProggyClean
/// is good enough for v1; a TTF can be loaded via <c>io.Fonts.AddFontFromFileTTF</c>
/// in plan 4 if Roboto is desired.
/// </summary>
public sealed partial class ImGuiRenderer
{
    private Texture2D _fontTexture;

    private unsafe void BuildFontAtlas(ImGuiIOPtr io)
    {
        // Default font: lightweight, no allocation.
        io.Fonts.AddFontDefault();
        io.Fonts.Build();

        io.Fonts.GetTexDataAsRGBA32(out byte* pixels, out int width, out int height, out int _);

        _fontTexture = new Texture2D(width, height, TextureFormat.RGBA32, false);

        // Copy the native ImGui pixel buffer into a managed array, then hand it
        // to LoadRawTextureData. Il2CppArrayBase<byte> has an implicit conversion
        // from byte[], so the IL2CPP bridge accepts our managed array.
        var data = new byte[width * height * 4];
        Marshal.Copy((IntPtr)pixels, data, 0, data.Length);
        _fontTexture.LoadRawTextureData(data);
        _fontTexture.Apply();

        io.Fonts.SetTexID(_fontTexture.GetNativeTexturePtr());
    }

    private void DisposeFontAtlas()
    {
        if (_fontTexture != null)
        {
            UnityEngine.Object.Destroy(_fontTexture);
            _fontTexture = null;
        }
    }
}
