using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;
using Il2Cpp;
using Il2CppMirror;
using System.Collections.Generic;
using System.Linq;

[assembly: MelonInfo(typeof(MonsterRespawner.MonsterRespawner), "MonsterRespawner", "0.1.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace MonsterRespawner
{
    public class MonsterRespawner : MelonMod
    {
        private Il2CppSystem.Object[] cachedMonsters = null;
        private Il2Cpp.NetworkManagerMMO cachedNetworkManager = null;
        private string lastSceneName = "";
        private float lastCacheRefreshTime = 0f;
        private const float CACHE_REFRESH_INTERVAL = 5f;

        private Dictionary<uint, RespawnMarker> respawnMarkers = new Dictionary<uint, RespawnMarker>();
        private Camera mainCamera;

        private class RespawnMarker
        {
            public uint netId;
            public GameObject markerObject;
            public TextMesh textComponent;
            public Vector3 position;
            public string monsterName;
            public int level;
            public bool isBoss;
            public bool isElite;
            public double respawnTime;
            public Color textColor;
        }

        public override void OnInitializeMelon()
        {
            LoggerInstance.Msg("MonsterRespawner initialized!");
            LoggerInstance.Msg("Hold Alt to show respawn markers, then left-click to respawn monsters");
        }

        public override void OnUpdate()
        {
            string currentScene = SceneManager.GetActiveScene().name;
            if (currentScene != "World")
            {
                if (lastSceneName == "World")
                {
                    cachedMonsters = null;
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
            bool timeToRefresh = Time.time - lastCacheRefreshTime >= CACHE_REFRESH_INTERVAL;

            if (cachedMonsters == null || sceneChanged || timeToRefresh)
            {
                cachedMonsters = UnityEngine.Object.FindObjectsOfType(Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Monster>());
                lastCacheRefreshTime = Time.time;
                lastSceneName = currentScene;
            }

            double currentTime = 0;
            bool hasServerTime = false;
            if (cachedNetworkManager != null)
            {
                currentTime = NetworkTime.time + cachedNetworkManager.offsetNetworkTime;
                hasServerTime = true;
            }

            UpdateRespawnMarkers();
            if (hasServerTime)
            {
                UpdateMarkerText(currentTime);
            }
            UpdateMarkerVisibility();
            HandleMarkerClicks();
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
                        marker.textComponent.text = $"{marker.monsterName}\nLvl {marker.level} - {minutes:00}:{seconds:00}";
                    }
                    else
                    {
                        marker.textComponent.text = $"{marker.monsterName}\nLvl {marker.level} - Ready";
                    }
                }
            }
        }

        private void UpdateRespawnMarkers()
        {
            var monsters = cachedMonsters;
            if (monsters == null) return;

            HashSet<uint> activeDeadMonsters = new HashSet<uint>();

            Il2Cpp.NetworkManagerMMO networkManager = cachedNetworkManager;
            double currentTime = 0;
            bool hasServerTime = false;

            if (networkManager != null)
            {
                currentTime = NetworkTime.time + networkManager.offsetNetworkTime;
                hasServerTime = true;

                var respawnedMarkers = respawnMarkers.Where(kvp => kvp.Value.respawnTime <= currentTime).Select(kvp => kvp.Key).ToList();
                foreach (var id in respawnedMarkers)
                {
                    DestroyMarker(id);
                }
            }

            foreach (var obj in monsters)
            {
                var monster = obj.Cast<Il2Cpp.Monster>();
                bool isDead = monster.health != null && monster.health.current <= 0;

                if (isDead && monster.respawn && hasServerTime && monster.respawnTimeEnd > currentTime)
                {
                    activeDeadMonsters.Add(monster.netId);

                    if (!respawnMarkers.ContainsKey(monster.netId))
                    {
                        CreateMarker(monster);
                    }
                    else
                    {
                        var marker = respawnMarkers[monster.netId];
                        marker.position = monster.transform.position;
                        marker.respawnTime = monster.respawnTimeEnd;
                        if (marker.markerObject != null)
                        {
                            marker.markerObject.transform.position = marker.position;
                        }
                    }
                }
            }

            var markersToRemove = respawnMarkers.Keys.Where(id => !activeDeadMonsters.Contains(id)).ToList();
            foreach (var id in markersToRemove)
            {
                DestroyMarker(id);
            }
        }

        private void CreateMarker(Il2Cpp.Monster monster)
        {
            string monsterName = monster.name.Replace("(Clone)", "").Trim();
            int level = monster.level != null ? monster.level.current : 1;

            Color textColor;
            if (monster.isBoss)
            {
                textColor = new Color(0f, 1f, 1f, 1f);
            }
            else if (monster.hasMinimapMark && monster.minimapMark != null)
            {
                textColor = monster.minimapMark.color;
                textColor.a = 1f;
            }
            else
            {
                textColor = Color.white;
            }

            GameObject markerObj = new GameObject($"RespawnMarker_{monster.netId}");
            markerObj.transform.position = monster.transform.position;

            var textMesh = markerObj.AddComponent<TextMesh>();
            textMesh.text = $"{monsterName}\nLvl {level}";
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
                netId = monster.netId,
                markerObject = markerObj,
                textComponent = textMesh,
                position = monster.transform.position,
                monsterName = monsterName,
                level = level,
                isBoss = monster.isBoss,
                isElite = monster.isElite,
                respawnTime = monster.respawnTimeEnd,
                textColor = textColor
            };

            respawnMarkers[monster.netId] = marker;
        }

        private void DestroyMarker(uint netId)
        {
            if (respawnMarkers.TryGetValue(netId, out var marker))
            {
                if (marker.markerObject != null)
                {
                    UnityEngine.Object.Destroy(marker.markerObject);
                }
                respawnMarkers.Remove(netId);
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
                            RespawnMonster(marker.netId);
                            return;
                        }
                    }
                }
            }
        }

        private void RespawnMonster(uint netId)
        {
            var monsters = cachedMonsters;
            if (monsters == null) return;

            Il2Cpp.Monster targetMonster = null;
            foreach (var obj in monsters)
            {
                var monster = obj.Cast<Il2Cpp.Monster>();
                if (monster.netId == netId)
                {
                    targetMonster = monster;
                    break;
                }
            }

            if (targetMonster == null) return;

            if (targetMonster.respawn)
            {
                targetMonster.respawnTimeEnd = Time.timeAsDouble - 1.0;
            }
        }
    }
}
