"""Pydantic models for validating game data exports.

These models match the JSON structure exported by the C# DataExporter mod.
"""

from typing import Any
from pydantic import BaseModel, Field


# =============================================================================
# Common Models
# =============================================================================


class Position(BaseModel):
    """3D position in world space."""

    x: float
    y: float
    z: float


class BoundingBox(BaseModel):
    """2D bounding box for collider bounds."""

    min_x: float
    min_y: float
    max_x: float
    max_y: float


# =============================================================================
# Monster Models
# =============================================================================


class MonsterDrop(BaseModel):
    """Item drop from a monster."""

    item_id: str
    rate: float = Field(ge=0.0, le=1.0)


class MonsterSpawnData(BaseModel):
    """Monster spawn point from monster_spawns.json"""

    id: str
    monster_id: str
    zone_id: str
    sub_zone_id: str | None = None
    position: Position

    # Level of this specific spawn (may differ from canonical monster)
    level: int = 0

    # Movement and patrol
    move_probability: float = 0.0
    move_distance: float = 0.0
    is_patrolling: bool = False
    patrol_waypoints: list[Any] = []


class MonsterData(BaseModel):
    """Monster data from monsters.json"""

    # Identity
    id: str
    name: str

    # Base stats
    level: int
    health: int
    type_name: str
    class_name: str
    zone_bestiary: str = ""  # Manually set zone name for bestiary display

    # Combat stats (calculated at base level)
    damage: int = 0
    magic_damage: int = 0
    defense: int = 0
    magic_resist: int = 0
    poison_resist: int = 0
    fire_resist: int = 0
    cold_resist: int = 0
    disease_resist: int = 0
    block_chance: float = 0.0
    critical_chance: float = 0.0
    accuracy: float = 0.0

    # Stat scaling (LinearInt/LinearFloat: actual = base + per_level * (level - 1))
    health_base: int = 0
    health_per_level: int = 0
    health_multiplier: float = 1.0
    damage_base: int = 0
    damage_per_level: int = 0
    magic_damage_base: int = 0
    magic_damage_per_level: int = 0
    defense_base: int = 0
    defense_per_level: int = 0
    magic_resist_base: int = 0
    magic_resist_per_level: int = 0
    poison_resist_base: int = 0
    poison_resist_per_level: int = 0
    fire_resist_base: int = 0
    fire_resist_per_level: int = 0
    cold_resist_base: int = 0
    cold_resist_per_level: int = 0
    disease_resist_base: int = 0
    disease_resist_per_level: int = 0
    block_chance_base: float = 0.0
    block_chance_per_level: float = 0.0
    critical_chance_base: float = 0.0
    critical_chance_per_level: float = 0.0
    accuracy_base: float = 0.0
    accuracy_per_level: float = 0.0

    # Mana scaling
    mana: int = 0
    mana_base: int = 0
    mana_per_level: int = 0

    # Movement and detection
    speed: float = 0.0
    aggro_range: float = 0.0

    # Classification flags
    is_boss: bool = False
    is_world_boss: bool = False
    is_elite: bool = False
    is_fabled: bool = False
    is_hunt: bool = False
    is_dummy: bool = False
    is_summonable: bool = False
    is_halloween: bool = False
    is_forgotten_altar_event: bool = False

    # Combat flags
    see_invisibility: bool = False
    is_immune_debuffs: bool = False
    yell_friends: bool = False
    flee_on_low_hp: bool = False
    no_aggro_monster: bool = False
    has_aura: bool = False
    follow_distance: float = 0.0

    # Spawning and respawn
    does_respawn: bool = True
    death_time: float = 0.0
    respawn_time: float = 0.0
    respawn_probability: float = 1.0
    spawn_time_start: int = 0
    spawn_time_end: int = 0
    placeholder_spawn_probability: float = 0.0
    placeholder_monster_id: str | None = None

    # Loot and rewards
    gold_min: int = 0
    gold_max: int = 0
    probability_drop_gold: float = 1.0
    exp_multiplier: float = 1.0
    drops: list[MonsterDrop] = []

    # Messages and interactions
    aggro_messages: list[str] = []
    aggro_message_probability: float = 0.0
    summon_message: str = ""

    # Faction changes
    improve_faction: list[str] = []
    decrease_faction: list[str] = []

    # Lore (boss-specific)
    lore_boss: str = ""

    # Skills (skill_ids[0] is default attack, [1+] are special abilities)
    skill_ids: list[str] = []


