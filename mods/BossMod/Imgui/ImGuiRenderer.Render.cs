using System;
using System.Collections.Generic;
using ImGuiNET;
using UnityEngine;
using UnityEngine.Rendering;

namespace BossMod.Imgui;

/// <summary>
/// Render path: a Material (UI/Default with alpha-blended overrides),
/// a CommandBuffer, and a per-frame mesh-per-ImDrawList batch. Each ImDrawCmd
/// becomes a single sub-mesh; texture switching uses MaterialPropertyBlock.
/// </summary>
public sealed partial class ImGuiRenderer
{
    private Material _material;
    private CommandBuffer _commandBuffer;
    private readonly List<Mesh> _meshPool = new();
    private readonly Dictionary<IntPtr, Texture> _userTextures = new();

    private void CreateMaterial()
    {
        var shader = Shader.Find("UI/Default");
        _material = new Material(shader)
        {
            hideFlags = HideFlags.HideAndDontSave,
        };
        _material.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
        _material.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
        _material.SetInt("_ZWrite", 0);
        _material.SetInt("_Cull", (int)CullMode.Off);
        _material.mainTexture = _fontTexture;
    }

    private void DisposeMaterial()
    {
        foreach (var m in _meshPool) UnityEngine.Object.Destroy(m);
        _meshPool.Clear();

        if (_material != null) { UnityEngine.Object.Destroy(_material); _material = null; }
    }

    private void CreateCommandBuffer()
    {
        _commandBuffer = new CommandBuffer { name = "BossMod_ImGui" };
    }

    private void DisposeCommandBuffer()
    {
        _commandBuffer?.Dispose();
        _commandBuffer = null;
    }

    /// <summary>Register a Unity texture so it can be used as ImGui.Image's TextureId.</summary>
    public IntPtr RegisterTexture(Texture tex)
    {
        var id = tex.GetNativeTexturePtr();
        _userTextures[id] = tex;
        return id;
    }

    public void UnregisterTexture(IntPtr id) => _userTextures.Remove(id);

    /// <summary>
    /// Driven from <c>MelonMod.OnGUI</c>. Repaint events only — discard layout/event-routing.
    /// </summary>
    public void OnGUI()
    {
        var current = Event.current;
        if (current == null || current.type != EventType.Repaint) return;

        try
        {
            var io = ImGui.GetIO();
            io.DisplaySize = new System.Numerics.Vector2(Screen.width, Screen.height);
            io.DeltaTime = Time.deltaTime > 0 ? Time.deltaTime : 1f / 60f;

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

        float screenW = Screen.width;
        float screenH = Screen.height;
        var projection = Matrix4x4.Ortho(0, screenW, screenH, 0, -1, 1);

        _commandBuffer.Clear();
        _commandBuffer.SetProjectionMatrix(projection);
        _commandBuffer.SetViewMatrix(Matrix4x4.identity);

        // Grow mesh pool to match ImDrawList count
        while (_meshPool.Count < draw.CmdListsCount)
        {
            _meshPool.Add(new Mesh
            {
                hideFlags = HideFlags.HideAndDontSave,
                indexFormat = IndexFormat.UInt32,
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
                _commandBuffer.EnableScissorRect(new Rect(
                    clip.X, screenH - clip.W,
                    clip.Z - clip.X, clip.W - clip.Y));

                var texId = cmd.TextureId;
                var tex = _userTextures.TryGetValue(texId, out var t) ? t : (Texture)_fontTexture;
                var mpb = new MaterialPropertyBlock();
                mpb.SetTexture("_MainTex", tex);

                _commandBuffer.DrawMesh(
                    _meshPool[i],
                    Matrix4x4.identity,
                    _material,
                    submeshIndex: c,
                    shaderPass: 0,
                    properties: mpb);
            }
        }
        _commandBuffer.DisableScissorRect();

        Graphics.ExecuteCommandBuffer(_commandBuffer);
    }

    private unsafe void BuildMesh(ImDrawListPtr cmdList, Mesh mesh)
    {
        int vtxCount = cmdList.VtxBuffer.Size;
        int idxCount = cmdList.IdxBuffer.Size;

        var verts  = new Vector3[vtxCount];
        var uvs    = new Vector2[vtxCount];
        var colors = new Color32[vtxCount];

        var vptr = (ImDrawVert*)cmdList.VtxBuffer.Data;
        for (int i = 0; i < vtxCount; i++)
        {
            verts[i] = new Vector3(vptr[i].pos.X, vptr[i].pos.Y, 0);
            uvs[i] = new Vector2(vptr[i].uv.X, vptr[i].uv.Y);
            uint c = vptr[i].col;
            colors[i] = new Color32(
                (byte)(c & 0xff),
                (byte)((c >> 8) & 0xff),
                (byte)((c >> 16) & 0xff),
                (byte)((c >> 24) & 0xff));
        }

        // Mesh property setters (vertices/uv/colors32) accept Il2CppArrayBase<T>,
        // and managed T[] converts implicitly via op_Implicit. The List<T> /
        // NativeArray<T> SetVertices overloads do NOT bind managed arrays under
        // IL2CPP, so we must use the property setters explicitly.
        mesh.Clear(true);
        mesh.vertices = verts;
        mesh.uv = uvs;
        mesh.colors32 = colors;

        // One subMesh per ImDrawCmd, indices laid out contiguously into a single int[].
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
            // SetTriangles(int[], submesh, calculateBounds): managed int[] auto-bridges.
            mesh.SetTriangles(subIndices, c, calculateBounds: false);
            idxOffset += eltCount;
        }

        mesh.RecalculateBounds();
    }
}
