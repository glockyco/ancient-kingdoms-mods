using System.Collections.Generic;
using System.Linq;
using AncientKingdomsMods.Shared;
using Il2Cpp;
using Il2CppMirror;
using Il2CppTMPro;
using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

[assembly: MelonInfo(typeof(BossTracker.BossTracker), "BossTracker", "0.2.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossTracker
{
    public class BossTracker : MelonMod
    {
        private const float TextPadding = 6f;
        private const float HoverPanelGap = 8f;
        private const float MonsterRefreshSeconds = 2f;
        private const string Rule = "<color=#666666>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</color>\n";

        // The default position. At this position the panel moves above the game's monster
        // hover panel, which occupies the same corner.
        private const float DefaultPanelX = -10f;
        private const float DefaultPanelY = 30f;

        private GameObject trackerPanel;
        private TextMeshProUGUI trackerText;
        private RectTransform panelRectTransform;
        private Dictionary<uint, BossInfo> trackedBosses = new Dictionary<uint, BossInfo>();

        // Dragging
        private bool isDragging = false;
        private Vector2 dragOffset;

        // Caching
        private Il2CppSystem.Object[] cachedMonsters = null;
        private float nextMonsterRefresh;
        private Il2Cpp.NetworkManagerMMO cachedNetworkManager = null;
        private bool reportedMissingNetworkManager = false;
        private string lastSceneName = "";

        // Config
        private MelonPreferences_Category configCategory;
        private MelonPreferences_Entry<float> configPanelX;
        private MelonPreferences_Entry<float> configPanelY;
        private MelonPreferences_Entry<float> configPanelWidth;
        private MelonPreferences_Entry<float> configPanelHeight;
        private MelonPreferences_Entry<int> configFontSize;

        private class BossInfo
        {
            public string nameEntity;
            public int level;
            public bool isBoss;
            public bool isElite;
            public bool isFabled;
            public Vector3 position;
            public bool isAlive;
            public double respawnTime;
        }

        public override void OnInitializeMelon()
        {
            LoggerInstance.Msg($"BossTracker initialized, build {ModBuild.Commit(typeof(BossTracker).Assembly)}");

            // Initialize config
            configCategory = MelonPreferences.CreateCategory("BossTracker");
            configPanelX = configCategory.CreateEntry("PanelX", DefaultPanelX, "Panel X Position");
            configPanelY = configCategory.CreateEntry("PanelY", DefaultPanelY, "Panel Y Position. The default places the panel above the game's monster hover panel.");
            configPanelWidth = configCategory.CreateEntry("PanelWidth", 420f, "Panel Width");
            configPanelHeight = configCategory.CreateEntry("PanelHeight", 300f, "Maximum Panel Height. The panel fits its list up to this height.");
            configFontSize = configCategory.CreateEntry("FontSize", 12, "Font Size");
        }

        private void CreateTrackerUI()
        {
            if (trackerPanel != null) return;

            var canvas = GameObject.Find("Canvas");
            if (canvas == null)
            {
                LoggerInstance.Error("Could not find Canvas to attach tracker UI");
                return;
            }

            // Create panel
            trackerPanel = new GameObject("BossTrackerPanel");
            trackerPanel.transform.SetParent(canvas.transform, false);

            panelRectTransform = trackerPanel.AddComponent<RectTransform>();
            panelRectTransform.anchorMin = new Vector2(1, 0);
            panelRectTransform.anchorMax = new Vector2(1, 0);
            panelRectTransform.pivot = new Vector2(1, 0);
            panelRectTransform.anchoredPosition = InitialPosition(canvas);
            panelRectTransform.sizeDelta = new Vector2(configPanelWidth.Value, configPanelHeight.Value);

            // Add background
            var image = trackerPanel.AddComponent<Image>();
            image.color = new Color(0, 0, 0, 0.7f);
            image.raycastTarget = false;

            // Create text
            var textObj = new GameObject("BossTrackerText");
            textObj.transform.SetParent(trackerPanel.transform, false);

            var textRect = textObj.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = new Vector2(TextPadding, TextPadding);
            textRect.offsetMax = new Vector2(-TextPadding, -TextPadding);

            // TMP rather than legacy Text, because the game's Chinese and Japanese fonts are TMP fonts.
            trackerText = textObj.AddComponent<TextMeshProUGUI>();
            trackerText.font = GameText.LatinFont(TMP_Settings.defaultFontAsset);
            trackerText.fontSize = configFontSize.Value;
            trackerText.color = Color.white;
            trackerText.alignment = TextAlignmentOptions.TopLeft;
            trackerText.enableWordWrapping = true;
            trackerText.overflowMode = TextOverflowModes.Truncate;
            trackerText.raycastTarget = false;
        }

        // A saved position other than the default is the player's choice. The default sits just
        // above the game's monster hover panel (UIContextInfo), which shares this corner.
        private Vector2 InitialPosition(GameObject canvas)
        {
            var saved = new Vector2(configPanelX.Value, configPanelY.Value);
            if (!Mathf.Approximately(saved.x, DefaultPanelX) || !Mathf.Approximately(saved.y, DefaultPanelY))
                return saved;

            var hover = UIContextInfo.singleton != null && UIContextInfo.singleton.panel != null
                ? UIContextInfo.singleton.panel.GetComponent<RectTransform>()
                : null;
            // The canvas scales its children by its scale factor, so canvas units are world units divided by that scale.
            var scale = canvas.transform.lossyScale.y;
            if (hover == null || scale <= 0f)
                return saved;

            var corners = new Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppStructArray<Vector3>(4);
            hover.GetWorldCorners(corners);
            var hoverTop = corners[1].y / scale;
            return new Vector2(saved.x, Mathf.Max(saved.y, hoverTop + HoverPanelGap));
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
                    trackedBosses.Clear();
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

            // Zones load and monsters spawn while the player walks, so the monster list is
            // refreshed on a timer as well as on entering the scene.
            bool sceneChanged = lastSceneName != currentScene;
            if (cachedMonsters == null || sceneChanged || Time.unscaledTime >= nextMonsterRefresh)
            {
                cachedMonsters = UnityEngine.Object.FindObjectsOfType(Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Monster>());
                nextMonsterRefresh = Time.unscaledTime + MonsterRefreshSeconds;
                lastSceneName = currentScene;
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
            if (cachedNetworkManager == null && !reportedMissingNetworkManager)
            {
                LoggerInstance.Error("NetworkManagerMMO not found, so server time is unknown. Respawn countdowns are off.");
                reportedMissingNetworkManager = true;
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
                var monster = obj.TryCast<Il2Cpp.Monster>();
                if (monster == null)
                    continue;

                bool isDead = monster.health != null && monster.health.current <= 0;
                bool isTrackable = monster.isBoss || monster.isElite || monster.isFabled;

                // Track bosses and elites (both alive and dead)
                if (isTrackable)
                {
                    if (isDead)
                    {
                        // Track dead bosses/elites
                        if (hasServerTime && monster.respawn && monster.respawnTimeEnd > currentTime)
                        {
                            var info = Track(monster);
                            info.isAlive = false;
                            info.respawnTime = monster.respawnTimeEnd;
                        }
                    }
                    else
                    {
                        Track(monster).isAlive = true;
                    }
                }
            }

            // Update tracker UI (only if we have server time)
            if (hasServerTime)
            {
                UpdateTrackerUI(currentTime);
            }
        }

        private BossInfo Track(Il2Cpp.Monster monster)
        {
            if (!trackedBosses.TryGetValue(monster.netId, out var info))
            {
                info = new BossInfo();
                trackedBosses[monster.netId] = info;
            }

            info.nameEntity = monster.nameEntity;
            info.level = monster.level != null ? monster.level.current : 1;
            info.isBoss = monster.isBoss;
            info.isElite = monster.isElite;
            info.isFabled = monster.isFabled;
            info.position = monster.transform.position;
            return info;
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
            text += Rule + "\n";

            // Alive section
            if (aliveBosses.Count > 0)
            {
                text += "<color=#00FF00><b>▼ ALIVE (" + aliveBosses.Count + ")</b></color> - By distance\n\n";

                foreach (var boss in aliveBosses)
                {
                    text += $"<color={TierColor(boss)}>{TierSymbol(boss)} <b>{TierLabel(boss)} {GameText.EntityName(boss.nameEntity)}</b></color> | ";
                    text += $"<color=#FFD700>Lvl {boss.level}</color>";

                    if (hasPlayerPos)
                    {
                        text += " | " + DistanceText(playerPos, boss.position);
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
                    text += Rule;
                }

                text += "<color=#FF4444><b>▼ RESPAWNING (" + deadBosses.Count + ")</b></color> - By time\n\n";

                foreach (var boss in deadBosses)
                {
                    double timeLeft = boss.respawnTime - currentTime;
                    if (timeLeft > 0)
                    {
                        int minutes = (int)(timeLeft / 60);
                        int seconds = (int)(timeLeft % 60);

                        // The game's fonts have no skull glyph, so a dead entry is marked with a dagger.
                        text += $"<color={TierColor(boss)}>† <b>{TierLabel(boss)} {GameText.EntityName(boss.nameEntity)}</b></color> | ";
                        text += $"<color=#FFD700>Lvl {boss.level}</color> | ";
                        text += $"<color=#FF8888>{minutes:00}:{seconds:00}</color>";

                        if (hasPlayerPos)
                        {
                            text += " | " + DistanceText(playerPos, boss.position);
                        }

                        text += "\n";
                    }
                }
            }

            GameText.ApplyFont(trackerText);
            trackerText.text = text;

            // The panel grows upward from its bottom anchor to fit the list, up to the configured height.
            var height = Mathf.Min(configPanelHeight.Value, trackerText.preferredHeight + 2f * TextPadding);
            panelRectTransform.sizeDelta = new Vector2(configPanelWidth.Value, height);
        }

        // Fabled outranks boss, and boss outranks elite, whatever other flags a monster carries.
        private static string TierLabel(BossInfo boss) => boss.isFabled ? "[Fabled]" : boss.isBoss ? "[Boss]" : "[Elite]";

        private static string TierSymbol(BossInfo boss) => boss.isFabled ? "◇" : boss.isBoss ? "★" : "◆";

        private static string TierColor(BossInfo boss) =>
            boss.isFabled ? "#" + ColorUtility.ToHtmlStringRGB(Il2Cpp.Utils.fabledMonsterColor) : boss.isBoss ? "#00FFFF" : "#CC66FF";

        // The game measures ranges in yd, one world unit each.
        private string DistanceText(Vector3 from, Vector3 to) =>
            $"{Vector3.Distance(from, to):F0} yd {GetDirectionWithDegrees(from, to)}";

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