# =============================================================================
# Pet Models (familiars, animal pets, mercenaries from pets.json)
# =============================================================================


class PetData(BaseModel):
    """Pet data from pets.json (familiars, animal pets, and mercenaries)."""

    id: str
    name: str
    is_mercenary: bool = False
    is_familiar: bool = False
    type_monster: str
    level: int
    health: int = 0
    damage: int = 0
    magic_damage: int = 0
    defense: int = 0
    magic_resist: int = 0
    poison_resist: int = 0
    fire_resist: int = 0
    cold_resist: int = 0
    disease_resist: int = 0
    block_chance: float = 0.0
    critical_chance: float = 0.0
    has_buffs: bool = False
    has_heals: bool = False
    icon_path: str
    skill_ids: list[str] = []


# =============================================================================
# Item Models
# =============================================================================


class ChestReward(BaseModel):
    """Reward from opening a chest."""

    item_id: str
    probability: float


class ItemData(BaseModel):
    """Item data from items.json"""

    id: str
    name: str
    item_type: str
    quality: int  # 0-4 (Common, Uncommon, Magic, Epic, Legendary)
    level_required: int = 0
    class_required: list[str] = []
    faction_required_to_buy: int = 0
    adventuring_level_needed: float = 0.0
    is_key: bool = False
    ignore_journal: bool = False
    is_chest_key: bool = False
    has_gather_quest: bool = False
    max_stack: int = 1
    buy_price: int = 0
    sell_price: int = 0
    buy_token_id: str | None = None
    sellable: bool = True
    tradable: bool = True
    destroyable: bool = True
    is_quest_item: bool = False
    infinite_charges: bool = False
    cooldown: float = 0.0
    cooldown_category: str | None = None
    icon_path: str = ""
    tooltip: str = ""

    # Consumable properties
    usage_health: int = 0
    usage_mana: int = 0
    usage_energy: int = 0
    usage_experience: int = 0
    usage_pet_health: int = 0
    potion_buff_level: int = 0
    food_buff_level: int = 0
    book_strength_gain: int = 0
    book_dexterity_gain: int = 0
    book_constitution_gain: int = 0
    book_intelligence_gain: int = 0
    book_wisdom_gain: int = 0
    book_charisma_gain: int = 0
    is_repair_kit: bool = False
    mount_speed: float = 0.0
    backpack_slots: int = 0
    travel_zone_id: int = 0
    pack_final_amount: int = 0

    # Pack/chest/weapon/relic properties
    pack_final_item_id: str | None = None
    chest_num_items: int = 0
    relic_buff_id: str | None = None
    relic_buff_level: int = 0
    structure_price: int = 0
    weapon_delay: int = 0
    weapon_proc_effect_probability: float = 0.0
    fragment_amount_needed: int = 0

    # Equipment properties (continued)
    slot: str = ""  # e.g., "Ammo", "Head", "Chest"
    weapon_category: str = ""  # e.g., "Ammo", "Sword", "Bow"
    stats: dict[
        str, Any
    ] = {}  # Equipment stats (strength, constitution, defense, etc.)

    # Consumable/special item properties (continued)
    potion_buff_id: str | None = None  # Buff applied by potion (e.g., "bandages")
    food_buff_id: str | None = None  # Buff applied by food (e.g., "burning_tempest")
    food_type: str | None = None  # Type of food (e.g., "Drink")
    potion_buff_allow_dungeon: bool = (
        True  # Whether potion's buff is allowed in dungeons
    )
    food_buff_allow_dungeon: bool = True  # Whether food's buff is allowed in dungeons
    scroll_skill_allow_dungeon: bool = (
        True  # Whether scroll's skill is allowed in dungeons
    )
    relic_buff_allow_dungeon: bool = True  # Whether relic's buff is allowed in dungeons
    scroll_skill_id: str | None = None  # Skill granted by scroll (e.g., "blushburst")
    book_text: str | None = None  # Lore text for books

    # Item generation/crafting
    random_items: list[str] = []  # Pool of random items (e.g., gem types)
    fragment_result_item_id: str | None = None  # Item created when fragments combine
    merge_items_needed_ids: list[str] = []  # Items required for merge
    merge_result_item_id: str | None = None  # Item created from merge

    # Augment properties
    augment_armor_set_item_ids: list[str] = []  # Items in armor set
    augment_armor_set_name: str | None = None  # Display name of armor set
    augment_skill_bonuses: list[
        Any
    ] = []  # Skill bonuses from set (e.g., [{'skill_id': 'tactics_of_war', 'level_bonus': 1}])
    recipe_potion_learned_id: str | None = None  # Potion unlocked by recipe

    # Weapon properties
    weapon_proc_effect_id: str | None = (
        None  # Effect triggered on hit (e.g., "plaguebringer_touch")
    )
    weapon_required_ammo_id: str | None = None  # Ammo type required (e.g., "arrow")

    # Travel item properties
    travel_destination: Position | None = None  # Teleport coordinates
    travel_destination_name: str | None = None  # Display name of destination

    # Treasure map properties
    treasure_map_image_location: str | None = (
        None  # Image identifier (e.g., "TreasureMap4")
    )
    treasure_map_reward_id: str | None = None  # Reward chest item ID

    # Chest rewards
    chest_rewards: list[ChestReward] = []


