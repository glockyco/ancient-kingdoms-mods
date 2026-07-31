"""TypedDict definitions for denormalized data structures.

These types define the intermediate structures the denormalizers build before
writing them to junction tables, plus the JSON structures still stored on the
skills table.
"""

from typing import NotRequired, TypedDict


class ChestSourceInfo(TypedDict):
    """One chest-type item that can yield an item, for item_sources_random."""

    chest_id: str
    chest_name: str
    rate: float


class MaterialInfo(TypedDict):
    """Recipe material information."""

    item_id: str
    item_name: str
    amount: int


class GrantedByItemInfo(TypedDict):
    """Item source information for skills.granted_by_items."""

    item_id: str
    item_name: str
    type: str  # "potion_buff", "food_buff", "scroll", "weapon_proc", "relic_buff"
    level: NotRequired[int]
    probability: NotRequired[float]
