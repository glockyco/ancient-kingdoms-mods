using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Il2Cpp;
using Il2CppMirror;
using System.Collections.Generic;
using System.Linq;

[assembly: MelonInfo(typeof(BossTracker.BossTracker), "BossTracker", "0.1.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossTracker
{
    public class BossTracker : MelonMod
    {
        private GameObject trackerPanel;
        private Text trackerText;
        private RectTransform panelRectTransform;
        private Dictionary<uint, BossInfo> trackedBosses = new Dictionary<uint, BossInfo>();

        // Dragging
        private bool isDragging = false;
        private Vector2 dragOffset;

        // Caching
        private Il2CppSystem.Object[] cachedMonsters = null;
        private Il2Cpp.NetworkManagerMMO cachedNetworkManager = null;
        private string lastSceneName = "";
        private Vector3 lastPlayerPosition = Vector3.zero;
        private const float TELEPORT_DISTANCE_THRESHOLD = 50f;

        // Config
        private MelonPreferences_Category configCategory;
        private MelonPreferences_Entry<float> configPanelX;
        private MelonPreferences_Entry<float> configPanelY;
        private MelonPreferences_Entry<float> configPanelWidth;
        private MelonPreferences_Entry<float> configPanelHeight;
        private MelonPreferences_Entry<int> configFontSize;

        private class BossInfo
        {
            public string name;
            public int level;
            public bool isElite;
            public Vector3 position;
            public bool isAlive;
            public double respawnTime;
        }

        public override void OnInitializeMelon()
        {
            LoggerInstance.Msg("BossTracker initialized!");

            // Initialize config
            configCategory = MelonPreferences.CreateCategory("BossTracker");
            configPanelX = configCategory.CreateEntry("PanelX", -10f, "Panel X Position");
            configPanelY = configCategory.CreateEntry("PanelY", 30f, "Panel Y Position");
            configPanelWidth = configCategory.CreateEntry("PanelWidth", 420f, "Panel Width");
            configPanelHeight = configCategory.CreateEntry("PanelHeight", 300f, "Panel Height");
            configFontSize = configCategory.CreateEntry("FontSize", 12, "Font Size");
        }

        private void CreateTrackerUI()
        {
            if (trackerPanel != null) return;

            var canvas = GameObject.Find("Canvas");
            if (canvas == null)
            {
                LoggerInstance.Warning("Could not find Canvas to attach tracker UI");
                return;
            }

            // Create panel
            trackerPanel = new GameObject("BossTrackerPanel");
            trackerPanel.transform.SetParent(canvas.transform, false);

            panelRectTransform = trackerPanel.AddComponent<RectTransform>();
            panelRectTransform.anchorMin = new Vector2(1, 0);
            panelRectTransform.anchorMax = new Vector2(1, 0);
            panelRectTransform.pivot = new Vector2(1, 0);
            panelRectTransform.anchoredPosition = new Vector2(configPanelX.Value, configPanelY.Value);
            panelRectTransform.sizeDelta = new Vector2(configPanelWidth.Value, configPanelHeight.Value);

            // Add background
            var image = trackerPanel.AddComponent<Image>();
            image.color = new Color(0, 0, 0, 0.7f);

            // Create text
            var textObj = new GameObject("BossTrackerText");
            textObj.transform.SetParent(trackerPanel.transform, false);

            var textRect = textObj.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            textRect.anchoredPosition = Vector2.zero;

            trackerText = textObj.AddComponent<Text>();
            trackerText.fontSize = configFontSize.Value;
            trackerText.color = Color.white;
            trackerText.alignment = TextAnchor.UpperLeft;
            trackerText.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        }

        public override void OnUpdate()
        {
            // Only run in the World scene
            string currentScene = SceneManager.GetActiveScene().name;
            if (currentScene != "World")
            {
                // Clear cache when leaving World scene
                if (lastSceneName == "World")
                {
                    cachedMonsters = null;
                    cachedNetworkManager = null;
                }
                lastSceneName = currentScene;
                return;
            }

            // Create UI if needed
            if (trackerPanel == null)
            {
                CreateTrackerUI();
            }

            // Handle panel dragging
            if (trackerPanel != null && panelRectTransform != null)
            {
                HandlePanelDragging();
            }

            // Refresh cache on scene change or teleport
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

            if (cachedMonsters == null || sceneChanged || playerTeleported)
            {
                cachedMonsters = UnityEngine.Object.FindObjectsOfType(Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Monster>());
                lastSceneName = currentScene;

                if (sceneChanged && player != null)
                {
                    lastPlayerPosition = player.transform.position;
                }
            }

            // Cache network manager (singleton - only need to fetch once)
            if (cachedNetworkManager == null)
            {
                var allNetworkManagers = UnityEngine.Object.FindObjectsOfType(Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.NetworkManagerMMO>());
                if (allNetworkManagers != null && allNetworkManagers.Length > 0)
                {
                    cachedNetworkManager = allNetworkManagers[0].Cast<Il2Cpp.NetworkManagerMMO>();
                }
            }

            // Track bosses/elites
            var monsters = cachedMonsters;

            // Get server time
            Il2Cpp.NetworkManagerMMO networkManager = cachedNetworkManager;

            double currentTime = 0;
            bool hasServerTime = false;

            if (networkManager != null)
            {
                currentTime = NetworkTime.time + networkManager.offsetNetworkTime;
                hasServerTime = true;

                // Remove bosses that have respawned
                var respawnedBosses = trackedBosses.Where(kvp => !kvp.Value.isAlive && kvp.Value.respawnTime <= currentTime).Select(kvp => kvp.Key).ToList();
                foreach (var bossId in respawnedBosses)
                {
                    trackedBosses.Remove(bossId);
                }
            }

            // Clear alive status (will be set again if found alive)
            foreach (var tracked in trackedBosses.Values)
            {
                if (tracked.isAlive)
                {
                    tracked.isAlive = false;
                }
            }

            foreach (var obj in monsters)
            {
                var monster = obj.Cast<Il2Cpp.Monster>();

                bool isDead = monster.health != null && monster.health.current <= 0;
                bool isBossOrElite = monster.isBoss || monster.isElite;

                // Track bosses and elites (both alive and dead)
                if (isBossOrElite)
                {
                    if (isDead)
                    {
                        // Track dead bosses/elites
                        if (hasServerTime && monster.respawn && monster.respawnTimeEnd > currentTime)
                        {
                            if (!trackedBosses.ContainsKey(monster.netId))
                            {
                                trackedBosses[monster.netId] = new BossInfo();
                            }

                            var info = trackedBosses[monster.netId];
                            info.name = monster.name.Replace("(Clone)", "").Trim();
                            info.level = monster.level != null ? monster.level.current : 1;
                            info.isElite = monster.isElite && !monster.isBoss;
                            info.position = monster.transform.position;
                            info.isAlive = false;
                            info.respawnTime = monster.respawnTimeEnd;
                        }
                    }
                    else
                    {
                        // Track alive bosses/elites
                        if (!trackedBosses.ContainsKey(monster.netId))
                        {
                            trackedBosses[monster.netId] = new BossInfo();
                        }

                        var info = trackedBosses[monster.netId];
                        info.name = monster.name.Replace("(Clone)", "").Trim();
                        info.level = monster.level != null ? monster.level.current : 1;
                        info.isElite = monster.isElite && !monster.isBoss;
                        info.position = monster.transform.position;
                        info.isAlive = true;
                    }
                }
            }

            // Update tracker UI (only if we have server time)
            if (hasServerTime)
            {
                UpdateTrackerUI(currentTime);
            }
        }

        private void HandlePanelDragging()
        {
            var mouse = UnityEngine.InputSystem.Mouse.current;
            var keyboard = UnityEngine.InputSystem.Keyboard.current;
            if (mouse == null || keyboard == null)
            {
                return;
            }

            Vector2 mousePos = mouse.position.ReadValue();
            bool shiftHeld = keyboard.rightShiftKey.isPressed;

            // Start dragging (Hold Right Shift + Left Click)
            if (mouse.leftButton.wasPressedThisFrame && shiftHeld && !isDragging)
            {
                isDragging = true;
                dragOffset = mousePos;
            }

            // While dragging
            if (isDragging && mouse.leftButton.isPressed)
            {
                Vector2 delta = mousePos - dragOffset;
                panelRectTransform.anchoredPosition += delta;
                dragOffset = mousePos;
            }

            // Stop dragging
            if (isDragging && mouse.leftButton.wasReleasedThisFrame)
            {
                isDragging = false;
                configPanelX.Value = panelRectTransform.anchoredPosition.x;
                configPanelY.Value = panelRectTransform.anchoredPosition.y;
                configCategory.SaveToFile();
            }
        }

        private void UpdateTrackerUI(double currentTime)
        {
            if (trackerText == null) return;

            if (trackedBosses.Count == 0)
            {
                trackerPanel.SetActive(false);
                return;
            }

            trackerPanel.SetActive(true);

            // Get player position
            var player = Il2Cpp.Player.localPlayer;
            Vector3 playerPos = Vector3.zero;
            bool hasPlayerPos = false;

            if (player != null)
            {
                playerPos = player.transform.position;
                hasPlayerPos = true;
            }

            // Separate alive and dead
            var aliveBosses = trackedBosses.Values.Where(b => b.isAlive).OrderBy(b => hasPlayerPos ? Vector3.Distance(playerPos, b.position) : 0).ToList();
            var deadBosses = trackedBosses.Values.Where(b => !b.isAlive).OrderBy(b => b.respawnTime).ToList();

            // Header
            var text = $"<b><size=14>BOSS/ELITE TRACKER (A:{aliveBosses.Count} | D:{deadBosses.Count})</size></b>\n";
            text += "<color=#666666>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</color>\n";

            // Player position section
            if (hasPlayerPos)
            {
                text += $"<b>You:</b> <color=#AAAAAA>({playerPos.x:F0}, {playerPos.y:F0}, {playerPos.z:F0})</color>\n";
            }
            text += "<color=#666666>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</color>\n\n";

            // Alive section
            if (aliveBosses.Count > 0)
            {
                text += "<color=#00FF00><b>▼ ALIVE (" + aliveBosses.Count + ")</b></color> - By distance\n\n";

                foreach (var boss in aliveBosses)
                {
                    string colorCode = boss.isElite ? "#CC66FF" : "#00FFFF";
                    string symbol = boss.isElite ? "◆" : "★";
                    string typeLabel = boss.isElite ? "[Elite]" : "[Boss]";

                    text += $"<color={colorCode}>{symbol} <b>{typeLabel} {boss.name}</b></color> | ";
                    text += $"<color=#FFD700>Lvl {boss.level}</color>";

                    if (hasPlayerPos)
                    {
                        float distance = Vector3.Distance(playerPos, boss.position);
                        string direction = GetDirectionWithDegrees(playerPos, boss.position);
                        text += $" | {distance:F0}m {direction}";
                    }

                    text += "\n";
                }
                text += "\n";
            }

            // Dead section
            if (deadBosses.Count > 0)
            {
                if (aliveBosses.Count > 0)
                {
                    text += "<color=#666666>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</color>\n";
                }

                text += "<color=#FF4444><b>▼ RESPAWNING (" + deadBosses.Count + ")</b></color> - By time\n\n";

                foreach (var boss in deadBosses)
                {
                    double timeLeft = boss.respawnTime - currentTime;
                    if (timeLeft > 0)
                    {
                        int minutes = (int)(timeLeft / 60);
                        int seconds = (int)(timeLeft % 60);

                        string colorCode = boss.isElite ? "#CC66FF" : "#00FFFF";
                        string symbol = "☠";
                        string typeLabel = boss.isElite ? "[Elite]" : "[Boss]";

                        text += $"<color={colorCode}>{symbol} <b>{typeLabel} {boss.name}</b></color> | ";
                        text += $"<color=#FFD700>Lvl {boss.level}</color> | ";
                        text += $"<color=#FF8888>{minutes:00}:{seconds:00}</color>";

                        if (hasPlayerPos)
                        {
                            float distance = Vector3.Distance(playerPos, boss.position);
                            string direction = GetDirectionWithDegrees(playerPos, boss.position);
                            text += $" | {distance:F0}m {direction}";
                        }

                        text += "\n";
                    }
                }
            }

            trackerText.text = text;
        }

        private string GetDirectionWithDegrees(Vector3 from, Vector3 to)
        {
            Vector3 direction = to - from;
            // For 2D isometric: X is horizontal (right), Y is vertical (up)
            float angle = Mathf.Atan2(direction.x, direction.y) * Mathf.Rad2Deg;

            if (angle < 0) angle += 360;

            string[] directions = { "N", "NE", "E", "SE", "S", "SW", "W", "NW" };
            int index = Mathf.RoundToInt(angle / 45f) % 8;

            return $"{directions[index]} ({Mathf.RoundToInt(angle)}°)";
        }
    }
}
