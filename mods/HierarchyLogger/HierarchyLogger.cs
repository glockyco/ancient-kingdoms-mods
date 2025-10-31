using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.InputSystem;
using System.IO;
using System.Text;

[assembly: MelonInfo(typeof(HierarchyLogger.HierarchyLogger), "HierarchyLogger", "0.1.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace HierarchyLogger
{
    public class HierarchyLogger : MelonMod
    {
        public override void OnInitializeMelon()
        {
            LoggerInstance.Msg("HierarchyLogger initialized! Press F9 to dump hierarchy.");
        }

        public override void OnUpdate()
        {
            // Only run in the World scene
            string currentScene = SceneManager.GetActiveScene().name;
            if (currentScene != "World")
            {
                return;
            }

            // Press F9 to dump hierarchy
            if (Keyboard.current != null && Keyboard.current.f9Key.wasPressedThisFrame)
            {
                DumpHierarchy();
            }
        }

        private void DumpHierarchy()
        {
            var sb = new StringBuilder();
            sb.AppendLine("=== WORLD SCENE HIERARCHY ===");
            sb.AppendLine($"Time: {System.DateTime.Now}");
            sb.AppendLine();

            // Get all root GameObjects in the scene
            var scene = SceneManager.GetActiveScene();
            var rootObjects = scene.GetRootGameObjects();

            sb.AppendLine($"Total root objects: {rootObjects.Length}");
            sb.AppendLine();

            foreach (var root in rootObjects)
            {
                DumpGameObject(root, sb, 0);
            }

            // Also find all objects with FogOfWar components by searching all Component types
            sb.AppendLine();
            sb.AppendLine("=== FOG OF WAR COMPONENTS ===");
            sb.AppendLine();

            var allObjects = UnityEngine.Object.FindObjectsOfType<GameObject>();
            int fogCount = 0;
            foreach (var obj in allObjects)
            {
                var components = obj.GetComponents<Component>();
                foreach (var comp in components)
                {
                    if (comp != null && comp.GetType().Name.Contains("Fog", System.StringComparison.OrdinalIgnoreCase))
                    {
                        sb.AppendLine($"  - {GetFullPath(obj)} -> {comp.GetType().FullName} (active: {obj.activeInHierarchy})");
                        fogCount++;
                    }
                }
            }
            sb.AppendLine($"Total fog-related components found: {fogCount}");
            sb.AppendLine();

            // Save to file
            string logPath = Path.Combine(Application.dataPath, "..", "hierarchy_dump.txt");
            File.WriteAllText(logPath, sb.ToString());

            LoggerInstance.Msg($"Hierarchy dumped to: {logPath}");
            LoggerInstance.Msg($"Found {rootObjects.Length} root objects");
        }

        private void DumpGameObject(GameObject obj, StringBuilder sb, int depth)
        {
            string indent = new string(' ', depth * 2);

            // Check if object or any parent contains "Fog" in name
            bool isFogRelated = obj.name.Contains("Fog", System.StringComparison.OrdinalIgnoreCase);

            // Get components
            var components = obj.GetComponents<Component>();
            string componentsStr = "";
            foreach (var comp in components)
            {
                if (comp != null)
                {
                    string typeName = comp.GetType().Name;
                    if (typeName.Contains("Fog", System.StringComparison.OrdinalIgnoreCase))
                    {
                        isFogRelated = true;
                    }
                    componentsStr += $"{typeName}, ";
                }
            }
            if (componentsStr.Length > 0)
            {
                componentsStr = componentsStr.Substring(0, componentsStr.Length - 2); // Remove trailing comma
            }

            // Mark fog-related objects
            string marker = isFogRelated ? " [***FOG***]" : "";

            sb.AppendLine($"{indent}{obj.name} (active: {obj.activeInHierarchy}){marker}");
            if (componentsStr.Length > 0)
            {
                sb.AppendLine($"{indent}  Components: {componentsStr}");
            }

            // Recursively dump children
            for (int i = 0; i < obj.transform.childCount; i++)
            {
                var child = obj.transform.GetChild(i).gameObject;
                DumpGameObject(child, sb, depth + 1);
            }
        }

        private string GetFullPath(GameObject obj)
        {
            string path = obj.name;
            Transform current = obj.transform.parent;
            while (current != null)
            {
                path = current.name + "/" + path;
                current = current.parent;
            }
            return path;
        }
    }
}
