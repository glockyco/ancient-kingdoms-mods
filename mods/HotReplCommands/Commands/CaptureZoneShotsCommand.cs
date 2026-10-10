#nullable disable
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DataExporter;
using HotRepl.Control;
using HotReplCommands.Dtos;
using HotReplCommands.Isolation;
using Il2CppInterop.Runtime;
using MelonLoader;
using Newtonsoft.Json;
using UnityEngine;

namespace HotReplCommands.Commands
{
    /// <summary>Capture the gameplay camera at native 48 pixels per world unit, without interface overlays.</summary>
    public sealed class CaptureZoneShotsCommand : IControlCommandHandler<ZoneShotsArgs, ZoneShotsResult>
    {
        private readonly string _exportDir;
        public CaptureZoneShotsCommand(string exportDir) => _exportDir = WritablePath(exportDir);
        public string Name => "capture.zoneShots";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        private static string WritablePath(string path)
        {
            var portable = path.Replace("\\", "/");
            return portable.StartsWith("/") ? "Z:" + portable : portable;
        }

        public ValueTask<ControlCommandResult<ZoneShotsResult>> ExecuteAsync(
            ControlCommandContext<ZoneShotsResult> context, ZoneShotsArgs args, CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<ZoneShotsResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(Guarded(context, args, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<ZoneShotsResult>>(completion.Task);
        }

        private IEnumerator Guarded(ControlCommandContext<ZoneShotsResult> context, ZoneShotsArgs args,
            CancellationToken token, TaskCompletionSource<ControlCommandResult<ZoneShotsResult>> completion)
        {
            var core = Capture(context, args, token, completion);
            while (true)
            {
                object current;
                try
                {
                    if (!core.MoveNext()) yield break;
                    current = core.Current;
                }
                catch (OperationCanceledException) { completion.TrySetCanceled(token); yield break; }
                catch (Exception ex) { completion.TrySetException(ex); yield break; }
                yield return current;
            }
        }

        private IEnumerator Capture(ControlCommandContext<ZoneShotsResult> context, ZoneShotsArgs args,
            CancellationToken token, TaskCompletionSource<ControlCommandResult<ZoneShotsResult>> completion)
        {
            if (!ScratchDatabase.IsScratch(Il2Cpp.GameManager.pathFileDB))
                throw new InvalidOperationException("Zone capture requires game.useScratchDatabase before database access.");
            ScratchDatabase.ValidateOwnedPath(Application.dataPath, Il2Cpp.GameManager.pathFileDB);
            var player = Il2Cpp.Player.localPlayer;
            var camera = Camera.main;
            var zones = Il2Cpp.ZoneInfo.singleton;
            if (player == null || camera == null || zones == null || Il2Cpp.EnviromentSystem.singleton == null)
                throw new InvalidOperationException("Enter the world before capturing zone shots.");
            var focalPath = args.FocalPointsPath == null
                ? Path.Combine(Path.GetDirectoryName(_exportDir), "build-pipeline", "zone_shot_focal_points.json")
                : WritablePath(args.FocalPointsPath);
            var focal = JsonConvert.DeserializeObject<ZoneShotFocalFile>(File.ReadAllText(focalPath))
                ?? throw new InvalidDataException("Focal-point file is null.");
            if (!double.IsFinite(focal.FrameScale) || focal.FrameScale <= 0)
                throw new InvalidDataException("Focal-point frame_scale must be positive and finite.");
            if (args.FrameScale.HasValue && (!double.IsFinite(args.FrameScale.Value) || args.FrameScale.Value <= 0))
                throw new ArgumentOutOfRangeException(nameof(args.FrameScale), "frameScale must be positive and finite.");
            var points = focal.Zones ?? throw new InvalidDataException("Focal-point zones are null.");
            if (points.Count == 0 || points.Select(p => p.zone_id).Distinct().Count() != points.Count)
                throw new InvalidDataException("Focal-point file is empty or contains duplicate zones.");
            var runtimeZones = new Dictionary<string, int>();
            foreach (var pair in Il2Cpp.ZoneInfo.zones)
                runtimeZones.Add(GameIds.Sanitize(pair.Value.name), pair.Key);
            if (args.ZoneIds != null)
                foreach (var id in args.ZoneIds)
                    if (!points.Any(p => p.zone_id == id)) throw new InvalidDataException($"Unknown shot zone: {id}");
            var shots = new List<(ZoneShotFocalPoint Point, int Width, int Height, float CameraSize)>(points.Count);
            var maxTextureSize = SystemInfo.maxTextureSize;
            foreach (var point in points)
            {
                point.ValidatePosition();
                if (!runtimeZones.ContainsKey(point.zone_id) ||
                    string.IsNullOrWhiteSpace(point.comment))
                    throw new InvalidDataException($"Invalid or excluded focal point: {point.zone_id}");
                if (point.FrameScale.HasValue && (!double.IsFinite(point.FrameScale.Value) || point.FrameScale.Value <= 0))
                    throw new InvalidDataException($"Focal-point frame_scale must be positive and finite: {point.zone_id}");
                var scale = args.FrameScale ?? point.FrameScale ?? focal.FrameScale;
                var width = Math.Round(1920d * scale, MidpointRounding.AwayFromZero);
                var height = Math.Round(1080d * scale, MidpointRounding.AwayFromZero);
                if (width < 1 || height < 1 || width > maxTextureSize || height > maxTextureSize)
                    throw new InvalidDataException($"Scaled capture exceeds supported texture dimensions: {point.zone_id}");
                if (args.ZoneIds == null || args.ZoneIds.Contains(point.zone_id))
                    shots.Add((point, (int)width, (int)height, (float)(11.25d * scale)));
            }
            var triggers = Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.ZoneTrigger>())
                .Select(o => o.TryCast<Il2Cpp.ZoneTrigger>())
                .Where(t => t?.gameObject != null && t.gameObject.scene.IsValid()).ToArray();
            var output = Path.Combine(_exportDir, "screenshots", "zones");
            Directory.CreateDirectory(output);
            var records = new List<ZoneShotRecord>();
            using var state = new CaptureState(player, camera, zones, args.IncludeCreatures);
            foreach (var shot in shots)
            {
                token.ThrowIfCancellationRequested();
                var point = shot.Point;
                state.Configure(shot.Width, shot.Height, shot.CameraSize);
                var zone = runtimeZones[point.zone_id];
                var position = ResolvePosition(point, zone);
                Il2Cpp.ZoneTrigger trigger = null;
                var smallest = float.PositiveInfinity;
                foreach (var candidate in triggers)
                {
                    if (candidate.idZone != zone) continue;
                    var collider = candidate.GetComponent<Collider2D>();
                    if (collider == null) continue;
                    var bounds = collider.bounds;
                    // Bounds.Contains' generated IL2CPP internal-call wrapper is invalid in this host.
                    if (position.x < bounds.min.x || position.x > bounds.max.x ||
                        position.y < bounds.min.y || position.y > bounds.max.y) continue;
                    var area = bounds.size.x * bounds.size.y;
                    if (area >= smallest) continue;
                    smallest = area;
                    trigger = candidate;
                }
                if (trigger == null) throw new InvalidDataException($"Focal point has no zone trigger: {point.zone_id}");
                state.ActivateZones(zone);
                player.combat.Networkinvincible = true;
                player.movement.Reset();
                player.movement.Warp(position);
                player.NetworkidZone = zone;
                player.outdoorZone = trigger.outdoorZone;
                player.globalLightIntensityZone = trigger.globalLightIntensity;
                Il2Cpp.EnviromentSystem.singleton.StartChangingBloomColor(trigger.bloomColor);
                // Let the game's actual daylight/weather and area-light interpolation settle.
                var until = Time.realtimeSinceStartup + 2.5f;
                while (Time.realtimeSinceStartup < until)
                {
                    token.ThrowIfCancellationRequested();
                    player.combat.Networkinvincible = true;
                    state.Frame(position);
                    yield return null;
                }
                state.Frame(position);
                yield return new WaitForEndOfFrame();
                state.Readback(Path.Combine(output, point.zone_id + ".png"));
                records.Add(new ZoneShotRecord { zone_id = point.zone_id, x = point.x, y = point.y,
                    anchor = point.anchor, offset = point.anchor == null ? null : point.offset ?? new float[] { 0, 0 },
                    camera_size = shot.CameraSize, width = shot.Width, height = shot.Height, captured_at = DateTime.UtcNow.ToString("o") });
            }
            var manifest = Path.Combine(output, "manifest.json");
            File.WriteAllText(manifest, JsonConvert.SerializeObject(records, Formatting.Indented));
            completion.TrySetResult(ControlCommandResult.Ok(new ZoneShotsResult { Count = records.Count, ManifestPath = manifest }));
        }

        private static Vector2 ResolvePosition(ZoneShotFocalPoint point, int zone)
        {
            if (point.anchor == null) return new Vector2(point.x.Value, point.y.Value);
            Il2Cpp.Monster match = null;
            foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.Monster>()))
            {
                var monster = obj.TryCast<Il2Cpp.Monster>();
                if (monster?.gameObject == null || !monster.gameObject.scene.IsValid() ||
                    monster.idZone != zone || GameIds.Sanitize(monster.name) != point.anchor["monster"]) continue;
                if (match != null)
                    throw new InvalidDataException($"Monster anchor is ambiguous in zone: {point.zone_id}");
                match = monster;
            }
            if (match == null) throw new InvalidDataException($"Monster anchor is absent from zone: {point.zone_id}");
            // Use the authored spawn, not a moving creature's current position.
            return match.startPosition + new Vector2(point.offset?[0] ?? 0, point.offset?[1] ?? 0);
        }