# =============================================================================
# NPC Models
# =============================================================================


class NpcItemSale(BaseModel):
    """Item sold by NPC."""

    item_id: str
    price: int
    currency_item_id: str | None = None


class NpcRoles(BaseModel):
    """NPC roles/functions."""

    is_merchant: bool = False
    is_quest_giver: bool = False
    can_repair_equipment: bool = False
    is_bank: bool = False
    is_skill_master: bool = False
    is_veteran_master: bool = False
    is_reset_attributes: bool = False
    is_soul_binder: bool = False
    is_inkeeper: bool = False
    is_taskgiver_adventurer: bool = False
    is_merchant_adventurer: bool = False
    is_recruiter_mercenaries: bool = False
    is_guard: bool = False
    is_faction_vendor: bool = False
    is_essence_trader: bool = False
    is_priestess: bool = False
    is_augmenter: bool = False


class NpcSpawnData(BaseModel):
    """NPC spawn point from npc_spawns.json"""

    id: str
    npc_id: str
    zone_id: str
    sub_zone_id: str | None = None
    position: Position

    # Movement and patrol (location-specific)
    origin_follow_position: Position | None = None
    follow_distance: float = 0.0
    move_distance: float = 0.0
    move_probability: float = 0.0
    patrol_waypoints: list[Any] = []

    # Teleport (spawn-specific destination for teleporter NPCs)
    teleport_zone_id: str | None = None
    teleport_destination: Position | None = None
    teleport_price: int = 0
    teleport_message: str | None = None


class NpcData(BaseModel):
    """NPC data from npcs.json"""

    id: str
    name: str
    faction: str | None = None
    race: str | None = None

    # Roles
    roles: NpcRoles = NpcRoles()

    # What they offer
    quests_offered: list[str] = []
    items_sold: list[NpcItemSale] = []

    # Base stats
    level: int = 1
    health: int = 0
    mana: int = 0

    # Combat stats (calculated at base level)
    damage: int = 0
    magic_damage: int = 0
    defense: int = 0
    magic_resist: int = 0
    poison_resist: int = 0
    fire_resist: int = 0
    cold_resist: int = 0
    disease_resist: int = 0
    block_chance: float = 0.0
    critical_chance: float = 0.0
    accuracy: float = 0.0

    # Stat scaling (LinearInt: actual = base + bonus_per_level * (level - 1))
    health_base: int = 0
    health_per_level: int = 0
    mana_base: int = 0
    mana_per_level: int = 0
    damage_base: int = 0
    damage_per_level: int = 0
    magic_damage_base: int = 0
    magic_damage_per_level: int = 0
    defense_base: int = 0
    defense_per_level: int = 0
    magic_resist_base: int = 0
    magic_resist_per_level: int = 0
    poison_resist_base: int = 0
    poison_resist_per_level: int = 0
    fire_resist_base: int = 0
    fire_resist_per_level: int = 0
    cold_resist_base: int = 0
    cold_resist_per_level: int = 0
    disease_resist_base: int = 0
    disease_resist_per_level: int = 0

    # Combat flags
    invincible: bool = False
    see_invisibility: bool = False
    is_summonable: bool = False
    flee_on_low_hp: bool = False
    is_christmas_npc: bool = False

    # Monster-like properties
    respawn_dungeon_id: int = 0
    gold_required_respawn_dungeon: int = 0
    respawn_probability: float = 1.0
    can_hide_after_spawn: bool = False
    respawn_time: float = 0.0
    gold_min: int = 0
    gold_max: int = 0
    probability_drop_gold: float = 0.0
    drops: list[MonsterDrop] = []

    # Messages
    welcome_messages: list[str] = []
    shout_messages: list[str] = []
    aggro_messages: list[str] = []
    aggro_message_probability: float = 0.0
    summon_message: str = ""

    # Skills (for guards and hostile NPCs)
    skill_ids: list[str] = []


