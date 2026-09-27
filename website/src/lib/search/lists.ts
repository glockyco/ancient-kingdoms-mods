/**
 * Search results that open an overview table with one filter applied. The
 * tables read `{urlKey}.{column}=value` from the URL on mount, so each href
 * lands on the filtered list. Names are reviewed plurals in the game's terms;
 * `aliases` are extra words that should find the list.
 */
export type ListFilter =
  | { readonly kind: "item-slot"; readonly value: string }
  | { readonly kind: "item-type"; readonly value: string }
  | { readonly kind: "npc-role"; readonly value: string }
  | { readonly kind: "monster-class"; readonly value: string };

export interface FilteredList {
  readonly name: string;
  readonly filter: ListFilter;
  readonly aliases?: string;
}

const TABLES: Record<
  ListFilter["kind"],
  { page: string; urlKey: string; column: string; label: string }
> = {
  "item-slot": {
    page: "/items",
    urlKey: "items",
    column: "slot",
    label: "Item list",
  },
  "item-type": {
    page: "/items",
    urlKey: "items",
    column: "item_type",
    label: "Item list",
  },
  "npc-role": {
    page: "/npcs",
    urlKey: "npcs",
    column: "role_keys",
    label: "NPC list",
  },
  "monster-class": {
    page: "/monsters",
    urlKey: "monsters",
    column: "classification",
    label: "Monster list",
  },
};

export function listHref(filter: ListFilter): string {
  const table = TABLES[filter.kind];
  const params = new URLSearchParams({
    [`${table.urlKey}.${table.column}`]: filter.value,
  });
  return `${table.page}?${params.toString()}`;
}

/** The overview that a list result filters, for the row's type label. */
export function listTableLabel(filter: ListFilter): string {
  return TABLES[filter.kind].label;
}

const slot = (value: string, name: string, aliases?: string): FilteredList => ({
  name,
  filter: { kind: "item-slot", value },
  aliases,
});
const itemType = (
  value: string,
  name: string,
  aliases?: string,
): FilteredList => ({ name, filter: { kind: "item-type", value }, aliases });
const role = (value: string, name: string, aliases: string): FilteredList => ({
  name,
  filter: { kind: "npc-role", value },
  aliases,
});
const monsterClass = (value: string, name: string): FilteredList => ({
  name,
  filter: { kind: "monster-class", value },
});

export const FILTERED_LISTS: readonly FilteredList[] = [
  slot("Ammo", "Ammunition", "arrows"),
  slot("Artifact", "Artifacts"),
  slot("Belt", "Belts"),
  slot("Bow", "Bows"),
  slot("Bracers", "Bracers"),
  slot("Charm", "Charms"),
  slot("Chest", "Chest Armor"),
  slot("Ear", "Earrings"),
  slot("Feet", "Feet Armor", "boots"),
  slot("Fishing Rod", "Fishing Rods"),
  slot("Hands", "Hand Armor", "gloves"),
  slot("Head", "Head Armor", "helmets helms"),
  slot("Instrument", "Instruments"),
  slot("Legs", "Leg Armor", "leggings pants"),
  slot("Neck", "Necklaces", "amulets"),
  slot("Pickaxe", "Pickaxes"),
  slot("Ring", "Rings"),
  slot("Shield", "Shields"),
  slot("Shovel", "Shovels"),
  slot("WeaponDagger", "1H Weapons (Light)", "daggers"),
  slot("WeaponSword", "1H Weapons", "one-handed swords"),
  slot("WeaponSword2H", "2H Weapons", "two-handed"),
  slot("WeaponWand", "Casting Weapons", "wands staves"),
  itemType("augment", "Augments"),
  itemType("backpack", "Backpacks", "bags"),
  itemType("book", "Books", "lore"),
  itemType("costume", "Costumes"),
  itemType("food", "Food"),
  itemType("fragment", "Fragments", "fatecharm"),
  itemType("mount", "Mounts"),
  itemType("pet", "Pet Whistles", "pets"),
  itemType("potion", "Potions"),
  itemType("recipe", "Recipe Items"),
  itemType("relic", "Relics"),
  itemType("scroll", "Scrolls"),
  itemType("structure", "Furniture", "structures"),
  itemType("travel", "Travel Items"),
  itemType("treasure_map", "Treasure Maps"),
  role("is_quest_giver", "Quest Givers", "quest giver"),
  role("is_taskgiver_adventurer", "Daily Quest Givers", "daily quests dailies"),
  role("is_merchant", "Merchants", "merchant vendor shop"),
  role(
    "is_merchant_adventurer",
    "Adventurers' Guild Merchants",
    "adv merchant",
  ),
  role("is_faction_vendor", "Faction Vendors", "faction vendor"),
  role("is_essence_trader", "Essence Traders", "essence trader"),
  role("is_bank", "Bankers", "banker bank"),
  role("can_repair_equipment", "Repair NPCs", "repairs"),
  role("is_skill_master", "Skill Masters", "skill master trainer"),
  role("is_veteran_master", "Veteran Masters", "veteran master"),
  role("is_reset_attributes", "Attribute Reset NPCs", "attribute reset"),
  role("is_soul_binder", "Soul Binders", "soul binder"),
  role("is_barber", "Barbers", "barber"),
  role("is_inkeeper", "Innkeepers", "innkeeper inn"),
  role(
    "is_recruiter_mercenaries",
    "Mercenary Recruiters",
    "mercenary recruiter",
  ),
  role("is_guild_management", "Guild Managers", "guild manager"),
  role("is_priestess", "Priestesses", "priestess"),
  role("is_augmenter", "Augmenters", "augmenter"),
  role("is_guard", "Guards", "guard"),
  role("is_renewal_sage", "Renewal Sages", "renewal sage"),
  role("is_teleporter", "Teleporters", "teleporter"),
  monsterClass("boss", "Bosses"),
  monsterClass("fabled", "Fabled Monsters"),
  monsterClass("elite", "Elite Monsters"),
];
