using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;
using Il2Cpp;
using Il2CppInterop.Runtime.InteropTypes;
using Il2CppFoW;

[assembly: MelonInfo(typeof(MapEnhancer.MapEnhancer), "MapEnhancer", "0.1.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace MapEnhancer
{
    public class MapEnhancer : MelonMod
    {
        private Il2CppSystem.Object[] cachedMonsters = null;
        private string lastSceneName = "";
        private Vector3 lastPlayerPosition = Vector3.zero;
        private const float TELEPORT_DISTANCE_THRESHOLD = 50f;
        private bool fogCleared = false;

        public override void OnInitializeMelon()
        {
            LoggerInstance.Msg("MapEnhancer initialized!");
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
                    fogCleared = false;
                }
                lastSceneName = currentScene;
                return;
            }

            // Enable Veteran Awareness and remove fog of war
            var player = Il2Cpp.Player.localPlayer;
            if (player != null)
            {
                if (!player.hasVeteranAwareness)
                {
                    player.hasVeteranAwareness = true;
                }

                if (!fogCleared)
                {
                    var fogManagerObj = GameObject.Find("FogOfWarManager");
                    if (fogManagerObj != null)
                    {
                        var fogTeam = fogManagerObj.GetComponent<FogOfWarTeam>();
                        if (fogTeam != null)
                        {
                            fogTeam.SetAll(FogOfWarValueType.Visible, 0);
                            fogTeam.SetAll(FogOfWarValueType.Partial, 0);
                            fogCleared = true;
                        }
                    }
                }
            }

            // Refresh cache on scene change or teleport
            bool sceneChanged = lastSceneName != currentScene;

            bool playerTeleported = false;
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

            // Enable map marks for all monsters with color coding
            var monsters = cachedMonsters;

            foreach (var obj in monsters)
            {
                var monster = obj.Cast<Il2Cpp.Monster>();

                if (monster.hasMinimapMark && monster.minimapMark != null)
                {
                    bool isDead = monster.health != null && monster.health.current <= 0;
                    bool isBossOrElite = monster.isBoss || monster.isElite;

                    // Show dead bosses/elites with greyed out icon, hide regular dead monsters
                    if (isDead)
                    {
                        if (isBossOrElite)
                        {
                            monster.minimapMark.enabled = true;
                            monster.minimapMark.gameObject.SetActive(true);
                            monster.minimapMark.color = new Color(0.3f, 0.3f, 0.3f, 0.5f); // Grey
                        }
                        else
                        {
                            monster.minimapMark.enabled = false;
                        }
                        continue;
                    }

                    // Force everything to be visible
                    monster.minimapMark.enabled = true;
                    monster.minimapMark.gameObject.SetActive(true);

                    // Enable parent if it exists
                    if (monster.minimapMark.transform.parent != null)
                    {
                        monster.minimapMark.transform.parent.gameObject.SetActive(true);
                    }

                    // Set color based on monster type
                    Color color;
                    if (monster.isBoss)
                    {
                        color = new Color(0f, 1f, 1f, 1f); // Cyan for bosses
                    }
                    else if (monster.isElite)
                    {
                        color = monster.minimapMark.color;
                        color.a = 1f;
                    }
                    else
                    {
                        color = monster.minimapMark.color;
                        color.a = 1f;
                    }
                    monster.minimapMark.color = color;
                }
            }
        }
    }
}