# =============================================================================
# Quest Models
# =============================================================================


class QuestObjective(BaseModel):
    """Quest objective."""

    type: str
    target_id: str | None = None
    amount: int = 1
    zone_id: str | None = None
    position: Position | None = None


class QuestRewardItem(BaseModel):
    """Item reward from quest."""

    item_id: str
    class_specific: str | None = None


class QuestRewards(BaseModel):
    """Quest rewards."""

    gold: int = 0
    exp: int = 0
    items: list[QuestRewardItem] = []


class QuestData(BaseModel):
    """Quest data from quests.json"""

    id: str
    name: str
    quest_type: str
    level_required: int = 0
    level_recommended: int = 0
    zone_id_final_npc: int = -1
    zone_id_quest_action: int = -1
    finish_quest_locations: list[Any] = []
    is_main_quest: bool = False
    is_epic_quest: bool = False
    is_adventurer_quest: bool = False
    is_repeatable: bool = False
    race_requirements: list[str] = []
    class_requirements: list[str] = []
    faction_requirements: list[Any] = []
    objectives: list[QuestObjective] = []
    rewards: QuestRewards = QuestRewards()
    tooltip: str = ""
    tooltip_complete: str = ""

    start_npc_id: str | None = None
    end_npc_id: str | None = None
    predecessor_ids: list[str] = []

    # Quest specifics
    kill_target_1_id: str | None = None
    kill_target_2_id: str | None = None
    kill_amount_1: int = 0
    kill_amount_2: int = 0
    gather_item_1_id: str | None = None
    gather_item_2_id: str | None = None
    gather_item_3_id: str | None = None
    gather_amount_1: int = 0
    gather_amount_2: int = 0
    gather_amount_3: int = 0
    gather_items: list[Any] = []  # Structured gather objectives
    required_items: list[Any] = []  # Items required to start quest
    equip_items: list[str] = []  # Items to equip for quest
    given_item_on_start_id: str | None = None  # Item given when quest starts
    remove_items_on_complete: bool = False
    is_find_npc_quest: bool = False
    potions_amount: int = 0
    potion_item_id: str | None = None  # Potion brewing quest
    increase_alchemy_skill: float = 0.0
    discovered_location: str | None = None  # Discovery text
    discovered_location_zone_id: str | None = (
        None  # Zone where discovery trigger is located
    )
    discovered_location_sub_zone_id: str | None = (
        None  # Sub-zone where discovery trigger is located
    )
    discovered_location_position: Position | None = (
        None  # Position of discovery trigger
    )
    discovered_location_bounds: BoundingBox | None = (
        None  # Collider bounds of discovery area
    )
    tracking_quest_location: str | None = None  # Location tracking text


# =============================================================================
# Skill Models
# =============================================================================


class SkillBonus(BaseModel):
    """Skill bonus value that scales with level."""

    base_value: int | float = 0
    bonus_per_level: int | float = 0


