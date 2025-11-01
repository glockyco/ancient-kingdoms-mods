using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using Il2CppInterop.Runtime.Injection;
using MelonLoader;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.InputSystem;

[assembly: MelonInfo(typeof(MapScreenshotter.MapScreenshotter), "MapScreenshotter", "0.1.0", "YourName")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace MapScreenshotter;

public class MapScreenshotter : MelonMod
{
    private bool _isCapturing;
    private ScreenshotCoroutineHelper _coroutineHelper;

    public override void OnInitializeMelon()
    {
        LoggerInstance.Msg("MapScreenshotter initialized");
        LoggerInstance.Msg($"Screenshot output path: {ScreenshotConfig.ScreenshotPath}");

        // Register coroutine helper for async screenshot capture
        ClassInjector.RegisterTypeInIl2Cpp<ScreenshotCoroutineHelper>();
    }

    public override void OnUpdate()
    {
        // Shift+F10 to start screenshot capture
        var keyboard = Keyboard.current;
        if (keyboard == null) return;

        if ((keyboard.leftShiftKey.isPressed || keyboard.rightShiftKey.isPressed) &&
            keyboard.f10Key.wasPressedThisFrame)
        {
            StartScreenshotCapture();
        }
    }

    private void StartScreenshotCapture()
    {
        if (_isCapturing)
        {
            LoggerInstance.Warning("Screenshot capture already in progress!");
            return;
        }

        var player = Il2Cpp.Player.localPlayer;
        if (player == null)
        {
            LoggerInstance.Error("No local player found - cannot capture screenshots");
            return;
        }

        LoggerInstance.Msg("Starting screenshot capture of entire world map...");
        _isCapturing = true;

        // Create coroutine helper if needed
        if (_coroutineHelper == null)
        {
            var helperObj = new GameObject("MapScreenshotter_CoroutineHelper");
            GameObject.DontDestroyOnLoad(helperObj);
            _coroutineHelper = helperObj.AddComponent<ScreenshotCoroutineHelper>();
        }

        // Start the capture coroutine (wrap in IL2CPP action)
        MelonCoroutines.Start(_coroutineHelper.CaptureScreenshotsCoroutine(this, player));
    }

    private void OnCaptureComplete()
    {
        _isCapturing = false;
        LoggerInstance.Msg("Screenshot capture complete!");
    }

    private void OnCaptureError(string error)
    {
        _isCapturing = false;
        LoggerInstance.Error($"Screenshot capture failed: {error}");
    }

    // Coroutine helper component
    public class ScreenshotCoroutineHelper : MonoBehaviour
    {
        public ScreenshotCoroutineHelper(IntPtr ptr) : base(ptr) { }

        public IEnumerator CaptureScreenshotsCoroutine(MapScreenshotter mod, Il2Cpp.Player player)
        {
            var metadata = new ScreenshotMetadata
            {
                timestamp = DateTime.UtcNow.ToString("o"),
                screenshots = new List<ScreenshotInfo>()
            };

            // Get all zones
            mod.LoggerInstance.Msg("Loading zone list...");
            var zones = Il2Cpp.ZoneInfo.zones;
            if (zones == null)
            {
                mod.OnCaptureError("Could not access ZoneInfo.zones");
                yield break;
            }

            // Create output directory
            var outputDir = ScreenshotConfig.ScreenshotPath;
            Directory.CreateDirectory(outputDir);

            // Count all zones (including dungeons)
            var totalZones = 0;
            foreach (var kvp in zones)
            {
                if (kvp.Value != null)
                    totalZones++;
            }

            mod.LoggerInstance.Msg($"Found {totalZones} zones");

            var totalScreenshots = 0;

            // Store original player position and time scale
            var originalPlayerPosition = player.transform.position;
            var originalTimeScale = Time.timeScale;

            mod.LoggerInstance.Msg($"Original player pos: {originalPlayerPosition}");

            // Setup for screenshot capture
            const int renderTextureSize = 1024;  // Reduced from 2048 to avoid rendering issues
            const float tileWorldSize = 200f;
            var cameraDepth = -50f; // Position camera 50 units behind the XY plane

            // Get main camera to copy its culling mask settings
            var mainCamera = Camera.main;

            // Create a dedicated screenshot camera instead of using main camera
            var cameraObj = new GameObject("ScreenshotCamera");
            var screenshotCamera = cameraObj.AddComponent<Camera>();
            screenshotCamera.orthographic = true;
            screenshotCamera.orthographicSize = tileWorldSize / 2f;
            screenshotCamera.aspect = 1.0f; // Square aspect ratio for square tiles
            screenshotCamera.nearClipPlane = 0.1f;
            screenshotCamera.farClipPlane = 1000f;
            screenshotCamera.clearFlags = CameraClearFlags.SolidColor;
            screenshotCamera.backgroundColor = Color.black;

            // Copy culling mask from main camera to render same layers
            if (mainCamera != null)
            {
                screenshotCamera.cullingMask = mainCamera.cullingMask;
                mod.LoggerInstance.Msg($"Copied culling mask from main camera: {screenshotCamera.cullingMask}");
            }
            else
            {
                // Render everything except UI layer (layer 5)
                screenshotCamera.cullingMask = ~(1 << 5);
                mod.LoggerInstance.Msg($"Main camera not found, using default culling mask: {screenshotCamera.cullingMask}");
            }

            var renderTexture = new RenderTexture(renderTextureSize, renderTextureSize, 24);
            var texture2D = new Texture2D(renderTextureSize, renderTextureSize, TextureFormat.RGB24, false);
            screenshotCamera.targetTexture = renderTexture;

            mod.LoggerInstance.Msg($"Created screenshot camera: depth={cameraDepth}, orthoSize={tileWorldSize / 2f}, near={screenshotCamera.nearClipPlane}, far={screenshotCamera.farClipPlane}");

            // Hide entities once at the start (they're all in the scene already)
            HideEntities(mod);

            // Get all zone GameObjects from ZoneInfo.singleton and activate them all
            var zoneInfo = Il2Cpp.ZoneInfo.singleton;
            if (zoneInfo == null)
            {
                mod.OnCaptureError("ZoneInfo.singleton is null");
                yield break;
            }

            var fullZones = zoneInfo.fullZones;
            if (fullZones == null || fullZones.Count == 0)
            {
                mod.OnCaptureError("ZoneInfo.singleton.fullZones is null or empty");
                yield break;
            }

            var staticEnvironment = zoneInfo.staticEnviroment;
            mod.LoggerInstance.Msg($"Found {fullZones.Count} zone GameObjects in ZoneInfo.fullZones");
            mod.LoggerInstance.Msg($"Found {staticEnvironment?.Count ?? 0} static environment GameObjects");

            // Track original active states for cleanup
            var originalZoneStates = new System.Collections.Generic.List<bool>();
            var originalEnvStates = new System.Collections.Generic.List<bool>();

            // Activate ALL zones and static environments
            mod.LoggerInstance.Msg("Activating all zones and environments...");
            for (int i = 0; i < fullZones.Count; i++)
            {
                var zoneRootObj = fullZones[i];
                if (zoneRootObj != null)
                {
                    bool wasActive = zoneRootObj.activeSelf;
                    originalZoneStates.Add(wasActive);
                    if (!wasActive)
                    {
                        zoneRootObj.SetActive(true);
                    }
                }
                else
                {
                    originalZoneStates.Add(false);
                }

                if (staticEnvironment != null && i < staticEnvironment.Count)
                {
                    var staticEnvObj = staticEnvironment[i];
                    if (staticEnvObj != null)
                    {
                        bool wasActive = staticEnvObj.activeSelf;
                        originalEnvStates.Add(wasActive);
                        if (!wasActive)
                        {
                            staticEnvObj.SetActive(true);
                        }
                    }
                    else
                    {
                        originalEnvStates.Add(false);
                    }
                }
                else
                {
                    originalEnvStates.Add(false);
                }
            }

            // Wait for everything to activate
            yield return new WaitForEndOfFrame();
            mod.LoggerInstance.Msg("All zones and environments activated");

            float boundsMinX = -880f;
            float boundsMaxX = 900f;
            float boundsMinY = -740f;
            float boundsMaxY = 1300f;

            mod.LoggerInstance.Msg($"Using world bounds:");
            mod.LoggerInstance.Msg($"  X[{boundsMinX:F1}, {boundsMaxX:F1}] Y[{boundsMinY:F1}, {boundsMaxY:F1}]");
            mod.LoggerInstance.Msg($"  World size: {boundsMaxX - boundsMinX:F1} x {boundsMaxY - boundsMinY:F1}");

            // Calculate screenshot grid for entire world
            var worldWidth = boundsMaxX - boundsMinX;
            var worldHeight = boundsMaxY - boundsMinY;
            var tilesX = Mathf.CeilToInt(worldWidth / tileWorldSize);
            var tilesZ = Mathf.CeilToInt(worldHeight / tileWorldSize);

            mod.LoggerInstance.Msg($"Screenshot grid: {tilesX}x{tilesZ} = {tilesX * tilesZ} tiles");

            // Capture screenshots for entire world
            for (int z = 0; z < tilesZ; z++)
            {
                for (int x = 0; x < tilesX; x++)
                {
                    var worldX = boundsMinX + (x * tileWorldSize) + (tileWorldSize / 2f);
                    var worldY = boundsMinY + (z * tileWorldSize) + (tileWorldSize / 2f);

                    // Position camera at screenshot location
                    screenshotCamera.transform.position = new Vector3(worldX, worldY, cameraDepth);
                    screenshotCamera.transform.rotation = Quaternion.Euler(0f, 0f, 0f);

                    // Log every 50th screenshot or first/last
                    bool shouldLog = (totalScreenshots % 50 == 0) || (x == 0 && z == 0) || (x == tilesX - 1 && z == tilesZ - 1);
                    if (shouldLog)
                    {
                        mod.LoggerInstance.Msg($"Screenshot [{totalScreenshots + 1}/{tilesX * tilesZ}] at world ({worldX:F1}, {worldY:F1})");
                    }

                    // Clear the render texture first
                    RenderTexture.active = renderTexture;
                    GL.Clear(true, true, Color.black);
                    RenderTexture.active = null;

                    // Wait one frame then render
                    yield return new WaitForEndOfFrame();

                    // Render the camera to the texture
                    screenshotCamera.targetTexture = renderTexture;
                    screenshotCamera.Render();

                    // Read pixels from render texture
                    RenderTexture.active = renderTexture;
                    texture2D.ReadPixels(new Rect(0, 0, renderTextureSize, renderTextureSize), 0, 0);
                    texture2D.Apply();
                    RenderTexture.active = null;

                    var filename = $"world_x{x:D3}_y{z:D3}.png";
                    var filepath = Path.Combine(outputDir, filename);
                    var bytes = ImageConversion.EncodeToPNG(texture2D);
                    File.WriteAllBytes(filepath, bytes);

                    metadata.screenshots.Add(new ScreenshotInfo
                    {
                        file = filename,
                        world_position = new WorldPosition { x = worldX, z = worldY },
                        coverage = new Coverage { width = tileWorldSize, height = tileWorldSize }
                    });

                    totalScreenshots++;
                }
            }

            mod.LoggerInstance.Msg("Restoring original zone states...");
            // Deactivate zones that were originally inactive
            for (int i = 0; i < fullZones.Count; i++)
            {
                if (i < originalZoneStates.Count && !originalZoneStates[i])
                {
                    var zoneRootObj = fullZones[i];
                    if (zoneRootObj != null)
                    {
                        zoneRootObj.SetActive(false);
                    }
                }

                if (staticEnvironment != null && i < staticEnvironment.Count && i < originalEnvStates.Count && !originalEnvStates[i])
                {
                    var staticEnvObj = staticEnvironment[i];
                    if (staticEnvObj != null)
                    {
                        staticEnvObj.SetActive(false);
                    }
                }
            }

            mod.LoggerInstance.Msg($"Captured {totalScreenshots} screenshots");

            // Cleanup
            if (renderTexture != null)
            {
                renderTexture.Release();
                UnityEngine.Object.Destroy(renderTexture);
            }
            if (texture2D != null)
            {
                UnityEngine.Object.Destroy(texture2D);
            }
            if (cameraObj != null)
            {
                UnityEngine.Object.Destroy(cameraObj);
            }

            // Restore time scale
            Time.timeScale = originalTimeScale;

            // Restore player position and visibility
            if (player?.transform != null)
            {
                player.transform.position = originalPlayerPosition;
            }
            if (player?.gameObject != null)
            {
                player.gameObject.SetActive(true);
            }

            // Calculate overall world bounds from screenshot positions
            var overallBounds = new WorldBounds
            {
                min_x = float.MaxValue,
                max_x = float.MinValue,
                min_z = float.MaxValue,
                max_z = float.MinValue
            };

            foreach (var screenshot in metadata.screenshots)
            {
                var pos = screenshot.world_position;
                var coverage = screenshot.coverage;

                float minX = pos.x - coverage.width / 2;
                float maxX = pos.x + coverage.width / 2;
                float minZ = pos.z - coverage.height / 2;
                float maxZ = pos.z + coverage.height / 2;

                if (minX < overallBounds.min_x) overallBounds.min_x = minX;
                if (maxX > overallBounds.max_x) overallBounds.max_x = maxX;
                if (minZ < overallBounds.min_z) overallBounds.min_z = minZ;
                if (maxZ > overallBounds.max_z) overallBounds.max_z = maxZ;
            }

            // Save metadata
            metadata.camera_height = Mathf.Abs(cameraDepth);
            metadata.orthographic_size = tileWorldSize / 2f;
            metadata.tile_resolution = renderTextureSize;
            metadata.world_bounds = overallBounds;

            var metadataPath = Path.Combine(outputDir, "metadata.json");
            var json = JsonConvert.SerializeObject(metadata, Formatting.Indented);
            File.WriteAllText(metadataPath, json);

            mod.LoggerInstance.Msg($"=== Complete! ===");
            mod.LoggerInstance.Msg($"Captured {totalScreenshots} screenshots");
            mod.LoggerInstance.Msg($"Metadata saved to: {metadataPath}");
            mod.OnCaptureComplete();
        }

        private static string CapitalizeFirst(string str)
        {
            if (string.IsNullOrEmpty(str))
                return str;
            return char.ToUpper(str[0]) + str.Substring(1);
        }

        /// <summary>
        /// Calculates combined bounds from all Renderer components in GameObject hierarchy.
        /// This is the standard Unity way - there's no built-in method for this.
        /// </summary>
        private Bounds? CalculateGameObjectBounds(GameObject rootObj, MapScreenshotter mod)
        {
            var renderers = rootObj.GetComponentsInChildren<Renderer>();
            if (renderers == null || renderers.Count == 0)
            {
                mod.LoggerInstance.Warning($"No renderers found in {rootObj.name}");
                return null;
            }

            mod.LoggerInstance.Msg($"  Found {renderers.Count} renderers in zone");

            // Count active vs inactive
            int activeCount = 0;
            int inactiveCount = 0;
            foreach (var r in renderers)
            {
                if (r != null && r.enabled && r.gameObject.activeInHierarchy)
                    activeCount++;
                else
                    inactiveCount++;
            }
            mod.LoggerInstance.Msg($"  Renderers: {activeCount} active, {inactiveCount} inactive");

            // Initialize with first renderer
            Bounds combined = renderers[0].bounds;

            // Log first few renderer positions for debugging
            for (int i = 0; i < Mathf.Min(3, renderers.Count); i++)
            {
                if (renderers[i] != null)
                {
                    var b = renderers[i].bounds;
                    var hasMaterial = renderers[i].material != null;
                    var hasSharedMaterial = renderers[i].sharedMaterial != null;
                    var materialName = hasMaterial ? renderers[i].material.name : "null";
                    mod.LoggerInstance.Msg($"  Renderer[{i}] '{renderers[i].gameObject.name}': center=({b.center.x:F1}, {b.center.y:F1}), size=({b.size.x:F1}, {b.size.y:F1}), material={materialName}, hasMat={hasMaterial}, hasSharedMat={hasSharedMaterial}");
                }
            }

            // Encapsulate all others
            for (int i = 1; i < renderers.Count; i++)
            {
                if (renderers[i] != null)
                    combined.Encapsulate(renderers[i].bounds);
            }

            mod.LoggerInstance.Msg($"  Combined bounds: center=({combined.center.x:F1}, {combined.center.y:F1}), size=({combined.size.x:F1}, {combined.size.y:F1})");
            return combined;
        }

        private WorldBounds CalculateWorldBounds(MapScreenshotter mod)
        {
            // Calculate from entity positions (game uses X/Y for 2D plane, Z is always 0)
            mod.LoggerInstance.Msg("Calculating bounds from entity positions...");

            var bounds = new WorldBounds
            {
                min_x = float.MaxValue,
                max_x = float.MinValue,
                min_z = float.MaxValue,
                max_z = float.MinValue
            };

            var entityCount = 0;

            // Check monsters
            var monsterType = Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Monster>();
            var monsters = GameObject.FindObjectsOfType(monsterType);
            foreach (var obj in monsters)
            {
                var monster = obj.TryCast<Il2Cpp.Monster>();
                if (monster?.gameObject?.scene.IsValid() != true) continue;

                var pos = monster.transform.position;
                if (pos.x < bounds.min_x) bounds.min_x = pos.x;
                if (pos.x > bounds.max_x) bounds.max_x = pos.x;
                if (pos.y < bounds.min_z) bounds.min_z = pos.y; // Use Y for vertical axis
                if (pos.y > bounds.max_z) bounds.max_z = pos.y; // Use Y for vertical axis
                entityCount++;
            }

            // Check NPCs
            var npcType = Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Npc>();
            var npcs = GameObject.FindObjectsOfType(npcType);
            foreach (var obj in npcs)
            {
                var npc = obj.TryCast<Il2Cpp.Npc>();
                if (npc?.gameObject?.scene.IsValid() != true) continue;

                var pos = npc.transform.position;
                if (pos.x < bounds.min_x) bounds.min_x = pos.x;
                if (pos.x > bounds.max_x) bounds.max_x = pos.x;
                if (pos.y < bounds.min_z) bounds.min_z = pos.y; // Use Y for vertical axis
                if (pos.y > bounds.max_z) bounds.max_z = pos.y; // Use Y for vertical axis
                entityCount++;
            }

            mod.LoggerInstance.Msg($"Calculated bounds from {entityCount} entities");

            // Add 10% padding around edges
            var worldWidth = bounds.max_x - bounds.min_x;
            var worldHeight = bounds.max_z - bounds.min_z;
            var paddingX = worldWidth * 0.1f;
            var paddingZ = worldHeight * 0.1f;

            bounds.min_x -= paddingX;
            bounds.max_x += paddingX;
            bounds.min_z -= paddingZ;
            bounds.max_z += paddingZ;

            mod.LoggerInstance.Msg($"Added padding: {paddingX:F1} units (X), {paddingZ:F1} units (Z)");

            return bounds;
        }

        private void HideEntities(MapScreenshotter mod)
        {
            // Hide monsters
            var monsterType = Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Monster>();
            var monsters = GameObject.FindObjectsOfType(monsterType);
            var monsterCount = 0;
            foreach (var obj in monsters)
            {
                var monster = obj.TryCast<Il2Cpp.Monster>();
                if (monster?.gameObject != null)
                {
                    monster.gameObject.SetActive(false);
                    monsterCount++;
                }
            }

            // Hide NPCs
            var npcType = Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Npc>();
            var npcs = GameObject.FindObjectsOfType(npcType);
            var npcCount = 0;
            foreach (var obj in npcs)
            {
                var npc = obj.TryCast<Il2Cpp.Npc>();
                if (npc?.gameObject != null)
                {
                    npc.gameObject.SetActive(false);
                    npcCount++;
                }
            }

            // Hide gather items
            var gatherType = Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.GatherItem>();
            var gatherItems = GameObject.FindObjectsOfType(gatherType);
            var gatherCount = 0;
            foreach (var obj in gatherItems)
            {
                var gatherItem = obj.TryCast<Il2Cpp.GatherItem>();
                if (gatherItem?.gameObject != null)
                {
                    gatherItem.gameObject.SetActive(false);
                    gatherCount++;
                }
            }

            mod.LoggerInstance.Msg($"Hidden: {monsterCount} monsters, {npcCount} NPCs, {gatherCount} gather items");
        }

        private void ShowEntities(MapScreenshotter mod)
        {
            // Show monsters
            var monsterType = Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Monster>();
            var monsters = GameObject.FindObjectsOfType(monsterType);
            foreach (var obj in monsters)
            {
                var monster = obj.TryCast<Il2Cpp.Monster>();
                if (monster?.gameObject != null)
                {
                    monster.gameObject.SetActive(true);
                }
            }

            // Show NPCs
            var npcType = Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Npc>();
            var npcs = GameObject.FindObjectsOfType(npcType);
            foreach (var obj in npcs)
            {
                var npc = obj.TryCast<Il2Cpp.Npc>();
                if (npc?.gameObject != null)
                {
                    npc.gameObject.SetActive(true);
                }
            }

            // Show gather items
            var gatherType = Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.GatherItem>();
            var gatherItems = GameObject.FindObjectsOfType(gatherType);
            foreach (var obj in gatherItems)
            {
                var gatherItem = obj.TryCast<Il2Cpp.GatherItem>();
                if (gatherItem?.gameObject != null)
                {
                    gatherItem.gameObject.SetActive(true);
                }
            }

            mod.LoggerInstance.Msg("All entities restored");
        }
    }

    // Metadata classes for JSON export
    public class ScreenshotMetadata
    {
        public string timestamp { get; set; }
        public float camera_height { get; set; }
        public float orthographic_size { get; set; }
        public int tile_resolution { get; set; }
        public WorldBounds world_bounds { get; set; }
        public List<ScreenshotInfo> screenshots { get; set; }
    }

    public class WorldBounds
    {
        public float min_x { get; set; }
        public float max_x { get; set; }
        public float min_z { get; set; }
        public float max_z { get; set; }
    }

    public class ScreenshotInfo
    {
        public string file { get; set; }
        public WorldPosition world_position { get; set; }
        public Coverage coverage { get; set; }
    }

    public class WorldPosition
    {
        public float x { get; set; }
        public float z { get; set; }
    }

    public class Coverage
    {
        public float width { get; set; }
        public float height { get; set; }
    }
}
