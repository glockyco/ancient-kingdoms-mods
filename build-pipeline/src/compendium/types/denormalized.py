"""TypedDict definitions for denormalized data structures.

These types define the JSON structures stored in denormalized fields
on the items and skills tables.
"""

from typing import NotRequired, TypedDict


class DropInfo(TypedDict):
    """Monster drop information for items.dropped_by."""

    monster_id: str
    monster_name: str
    monster_level: int
    is_boss: bool
    is_elite: bool
    rate: float


class GatherDropInfo(TypedDict):
    """Gathering source information for items.gathered_from."""

    gather_item_id: str
    gather_item_name: str
    rate: float
    type: str  # "resource" or "chest"
    rate_note: NotRequired[str]  # Explanation for variable rates
    zone_id: NotRequired[str]
    zone_name: NotRequired[str]
    key_required_id: NotRequired[str]
    key_name: NotRequired[str]
    amount_min: NotRequired[int]
    amount_max: NotRequired[int]
    position_x: NotRequired[float]
    position_y: NotRequired[float]


class ChestSourceInfo(TypedDict):
    """Chest source information for items.found_in_chests."""

    chest_id: str
    chest_name: str
    rate: float


class SoldByInfo(TypedDict):
    """Vendor information for items.sold_by."""

    npc_id: str
    npc_name: str
    npc_faction: str | None
    is_faction_vendor: bool
    price: int
    currency_item_id: str | None
    currency_item_name: str | None


class RewardedByInfo(TypedDict):
    """Quest reward information for items.rewarded_by."""

    quest_id: str
    quest_name: str
    level_required: int
    level_recommended: int
    is_repeatable: NotRequired[bool]
    class_restrictions: NotRequired[list[str] | None]


class ProvidedByQuestInfo(TypedDict):
    """Quest provided item information for items.provided_by_quests."""

    quest_id: str
    quest_name: str
    level_required: int
    level_recommended: int
    is_repeatable: NotRequired[bool]
    class_restrictions: NotRequired[list[str] | None]


class MaterialInfo(TypedDict):
    """Recipe material information."""

    item_id: str
    item_name: str
    amount: int


class CraftedFromInfo(TypedDict):
    """Crafting recipe information for items.crafted_from."""

    recipe_id: str
    result_amount: int
    materials: list[MaterialInfo]


class UsedInRecipeInfo(TypedDict):
    """Recipe usage information for items.used_in_recipes."""

    recipe_id: str
    result_item_id: str
    result_item_name: str
    amount: int


class NeededForQuestInfo(TypedDict):
    """Quest requirement information for items.needed_for_quests."""

    quest_id: str
    quest_name: str
    level_required: int
    level_recommended: int
    purpose: str  # "gather", "required", "equip"
    amount: int
    is_repeatable: NotRequired[bool]
    class_restrictions: NotRequired[list[str] | None]


class GrantedByItemInfo(TypedDict):
    """Item source information for skills.granted_by_items."""

    item_id: str
    item_name: str
    type: str  # "potion_buff", "food_buff", "scroll", "weapon_proc", "relic_buff"
    level: NotRequired[int]
    probability: NotRequired[float]


class MonsterDropInfo(TypedDict):
    """Item drop information for monsters.drops (denormalized with item name)."""

    item_id: str
    item_name: str
    rate: float