class SkillData(BaseModel):
    """Skill data from skills.json"""

    id: str
    name: str
    skill_type: str
    tier: int = 0
    max_level: int = 1
    player_classes: list[str] = []  # Classes that have this skill
    level_required: int = 0
    required_skill_points: int = 0
    required_spent_points: int = 0
    prerequisite_skill_id: str | None = None
    prerequisite_level: int = 0
    prerequisite2_skill_id: str | None = None
    prerequisite2_level: int = 0
    required_weapon_category: str = ""
    required_weapon_category2: str = ""
    mana_cost: SkillBonus | None = None
    energy_cost: SkillBonus | None = None
    cooldown: SkillBonus | None = None
    cast_time: SkillBonus | None = None
    cast_range: SkillBonus | None = None
    learn_default: bool = False
    show_cast_bar: bool = False
    cancel_cast_if_target_died: bool = True
    allow_dungeon: bool = True
    tooltip_template: str = ""
    icon_path: str = ""

    # Skill types and flags
    is_spell: bool = False
    is_veteran: bool = False
    is_mercenary_skill: bool = False
    is_pet_skill: bool = False
    is_scroll: bool = False
    is_assassination_skill: bool = False
    is_manaburn_skill: bool = False
    is_balance_health: bool = False
    is_resurrect_skill: bool = False
    is_only_for_magic_classes: bool = False
    is_permanent: bool = False
    is_avatar_war: bool = False
    is_enrage: bool = False
    is_familiar: bool = False
    followup_default_attack: bool = False
    base_skill: bool = False
    affects_random_target: bool = False
    area_object_size: float = 0.0
    area_object_delay_damage: float = 0.0
    area_objects_to_spawn: int = 0

    # Damage
    damage: SkillBonus | None = None
    damage_percent: SkillBonus | None = None
    damage_type: str | None = None
    lifetap_percent: SkillBonus | None = None
    aggro: SkillBonus | None = None
    break_armor_prob: float = 0.0

    # Crowd control
    knockback_chance: SkillBonus | None = None
    stun_chance: SkillBonus | None = None
    stun_time: SkillBonus | None = None
    fear_chance: SkillBonus | None = None
    fear_time: SkillBonus | None = None

    # Healing
    heals_health: SkillBonus | None = None
    heals_mana: SkillBonus | None = None
    can_heal_self: bool = False
    can_heal_others: bool = False

    # TargetBuffSkill-specific
    can_buff_self: bool = False
    can_buff_others: bool = False

    # Buff/debuff
    duration_base: float = 0.0
    duration_per_level: float = 0.0
    remain_after_death: bool = False
    buff_category: str = ""
    is_invisibility: bool = False
    is_undead_illusion: bool = False
    is_mana_shield: bool = False
    is_poison_debuff: bool = False
    is_fire_debuff: bool = False
    is_cold_debuff: bool = False
    is_disease_debuff: bool = False
    is_melee_debuff: bool = False
    is_magic_debuff: bool = False
    is_cleanse: bool = False
    is_dispel: bool = False
    is_blindness: bool = False
    prob_ignore_cleanse: float = 0.0
    is_decrease_resists_skill: bool = False

    # Stat bonuses
    health_max_bonus: SkillBonus | None = None
    health_max_percent_bonus: SkillBonus | None = None
    mana_max_bonus: SkillBonus | None = None
    mana_max_percent_bonus: SkillBonus | None = None
    energy_max_bonus: SkillBonus | None = None
    damage_bonus: SkillBonus | None = None
    damage_percent_bonus: SkillBonus | None = None
    magic_damage_bonus: SkillBonus | None = None
    magic_damage_percent_bonus: SkillBonus | None = None
    defense_bonus: SkillBonus | None = None
    magic_resist_bonus: SkillBonus | None = None
    poison_resist_bonus: SkillBonus | None = None
    fire_resist_bonus: SkillBonus | None = None
    cold_resist_bonus: SkillBonus | None = None
    disease_resist_bonus: SkillBonus | None = None
    block_chance_bonus: SkillBonus | None = None
    accuracy_bonus: SkillBonus | None = None
    critical_chance_bonus: SkillBonus | None = None
    haste_bonus: SkillBonus | None = None
    spell_haste_bonus: SkillBonus | None = None
    health_percent_per_second_bonus: SkillBonus | None = None
    healing_per_second_bonus: SkillBonus | None = None
    mana_percent_per_second_bonus: SkillBonus | None = None
    mana_per_second_bonus: SkillBonus | None = None
    energy_percent_per_second_bonus: SkillBonus | None = None
    energy_per_second_bonus: SkillBonus | None = None
    speed_bonus: SkillBonus | None = None
    damage_shield: SkillBonus | None = None
    cooldown_reduction_percent: SkillBonus | None = None
    heal_on_hit_percent: SkillBonus | None = None
    strength_bonus: SkillBonus | None = None
    intelligence_bonus: SkillBonus | None = None
    dexterity_bonus: SkillBonus | None = None
    charisma_bonus: SkillBonus | None = None
    wisdom_bonus: SkillBonus | None = None
    constitution_bonus: SkillBonus | None = None
    ward_bonus: SkillBonus | None = None
    fear_resist_chance_bonus: SkillBonus | None = None

    # Misc
    skill_aggro_message: str = ""
    pet_prefab_name: str | None = None  # Prefab name for summoned pet (e.g., "Bear")

    # SummonSkillMonsters fields (skill_type = "summon_monsters", boss add-summoning)
    summoned_monster_id: str | None = None
    summoned_monster_level: int | None = None
    summon_count_per_cast: int | None = None  # -1 = based on aggro count
    max_active_summons: int | None = None


