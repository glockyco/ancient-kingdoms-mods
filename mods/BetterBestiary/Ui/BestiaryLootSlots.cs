using Il2Cpp;

namespace BetterBestiary.Ui;

internal static class BestiaryLootSlots
{
    internal static UIBestiaryLoot[] From(UIBestiaryDetail detail) =>
    [
        detail.loot0,
        detail.loot1,
        detail.loot2,
        detail.loot3,
        detail.loot4,
        detail.loot5,
        detail.loot6,
        detail.loot7,
        detail.loot8,
        detail.loot9,
        detail.loot10,
        detail.loot11,
    ];
}
