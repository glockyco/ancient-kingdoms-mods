using MelonLoader;

[assembly: MelonInfo(typeof(BossMod.BossMod), "BossMod", "0.1.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossMod;

public class BossMod : MelonMod
{
    public override void OnInitializeMelon()
    {
        LoggerInstance.Msg("BossMod initialized (skeleton)");
    }
}