# =============================================================================
# Class Models
# =============================================================================


class ClassData(BaseModel):
    """Class data from classes.json"""

    id: str
    name: str
    description: str
    primary_role: str
    secondary_role: str | None = None
    difficulty: int  # 1-3 (Easy, Medium, Hard)
    resource_type: str  # "mana" or "energy"
    compatible_races: list[str]
    game_version: str


# =============================================================================
# Portal Models
# =============================================================================


class PortalData(BaseModel):
    """Portal data from portals.json"""

    id: str
    is_template: bool = False
    from_zone_id: str
    from_sub_zone_id: str | None = None
    to_zone_id: str
    to_sub_zone_id: str | None = None
    position: Position
    destination: Position
    orientation: Position | None = None
    required_item_id: str | None = None
    need_monster_dead_id: str | None = (
        None  # Monster that must be dead to activate (e.g., "thalassor")
    )
    level_required: int = 0
    item_level_required: int = 0
    is_closed: bool = False


class TreasureLocationData(BaseModel):
    """Treasure dig location from treasure_locations.json"""

    id: str
    zone_id: str
    sub_zone_id: str | None = None
    position: Position
    required_map_id: str
    reward_id: str | None = None


# =============================================================================
# Zone Models
# =============================================================================


class ZoneBounds(BaseModel):
    """Zone boundary box."""

    min_x: float
    max_x: float
    min_z: float
    max_z: float


class ZoneData(BaseModel):
    """Zone data from zone_info.json"""

    zone_id: int
    id: str
    name: str
    is_dungeon: bool = False
    weather_type: str = "None"
    weather_probability: float = 0.0
    required_level: int = 0
    description: str = ""
    min_zoom_map: float = 80.0
    max_zoom_map: float = 210.0
    level_min: int = 0
    level_max: int = 0


class ZoneTriggerData(BaseModel):
    """Zone trigger data from zone_triggers.json"""

    id: str
    name: str
    zone_id: int
    is_outdoor: bool = True
    position: Position
    bloom_color: str = "#FFFFFFFF"
    light_intensity: float = 0.5
    audio_zone: str = ""
    loop_sounds_zone: str = ""
    bounds_min_x: float | None = None
    bounds_min_y: float | None = None
    bounds_max_x: float | None = None
    bounds_max_y: float | None = None


# =============================================================================
# Gather Item Models
# =============================================================================


class GatherRandomDrop(BaseModel):
    """Random bonus drop from gathering."""

    item_id: str
    rate: float = Field(ge=0.0, le=1.0)


class GatherItemData(BaseModel):
    """Gather item data from gather_items.json"""

    id: str
    name: str
    zone_id: str | None = None
    sub_zone_id: str | None = None
    position: Position | None = None
    is_template: bool = False
    is_plant: bool = False
    is_mineral: bool = False
    is_chest: bool = False
    is_radiant_spark: bool = False
    level: int = 1
    respawn_time: float = 0.0
    spawn_ready: bool = False
    prob_despawn: float = 0.0

    # Primary reward (always get this)
    item_reward_id: str | None = None
    item_reward_amount: int = 1

    # Optional gold drop
    gold_min: int = 0
    gold_max: int = 0

    # Random bonus drops (probability-based)
    random_drops: list[GatherRandomDrop] = []

    # Chest-specific
    chest_reward_probability: float = 0.0
    chest_interaction_messages: list[str] = []

    # Misc
    decrease_faction: str = ""
    description: str = ""
    tool_required_id: str | None = (
        None  # Tool/key required to access (e.g., "dragonfire_chest_key")
    )


