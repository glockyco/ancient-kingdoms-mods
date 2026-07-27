using System;
using System.Reflection;
using HarmonyLib;
using Il2CppInterop.Runtime.Injection;
using MelonLoader;

[assembly: MelonInfo(typeof(FieldDefaultValueHookFix.FieldDefaultValueHookFix), "FieldDefaultValueHookFix", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace FieldDefaultValueHookFix;

/// <summary>
/// Il2CppInterop resolves <c>Class::GetDefaultFieldValue</c> by scanning GameAssembly.dll for a
/// short list of hardcoded byte signatures. On this game build that scan matches an unrelated
/// function, so the detour lands on the wrong code and the process dies with an
/// AccessViolationException inside <c>Class_GetFieldDefaultValue_Hook.Hook</c> the first time the
/// game touches it (world entry).
///
/// Il2CppInterop already ships a signature-free fallback that walks the
/// <c>il2cpp_field_static_get_value</c> export down to the real function. This mod forces that
/// fallback by post-processing <c>FindTargetMethod</c>.
///
/// The patch has to be installed before the first Il2Cpp type injection, which is what installs
/// the hook. Injection happens while the support module comes up, before <c>OnInitializeMelon</c>
/// runs, so the patch goes in <see cref="OnEarlyInitializeMelon"/> and uses its own Harmony
/// instance rather than the melon's.
/// </summary>
public class FieldDefaultValueHookFix : MelonMod
{
    private const string HookTypeName = "Il2CppInterop.Runtime.Injection.Hooks.Class_GetFieldDefaultValue_Hook";
    private const string XrefMethodName = "FindClassGetFieldDefaultValueXref";

    private static MethodInfo? _xrefFinder;
    private static MelonLogger.Instance? _log;

    public override void OnEarlyInitializeMelon()
    {
        _log = LoggerInstance;

        var hookType = typeof(ClassInjector).Assembly.GetType(HookTypeName);
        if (hookType == null)
        {
            LoggerInstance.Error($"{HookTypeName} not found — Il2CppInterop layout changed, leaving the hook alone.");
            return;
        }

        var findTargetMethod = hookType.GetMethod("FindTargetMethod", BindingFlags.Instance | BindingFlags.Public);
        if (findTargetMethod == null)
        {
            LoggerInstance.Error("Class_GetFieldDefaultValue_Hook.FindTargetMethod not found — leaving the hook alone.");
            return;
        }

        _xrefFinder = hookType.GetMethod(XrefMethodName, BindingFlags.Static | BindingFlags.NonPublic);
        if (_xrefFinder == null)
        {
            LoggerInstance.Error($"{XrefMethodName} not found — leaving the hook alone.");
            return;
        }

        var postfix = typeof(FieldDefaultValueHookFix)
            .GetMethod(nameof(UseXrefResult), BindingFlags.Static | BindingFlags.NonPublic);
        new HarmonyLib.Harmony("ancientkingdoms.fielddefaultvaluehookfix")
            .Patch(findTargetMethod, postfix: new HarmonyMethod(postfix));
        LoggerInstance.Msg("Class::GetDefaultFieldValue resolution redirected to xref traversal.");
    }

    private static void UseXrefResult(ref IntPtr __result)
    {
        var fromSignature = __result;
        IntPtr fromXref;
        try
        {
            fromXref = (IntPtr)_xrefFinder!.Invoke(null, new object[] { false })!;
        }
        catch (Exception ex)
        {
            _log?.Error($"Xref traversal for Class::GetDefaultFieldValue failed, keeping the signature match 0x{fromSignature.ToInt64():X}.", ex);
            return;
        }

        if (fromXref == IntPtr.Zero)
        {
            _log?.Warning($"Xref traversal returned null, keeping the signature match 0x{fromSignature.ToInt64():X}.");
            return;
        }

        _log?.Msg($"Class::GetDefaultFieldValue signature=0x{fromSignature.ToInt64():X} xref=0x{fromXref.ToInt64():X}");
        __result = fromXref;
    }
}
