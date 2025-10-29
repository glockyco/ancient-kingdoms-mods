using MelonLoader;
using UnityEngine;
using UnityEngine.UI;
using Il2Cpp;

[assembly: MelonInfo(typeof(MapTeleporter.MapTeleporter), "MapTeleporter", "0.1.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace MapTeleporter
{
    public class MapTeleporter : MelonMod
    {
        private MelonPreferences_Category configCategory;
        private MelonPreferences_Entry<bool> verboseLoggingEntry;

        private bool VerboseLogging => verboseLoggingEntry.Value;

        public override void OnInitializeMelon()
        {
            // Create config
            configCategory = MelonPreferences.CreateCategory("MapTeleporter");
            verboseLoggingEntry = configCategory.CreateEntry("VerboseLogging", false, "Enable verbose logging for debugging coordinate conversion");

            LoggerInstance.Msg("MapTeleporter initialized!");
            LoggerInstance.Msg("Alt+Click on the map to teleport to that location");

            if (VerboseLogging)
            {
                LoggerInstance.Msg("Verbose logging is ENABLED");
            }
        }

        public override void OnUpdate()
        {
            var keyboard = UnityEngine.InputSystem.Keyboard.current;
            var mouse = UnityEngine.InputSystem.Mouse.current;
            if (keyboard == null || mouse == null) return;

            // Alt+Click on map to teleport
            if (IsMapOpen())
            {
                bool altHeld = keyboard.leftAltKey.isPressed || keyboard.rightAltKey.isPressed;
                if (altHeld && mouse.leftButton.wasPressedThisFrame)
                {
                    HandleMapTeleport();
                }
            }
        }

        private bool IsMapOpen()
        {
            var uiMap = Il2Cpp.UIMap.singleton;
            if (uiMap == null || uiMap.panel == null) return false;
            return uiMap.panel.activeSelf;
        }

        private void HandleMapTeleport()
        {
            var uiMap = Il2Cpp.UIMap.singleton;
            if (uiMap == null)
            {
                LoggerInstance.Error("UIMap.singleton is null!");
                return;
            }

            var player = Il2Cpp.Player.localPlayer;
            if (player == null)
            {
                LoggerInstance.Error("Player.localPlayer is null!");
                return;
            }

            // Get click position
            var mouse = UnityEngine.InputSystem.Mouse.current;
            Vector2 clickScreenPos = mouse.position.ReadValue();

            // Convert screen click to world position
            Vector2 worldPos;
            if (!ConvertScreenToWorld(uiMap, clickScreenPos, out worldPos))
            {
                LoggerInstance.Error("Failed to convert click to world position");
                return;
            }

            if (VerboseLogging)
            {
                LoggerInstance.Msg($"Teleporting to: ({worldPos.x:F2}, {worldPos.y:F2})");
                LoggerInstance.Msg($"Distance from player: {Vector2.Distance(new Vector2(player.transform.position.x, player.transform.position.y), worldPos):F2} units");
            }

            // Execute teleport
            Vector2 orientation = new Vector2(0, 1);
            player.CmdPortalDestination(player.idZone, worldPos, orientation);
        }

        /// <summary>
        /// Converts screen coordinates to world coordinates using the map system.
        /// See docs/MAP_COORDINATE_SYSTEMS.md for detailed explanation.
        /// </summary>
        private bool ConvertScreenToWorld(Il2Cpp.UIMap uiMap, Vector2 screenPos, out Vector2 worldPos)
        {
            worldPos = Vector2.zero;

            // STEP 1: Get the localMap RawImage RectTransform
            // Critical: Use localMap (1200×1010), NOT rectTransformMap (1920×1080)
            if (uiMap.localMap == null)
            {
                if (VerboseLogging) LoggerInstance.Error("localMap is null!");
                return false;
            }

            var localMapRT = uiMap.localMap.GetComponent<RectTransform>();
            if (localMapRT == null)
            {
                if (VerboseLogging) LoggerInstance.Error("localMap has no RectTransform!");
                return false;
            }

            // STEP 2: Convert screen position to map local coordinates
            // Use null camera for Screen Space Overlay UI
            Vector2 mapLocalPos;
            bool conversionSuccess = UnityEngine.RectTransformUtility.ScreenPointToLocalPointInRectangle(
                localMapRT,
                screenPos,
                null,  // Screen Space Overlay - no camera transformation
                out mapLocalPos
            );

            if (!conversionSuccess)
            {
                if (VerboseLogging) LoggerInstance.Error("ScreenPointToLocalPointInRectangle failed!");
                return false;
            }

            if (VerboseLogging)
            {
                LoggerInstance.Msg($"Screen: ({screenPos.x:F2}, {screenPos.y:F2}) → Map Local: ({mapLocalPos.x:F2}, {mapLocalPos.y:F2})");
            }

            // STEP 3: Normalize map local coordinates to [0, 1] range
            var mapRect = localMapRT.rect;
            float normalizedX = (mapLocalPos.x + mapRect.width / 2) / mapRect.width;
            float normalizedY = (mapLocalPos.y + mapRect.height / 2) / mapRect.height;

            // Validate normalized coordinates are within bounds
            if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1)
            {
                if (VerboseLogging)
                {
                    LoggerInstance.Warning($"Click outside map bounds! Normalized: ({normalizedX:F3}, {normalizedY:F3})");
                }
                return false;
            }

            if (VerboseLogging)
            {
                LoggerInstance.Msg($"Normalized: ({normalizedX:F3}, {normalizedY:F3})");
            }

            // STEP 4: Get Cinemachine virtual camera (the full map camera)
            if (uiMap.mapCamera == null)
            {
                if (VerboseLogging) LoggerInstance.Error("mapCamera is null!");
                return false;
            }

            Vector3 cameraWorldPos = uiMap.mapCamera.transform.position;
            float orthoSize = uiMap.mapCamera.m_Lens.OrthographicSize;

            // STEP 5: Calculate world view bounds
            // Critical: Use TEXTURE aspect ratio (800×800 = 1.0), NOT display rect aspect (1200×1010 = 1.188)
            // Using display rect aspect causes 18.8% overshooting
            var mapTexture = uiMap.localMap.texture;
            float textureAspect = mapTexture != null ? (float)mapTexture.width / mapTexture.height : 1.0f;

            float viewWidth = orthoSize * textureAspect * 2;
            float viewHeight = orthoSize * 2;

            float viewMinX = cameraWorldPos.x - viewWidth / 2;
            float viewMinY = cameraWorldPos.y - viewHeight / 2;

            if (VerboseLogging)
            {
                LoggerInstance.Msg($"Camera: ({cameraWorldPos.x:F2}, {cameraWorldPos.y:F2}), Ortho: {orthoSize:F2}");
                LoggerInstance.Msg($"View Bounds: X=[{viewMinX:F2}, {viewMinX + viewWidth:F2}], Y=[{viewMinY:F2}, {viewMinY + viewHeight:F2}]");
            }

            // STEP 6: Map normalized coordinates to world coordinates
            worldPos = new Vector2(
                viewMinX + normalizedX * viewWidth,
                viewMinY + normalizedY * viewHeight
            );

            return true;
        }
    }
}