# =============================================================================
# Crafting Recipe Models
# =============================================================================


class CraftingMaterial(BaseModel):
    """Material needed for crafting."""

    item_id: str
    amount: int = 1


class CraftingRecipeData(BaseModel):
    """Crafting recipe data from crafting_recipes.json"""

    id: str
    result_item_id: str
    result_amount: int = 1
    materials: list[CraftingMaterial] = []
    station_type: str


# =============================================================================
# Alchemy Recipe Models
# =============================================================================


class AlchemyMaterial(BaseModel):
    """Material needed for alchemy."""

    item_id: str
    amount: int = 1


class AlchemyRecipeData(BaseModel):
    """Alchemy recipe data from alchemy_recipes.json"""

    id: str
    result_item_id: str
    level_required: int = 0
    materials: list[AlchemyMaterial] = []


# =============================================================================
# Alchemy Table Models
# =============================================================================


class AlchemyTableData(BaseModel):
    """Alchemy table world location from alchemy_tables.json"""

    id: str
    name: str
    zone_id: str
    sub_zone_id: str | None = None
    position: Position


# =============================================================================
# Crafting Station Models
# =============================================================================


class CraftingStationData(BaseModel):
    """Crafting station world location from crafting_stations.json"""

    id: str
    name: str
    zone_id: str
    sub_zone_id: str | None = None
    position: Position
    is_cooking_oven: bool = False


# =============================================================================
# Summon Trigger Models
# =============================================================================


class SummonTriggerData(BaseModel):
    """Summon trigger data from summon_triggers.json"""

    id: str
    summoned_entity_type: str  # "Monster" or "Npc"
    summoned_entity_id: str
    summoned_entity_name: str
    summon_message: str = ""
    spawn_position: Position | None = None
    zone_id: str | None = None
    placeholder_monster_ids: list[str] = []


class LuckTokenData(BaseModel):
    """Luck token data from luck_tokens.json"""

    zone_id: str
    zone_name: str
    boss_luck_token_id: str
    fragment_token_id: str | None = None
    fragment_amount_needed: int = 0
    boss_luck_bonus: float = 0.05
    fragment_drop_chance: float = 0.02


# =============================================================================
# Altar Models
# =============================================================================


class AltarWaveMonster(BaseModel):
    """Monster spawn in an altar wave."""

    monster_id: str
    monster_name: str
    base_level: int
    spawn_location: Position


class AltarWave(BaseModel):
    """Wave configuration for altar events."""

    wave_number: int
    init_wave_message: str = ""
    finish_wave_message: str = ""
    seconds_before_start: int = 0
    seconds_to_complete_wave: int
    require_all_monsters_cleared: bool = False
    monsters: list[AltarWaveMonster] = []


class AltarData(BaseModel):
    """Altar data from altars.json"""

    id: str
    name: str
    type: str  # "forgotten" or "avatar"
    zone_id: str = "unknown"
    sub_zone_id: str | None = None
    position: Position
    min_level_required: int = 0
    required_activation_item_id: str | None = None
    required_activation_item_name: str | None = None
    init_event_message: str = ""
    radius_event: int = 0
    uses_veteran_scaling: bool = False
    reward_common_id: str | None = None
    reward_common_name: str | None = None
    reward_magic_id: str | None = None
    reward_magic_name: str | None = None
    reward_epic_id: str | None = None
    reward_epic_name: str | None = None
    reward_legendary_id: str | None = None
    reward_legendary_name: str | None = None
    total_waves: int = 0
    estimated_duration_seconds: int = 0
    waves: list[AltarWave] = []


# =============================================================================
# Profession Models
# =============================================================================


class ProfessionData(BaseModel):
    """Profession data from professions.json"""

    id: str
    name: str
    description: str = ""
    category: str  # crafting, gathering, exploration, combat
    icon_path: str | None = None
    steam_achievement_id: str | None = None
    steam_achievement_name: str | None = None
    steam_achievement_description: str | None = None
    max_level: int = 100
    tracking_type: str  # float_level, count_based
    tracking_denominator: int | None = None