        private sealed class CaptureState : IDisposable
        {
            private readonly Il2Cpp.Player _player;
            private readonly Camera _camera;
            private readonly Il2Cpp.ZoneInfo _zones;
            private readonly bool _includeCreatures;
            private readonly Vector3 _position, _cameraPosition;
            private readonly Quaternion _rotation;
            private readonly float _size, _aspect;
            private readonly int _mask;
            private readonly RenderTexture _target, _active;
            private readonly bool _invincible, _outdoor;
            private readonly int _zone;
            private readonly float _intensity;
            private readonly Color _lightColor, _bloomColor;
            private readonly float _lightIntensity;
            private readonly bool _orthographic;
            private readonly List<(GameObject Object, bool Active)> _objects = new();
            private readonly List<(Behaviour Component, bool Enabled)> _behaviours = new();
            private readonly Dictionary<int, (Renderer Renderer, bool ForceOff)> _renderers = new();
            private RenderTexture _render;
            private Texture2D _pixels;
            private int _width, _height;
            private float _captureSize;

            public CaptureState(Il2Cpp.Player player, Camera camera, Il2Cpp.ZoneInfo zones, bool includeCreatures)
            {
                _player = player; _camera = camera; _zones = zones; _includeCreatures = includeCreatures;
                _position = player.transform.position; _cameraPosition = camera.transform.position;
                _rotation = camera.transform.rotation; _size = camera.orthographicSize; _aspect = camera.aspect;
                _mask = camera.cullingMask; _target = camera.targetTexture; _active = RenderTexture.active;
                _invincible = player.combat.invincible; _zone = player.idZone; _outdoor = player.outdoorZone;
                _intensity = player.globalLightIntensityZone;
                var environment = Il2Cpp.EnviromentSystem.singleton;
                _lightColor = environment.globalLight.color; _lightIntensity = environment.globalLight.intensity;
                _bloomColor = environment.bloom.tint.value; _orthographic = camera.orthographic;
                try
                {
                    foreach (var obj in zones.fullZones) Remember(obj);
                    foreach (var obj in zones.staticEnviroment) Remember(obj);
                    foreach (var b in camera.GetComponentsInChildren<Behaviour>(true))
                    {
                        var name = b.GetIl2CppType().Name;
                        if (name == "CinemachineBrain" || name == "PixelPerfectCamera") Disable(b);
                    }
                    foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Canvas>()))
                    {
                        var canvas = obj.TryCast<Canvas>();
                        if (canvas?.gameObject != null && canvas.gameObject.scene.IsValid()) Disable(canvas);
                    }
                    camera.cullingMask &= ~(1 << 5);
                }
                catch
                {
                    Dispose();
                    throw;
                }
            }

            public void Configure(int width, int height, float cameraSize)
            {
                if (_width != width || _height != height)
                {
                    RenderTexture render = null;
                    Texture2D pixels = null;
                    try
                    {
                        render = new RenderTexture(width, height, 24);
                        if (!render.Create())
                            throw new InvalidOperationException($"Unity could not create a {width}×{height} capture texture.");
                        pixels = new Texture2D(width, height, TextureFormat.RGB24, false);
                        if (pixels.width != width || pixels.height != height || !pixels.isReadable)
                            throw new InvalidOperationException($"Unity could not create a {width}×{height} readback texture.");
                        // Detach both Unity targets before releasing the previous buffers.
                        ReleaseBuffers();
                        _render = render; _pixels = pixels;
                        render = null; pixels = null;
                        _width = width; _height = height;
                    }
                    finally
                    {
                        if (render != null) { render.Release(); UnityEngine.Object.Destroy(render); }
                        if (pixels != null) UnityEngine.Object.Destroy(pixels);
                    }
                }
                _captureSize = cameraSize;
                _camera.targetTexture = _render;
            }

            private void ReleaseBuffers()
            {
                if (_render != null)
                {
                    if (_camera.targetTexture == _render) _camera.targetTexture = _target;
                    if (RenderTexture.active == _render) RenderTexture.active = _active;
                    _render.Release(); UnityEngine.Object.Destroy(_render);
                    _render = null;
                }
                if (_pixels != null) { UnityEngine.Object.Destroy(_pixels); _pixels = null; }
            }

            private void Remember(GameObject obj)
            {
                if (obj != null) _objects.Add((obj, obj.activeSelf));
            }
            private void Disable(Behaviour b) { _behaviours.Add((b, b.enabled)); b.enabled = false; }
            public void ActivateZones(int zone)
            {
                for (var i = 0; i < _zones.fullZones.Count; i++)
                {
                    if (_zones.fullZones[i] != null) _zones.fullZones[i].SetActive(i == zone);
                    if (_zones.staticEnviroment[i] != null) _zones.staticEnviroment[i].SetActive(i == zone);
                }
            }
            public void Frame(Vector2 position)
            {
                _camera.transform.position = new Vector3(position.x, position.y, _cameraPosition.z);
                _camera.transform.rotation = Quaternion.identity;
                _camera.orthographic = true; _camera.orthographicSize = _captureSize; _camera.aspect = (float)_width / _height;
                foreach (var pair in _behaviours) if (pair.Component != null) pair.Component.enabled = false;
            }
            public void HideOverlays()
            {
                foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.Entity>()))
                {
                    var entity = obj.TryCast<Il2Cpp.Entity>();
                    if (entity?.gameObject == null || !entity.gameObject.scene.IsValid()) continue;
                    var hide = entity.TryCast<Il2Cpp.Player>() != null ||
                        (!_includeCreatures && (entity.TryCast<Il2Cpp.Monster>() != null ||
                            entity.TryCast<Il2Cpp.Npc>() != null || entity.TryCast<Il2Cpp.Pet>() != null));
                    foreach (var renderer in entity.GetComponentsInChildren<Renderer>(true))
                    {
                        var overlay = false;
                        for (var t = renderer.transform; t != null && t != entity.transform; t = t.parent)
                        {
                            var name = t.name.ToLowerInvariant();
                            if (name.Contains("overlay") || name.Contains("health") || name.Contains("bar") ||
                                name.Contains("label") || name.Contains("speech")) overlay = true;
                        }
                        if (!hide && !overlay) continue;
                        HideRenderer(renderer);
                    }
                }
                // Floating combat messages are world-space TMP meshes outside entity hierarchies.
                foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2CppTMPro.TextMeshPro>()))
                {
                    var text = obj.TryCast<Il2CppTMPro.TextMeshPro>();
                    if (text?.gameObject != null && text.gameObject.scene.IsValid())
                    {
                        var renderer = text.GetComponent<Renderer>();
                        if (renderer != null) HideRenderer(renderer);
                    }
                }
            }
            private void HideRenderer(Renderer renderer)
            {
                var id = renderer.GetInstanceID();
                if (!_renderers.ContainsKey(id)) _renderers.Add(id, (renderer, renderer.forceRenderingOff));
                // Entity Update can re-enable Renderer.enabled; this independent gate survives it.
                renderer.forceRenderingOff = true;
            }
            public void Readback(string path)
            {
                // Suppress messages created by the last game Update before rendering synchronously.
                HideOverlays();
                _camera.Render();
                var active = RenderTexture.active;
                try
                {
                    RenderTexture.active = _render;
                    // PNG encoding reads the CPU copy; no Texture2D.Apply GPU upload is needed.
                    _pixels.ReadPixels(new Rect(0, 0, _width, _height), 0, 0, false);
                    File.WriteAllBytes(path, ImageConversion.EncodeToPNG(_pixels));
                }
                finally { RenderTexture.active = active; }
            }
            public void Dispose()
            {
                try
                {
                    _camera.targetTexture = _target; RenderTexture.active = _active;
                    _camera.transform.position = _cameraPosition; _camera.transform.rotation = _rotation;
                    _camera.orthographicSize = _size; _camera.aspect = _aspect; _camera.cullingMask = _mask;
                    _player.movement.Reset(); _player.movement.Warp(_position);
                    _player.NetworkidZone = _zone; _player.outdoorZone = _outdoor;
                    _player.globalLightIntensityZone = _intensity; _player.combat.Networkinvincible = _invincible;
                    _camera.orthographic = _orthographic;
                    var environment = Il2Cpp.EnviromentSystem.singleton;
                    environment.StartChangingBloomColor(_bloomColor);
                    environment.bloom.tint.value = _bloomColor;
                    environment.globalLight.color = _lightColor; environment.globalLight.intensity = _lightIntensity;
                    foreach (var pair in _objects) if (pair.Object != null) pair.Object.SetActive(pair.Active);
                    foreach (var pair in _renderers.Values) if (pair.Renderer != null) pair.Renderer.forceRenderingOff = pair.ForceOff;
                    foreach (var pair in _behaviours) if (pair.Component != null) pair.Component.enabled = pair.Enabled;
                }
                finally { ReleaseBuffers(); }
            }
        }
    }
}
