using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;
using Il2Cpp;
using Il2CppMirror;
using System.Collections.Generic;
using System.Linq;

[assembly: MelonInfo(typeof(ResourceRespawner.ResourceRespawner), "ResourceRespawner", "0.1.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace ResourceRespawner
{
    public class ResourceRespawner : MelonMod
    {
        private Il2CppSystem.Object[] cachedGatherItems = null;
        private Il2Cpp.NetworkManagerMMO cachedNetworkManager = null;
        private string lastSceneName = "";
        private Vector3 lastPlayerPosition = Vector3.zero;
        private const float TELEPORT_DISTANCE_THRESHOLD = 50f;

        private Dictionary<int, RespawnMarker> respawnMarkers = new Dictionary<int, RespawnMarker>();
        private Camera mainCamera;

        private class RespawnMarker
        {
            public int instanceId;
            public GameObject markerObject;
            public TextMesh textComponent;
            public Vector3 position;
            public string resourceName;
            public string resourceType;
            public double respawnTime;
            public Color textColor;
        }

        private static readonly Color COLOR_PLANT = new Color(0.518f, 0.8f, 0.086f, 1f);
        private static readonly Color COLOR_MINERAL = new Color(0.42f, 0.45f, 0.5f, 1f);
        private static readonly Color COLOR_RADIANT_SPARK = new Color(0.659f, 0.333f, 0.969f, 1f);
        private static readonly Color COLOR_CHEST = new Color(0.918f, 0.702f, 0.224f, 1f);
        private static readonly Color COLOR_OTHER = new Color(0.612f, 0.639f, 0.686f, 1f);

        public override void OnInitializeMelon()
        {
            LoggerInstance.Msg("ResourceRespawner initialized!");
            LoggerInstance.Msg("Hold Alt to show resource respawn markers, then left-click to respawn");
        }

        public override void OnUpdate()
        {
            string currentScene = SceneManager.GetActiveScene().name;
            if (currentScene != "World")
            {
                if (lastSceneName == "World")
                {
                    cachedGatherItems = null;
                    cachedNetworkManager = null;
                    ClearAllMarkers();
                }
                lastSceneName = currentScene;
                return;
            }

            if (mainCamera == null)
            {
                mainCamera = Camera.main;
            }

            if (cachedNetworkManager == null)
            {
                var allNetworkManagers = UnityEngine.Object.FindObjectsOfType(Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.NetworkManagerMMO>());
                if (allNetworkManagers != null && allNetworkManagers.Length > 0)
                {
                    cachedNetworkManager = allNetworkManagers[0].Cast<Il2Cpp.NetworkManagerMMO>();
                }
            }

            bool sceneChanged = lastSceneName != currentScene;

            bool playerTeleported = false;
            var player = Il2Cpp.Player.localPlayer;
            if (player != null)
            {
                Vector3 currentPos = player.transform.position;
                float distanceMoved = Vector3.Distance(currentPos, lastPlayerPosition);

                if (distanceMoved > TELEPORT_DISTANCE_THRESHOLD)
                {
                    playerTeleported = true;
                    lastPlayerPosition = currentPos;
                }
            }

            if (cachedGatherItems == null || sceneChanged || playerTeleported)
            {
                cachedGatherItems = UnityEngine.Object.FindObjectsOfType(Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.GatherItem>());
                lastSceneName = currentScene;

                if (sceneChanged && player != null)
                {
                    lastPlayerPosition = player.transform.position;
                }
            }

            double currentTime = 0;
            bool hasServerTime = false;
            if (cachedNetworkManager != null)
            {
                currentTime = NetworkTime.time + cachedNetworkManager.offsetNetworkTime;
                hasServerTime = true;
            }

            UpdateRespawnMarkers(currentTime, hasServerTime);
            if (hasServerTime)
            {
                UpdateMarkerText(currentTime);
            }
            UpdateMarkerVisibility();
            HandleMarkerClicks();
        }

        private void UpdateRespawnMarkers(double currentTime, bool hasServerTime)
        {
            var gatherItems = cachedGatherItems;
            if (gatherItems == null) return;

            HashSet<int> activeCooldownItems = new HashSet<int>();

            if (hasServerTime)
            {
                var respawnedMarkers = respawnMarkers.Where(kvp => kvp.Value.respawnTime <= currentTime).Select(kvp => kvp.Key).ToList();
                foreach (var id in respawnedMarkers)
                {
                    DestroyMarker(id);
                }
            }

            foreach (var obj in gatherItems)
            {
                var gatherItem = obj.Cast<Il2Cpp.GatherItem>();
                bool onCooldown = hasServerTime && gatherItem.timeToReady > 0.0 && gatherItem.timeToReady > currentTime;

                if (onCooldown)
                {
                    int instanceId = gatherItem.GetInstanceID();
                    activeCooldownItems.Add(instanceId);

                    if (!respawnMarkers.ContainsKey(instanceId))
                    {
                        CreateMarker(gatherItem, instanceId);
                    }
                    else
                    {
                        var marker = respawnMarkers[instanceId];
                        marker.position = gatherItem.transform.position;
                        marker.respawnTime = gatherItem.timeToReady;
                        if (marker.markerObject != null)
                        {
                            marker.markerObject.transform.position = marker.position;
                        }
                    }
                }
            }

            var markersToRemove = respawnMarkers.Keys.Where(id => !activeCooldownItems.Contains(id)).ToList();
            foreach (var id in markersToRemove)
            {
                DestroyMarker(id);
            }
        }

        private void CreateMarker(Il2Cpp.GatherItem gatherItem, int instanceId)
        {
            string name = string.IsNullOrEmpty(gatherItem.nameGatherItem) 
                ? gatherItem.name.Replace("(Clone)", "").Trim()
                : gatherItem.nameGatherItem;

            string resourceType;
            Color textColor;

            if (gatherItem.isPlant)
            {
                resourceType = "Plant";
                textColor = COLOR_PLANT;
            }
            else if (gatherItem.isMineral)
            {
                resourceType = "Mineral";
                textColor = COLOR_MINERAL;
            }
            else if (gatherItem.isRadiantSpark)
            {
                resourceType = "Spark";
                textColor = COLOR_RADIANT_SPARK;
            }
            else if (gatherItem.isChest)
            {
                resourceType = "Chest";
                textColor = COLOR_CHEST;
            }
            else
            {
                resourceType = "Other";
                textColor = COLOR_OTHER;
            }

            GameObject markerObj = new GameObject($"ResourceRespawnMarker_{instanceId}");
            markerObj.transform.position = gatherItem.transform.position;

            var textMesh = markerObj.AddComponent<TextMesh>();
            textMesh.text = $"{name}\n{resourceType}";
            textMesh.fontSize = 20;
            textMesh.color = textColor;
            textMesh.anchor = TextAnchor.MiddleCenter;
            textMesh.alignment = TextAlignment.Center;
            textMesh.characterSize = 0.2f;

            var meshRenderer = markerObj.GetComponent<MeshRenderer>();
            if (meshRenderer != null)
            {
                meshRenderer.sortingOrder = 100;
            }

            var collider = markerObj.AddComponent<BoxCollider>();
            collider.size = new Vector3(4f, 1.2f, 0.1f);

            var marker = new RespawnMarker
            {
                instanceId = instanceId,
                markerObject = markerObj,
                textComponent = textMesh,
                position = gatherItem.transform.position,
                resourceName = name,
                resourceType = resourceType,
                respawnTime = gatherItem.timeToReady,
                textColor = textColor
            };

            respawnMarkers[instanceId] = marker;
        }

        private void UpdateMarkerText(double currentTime)
        {
            foreach (var marker in respawnMarkers.Values)
            {
                if (marker.textComponent != null)
                {
                    double timeLeft = marker.respawnTime - currentTime;
                    if (timeLeft > 0)
                    {
                        int minutes = (int)(timeLeft / 60);
                        int seconds = (int)(timeLeft % 60);
                        marker.textComponent.text = $"{marker.resourceName}\n{marker.resourceType} - {minutes:00}:{seconds:00}";
                    }
                    else
                    {
                        marker.textComponent.text = $"{marker.resourceName}\n{marker.resourceType} - Ready";
                    }
                }
            }
        }

        private void UpdateMarkerVisibility()
        {
            var keyboard = UnityEngine.InputSystem.Keyboard.current;
            if (keyboard == null) return;

            bool altHeld = keyboard.leftAltKey.isPressed || keyboard.rightAltKey.isPressed;

            foreach (var marker in respawnMarkers.Values)
            {
                if (marker.markerObject != null)
                {
                    marker.markerObject.SetActive(altHeld);
                }
            }
        }

        private void HandleMarkerClicks()
        {
            if (mainCamera == null) return;

            var mouse = UnityEngine.InputSystem.Mouse.current;
            var keyboard = UnityEngine.InputSystem.Keyboard.current;
            if (mouse == null || keyboard == null) return;

            bool altHeld = keyboard.leftAltKey.isPressed || keyboard.rightAltKey.isPressed;
            if (!altHeld) return;

            if (mouse.leftButton.wasPressedThisFrame)
            {
                Vector2 mousePos = mouse.position.ReadValue();
                Ray ray = mainCamera.ScreenPointToRay(new Vector3(mousePos.x, mousePos.y, 0));

                RaycastHit hit;
                if (Physics.Raycast(ray, out hit, 1000f))
                {
                    foreach (var marker in respawnMarkers.Values)
                    {
                        if (marker.markerObject == hit.collider.gameObject)
                        {
                            RespawnResource(marker.instanceId);
                            return;
                        }
                    }
                }
            }
        }

        private void RespawnResource(int instanceId)
        {
            var gatherItems = cachedGatherItems;
            if (gatherItems == null) return;

            Il2Cpp.GatherItem targetGatherItem = null;
            foreach (var obj in gatherItems)
            {
                var gatherItem = obj.Cast<Il2Cpp.GatherItem>();
                if (gatherItem.GetInstanceID() == instanceId)
                {
                    targetGatherItem = gatherItem;
                    break;
                }
            }

            if (targetGatherItem == null) return;

            targetGatherItem.NetworktimeToReady = Time.timeAsDouble - 1.0;
        }

        private void DestroyMarker(int instanceId)
        {
            if (respawnMarkers.TryGetValue(instanceId, out var marker))
            {
                if (marker.markerObject != null)
                {
                    UnityEngine.Object.Destroy(marker.markerObject);
                }
                respawnMarkers.Remove(instanceId);
            }
        }

        private void ClearAllMarkers()
        {
            foreach (var marker in respawnMarkers.Values)
            {
                if (marker.markerObject != null)
                {
                    UnityEngine.Object.Destroy(marker.markerObject);
                }
            }
            respawnMarkers.Clear();
        }
    }
}
