-- Ancient Kingdoms Compendium - Database Schema
-- Design: Optimized for read performance with denormalized data

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =============================================================================
-- FACTIONS (static data from static_data.json)
-- =============================================================================

CREATE TABLE factions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE reputation_tiers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    min_value INTEGER,          -- NULL means negative infinity
    max_value INTEGER,          -- NULL means positive infinity
    is_hostile BOOLEAN DEFAULT 0
);

-- =============================================================================
-- ZONES
-- =============================================================================

CREATE TABLE zones (
    id TEXT PRIMARY KEY,
    zone_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_dungeon BOOLEAN DEFAULT 0,
    weather_type TEXT DEFAULT 'None',
    weather_probability REAL DEFAULT 0.0,
    required_level INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    min_zoom_map REAL DEFAULT 80.0,
    max_zoom_map REAL DEFAULT 80.0,
    level_min INTEGER,                 -- Min monster level (denormalized, NULL if no monsters)
    level_max INTEGER,                 -- Max monster level (denormalized, NULL if no monsters)
    discovery_exp INTEGER,             -- EXP granted when discovering this zone
    -- Denormalized bounds from entity positions (monsters, npcs, portals, etc.)
    bounds_min_x REAL,
    bounds_min_y REAL,
    bounds_max_x REAL,
    bounds_max_y REAL
);

CREATE INDEX idx_zones_zone_id ON zones(zone_id);
CREATE INDEX idx_zones_is_dungeon ON zones(is_dungeon);
CREATE INDEX idx_zones_required_level ON zones(required_level);

-- =============================================================================
-- PROFESSIONS
-- =============================================================================

CREATE TABLE professions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,             -- 'crafting', 'gathering', 'exploration', 'combat'
    icon_path TEXT,
    steam_achievement_id TEXT,
    steam_achievement_name TEXT,
    steam_achievement_description TEXT,
    max_level INTEGER DEFAULT 100,
    tracking_type TEXT NOT NULL,        -- 'float_level', 'count_based'
    tracking_denominator INTEGER        -- For count_based professions (e.g., 13 books, 38 zones)
);

CREATE INDEX idx_professions_category ON professions(category);

-- =============================================================================
-- LUCK TOKENS
-- =============================================================================

CREATE TABLE luck_tokens (
    zone_id TEXT PRIMARY KEY REFERENCES zones(id),
    zone_name TEXT NOT NULL,
    boss_luck_token_id TEXT REFERENCES items(id),
    fragment_token_id TEXT REFERENCES items(id),
    fragment_amount_needed INTEGER DEFAULT 0,
    boss_luck_bonus REAL DEFAULT 0.05,
    fragment_drop_chance REAL DEFAULT 0.02
);

-- =============================================================================
-- ALTARS (Forgotten Altar Events)
-- =============================================================================

CREATE TABLE altars (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,                     -- "forgotten" or "avatar"
    zone_id TEXT REFERENCES zones(id),
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    position_x REAL,
    position_y REAL,
    position_z REAL,
    min_level_required INTEGER DEFAULT 0,
    required_activation_item_id TEXT,
    required_activation_item_name TEXT,
    init_event_message TEXT,
    radius_event INTEGER DEFAULT 0,
    uses_veteran_scaling BOOLEAN DEFAULT 0,
    reward_normal_id TEXT,
    reward_normal_name TEXT,
    reward_magic_id TEXT,
    reward_magic_name TEXT,
    reward_epic_id TEXT,
    reward_epic_name TEXT,
    reward_legendary_id TEXT,
    reward_legendary_name TEXT,
    total_waves INTEGER DEFAULT 0,
    estimated_duration_seconds INTEGER DEFAULT 0,
    waves TEXT,                             -- JSON: full wave data with monsters
    keywords TEXT                           -- FTS5 search keywords
);

CREATE INDEX idx_altars_zone_id ON altars(zone_id);
CREATE INDEX idx_altars_sub_zone ON altars(sub_zone_id);
CREATE INDEX idx_altars_type ON altars(type);
CREATE INDEX idx_altars_min_level ON altars(min_level_required);

-- =============================================================================
-- ITEMS
-- =============================================================================

CREATE TABLE items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    item_type TEXT,                 -- weapon, armor, consumable, etc.
    quality INTEGER,                -- 0-5 (common to legendary)
    level_required INTEGER DEFAULT 0,
    class_required TEXT,            -- JSON array: ["Warrior", "Mage"]
    faction_required_to_buy INTEGER DEFAULT 0,
    faction_required_tier_name TEXT,  -- Denormalized from reputation_tiers
    adventuring_level_needed REAL DEFAULT 0.0,
    is_key BOOLEAN DEFAULT 0,
    ignore_journal BOOLEAN DEFAULT 0,
    is_chest_key BOOLEAN DEFAULT 0,
    has_gather_quest BOOLEAN DEFAULT 0,
    max_stack INTEGER DEFAULT 1,
    buy_price INTEGER DEFAULT 0,
    sell_price INTEGER DEFAULT 0,
    primal_essence_value INTEGER,        -- Primal essence obtained from trading this item (equipment quality >= 1, sellable, sell_price > 0): ceil(sell_price * 0.06)
    buy_token_id TEXT REFERENCES items(id),
    sellable BOOLEAN DEFAULT 1,
    tradable BOOLEAN DEFAULT 1,
    destroyable BOOLEAN DEFAULT 1,
    is_quest_item BOOLEAN DEFAULT 0,
    is_bestiary_drop BOOLEAN DEFAULT 0,  -- Whether this item appears in monster bestiary UI
    infinite_charges BOOLEAN DEFAULT 0,
    cooldown REAL DEFAULT 0.0,
    cooldown_category TEXT,
    icon_path TEXT DEFAULT '',
    tooltip TEXT DEFAULT '',
    tooltip_html TEXT DEFAULT '',  -- Pre-rendered HTML tooltip

    -- Equipment properties
    slot TEXT,
    weapon_category TEXT,
    stats TEXT,                     -- JSON object with equipment stats
    item_level INTEGER DEFAULT 0,   -- Calculated from stats using game formula

    -- Consumable properties
    usage_health INTEGER DEFAULT 0,
    usage_mana INTEGER DEFAULT 0,
    usage_energy INTEGER DEFAULT 0,
    usage_experience INTEGER DEFAULT 0,
    usage_pet_health INTEGER DEFAULT 0,
    potion_buff_level INTEGER DEFAULT 0,
    potion_buff_id TEXT REFERENCES skills(id),
    potion_buff_name TEXT,
    food_buff_level INTEGER DEFAULT 0,
    food_buff_id TEXT REFERENCES skills(id),
    food_buff_name TEXT,
    food_type TEXT,
    book_strength_gain INTEGER DEFAULT 0,
    book_dexterity_gain INTEGER DEFAULT 0,
    book_constitution_gain INTEGER DEFAULT 0,
    book_intelligence_gain INTEGER DEFAULT 0,
    book_wisdom_gain INTEGER DEFAULT 0,
    book_charisma_gain INTEGER DEFAULT 0,
    book_text TEXT,
    scroll_skill_id TEXT REFERENCES skills(id),
    scroll_skill_name TEXT,
    is_repair_kit BOOLEAN DEFAULT 0,
    mount_speed REAL DEFAULT 0.0,
    backpack_slots INTEGER DEFAULT 0,
    travel_zone_id INTEGER DEFAULT 0 REFERENCES zones(zone_id),
    travel_destination_x REAL,
    travel_destination_y REAL,
    travel_destination_z REAL,
    travel_destination_name TEXT,
    pack_final_amount INTEGER DEFAULT 0,

    -- Chest rewards
    chest_rewards TEXT,             -- JSON array
    chest_num_items INTEGER DEFAULT 0,

    -- Additional item properties
    relic_buff_level INTEGER DEFAULT 0,
    structure_price INTEGER DEFAULT 0,
    structure_available_rotations TEXT,  -- JSON array
    weapon_proc_effect_probability REAL DEFAULT 0.0,
    weapon_proc_effect_id TEXT REFERENCES skills(id),
    weapon_proc_effect_name TEXT,
    weapon_delay INTEGER DEFAULT 0,
    weapon_required_ammo_id TEXT REFERENCES items(id),
    fragment_amount_needed INTEGER DEFAULT 0,
    fragment_result_item_id TEXT REFERENCES items(id),
    fragment_result_item_name TEXT,

    -- Luck token properties
    luck_token_zone_id TEXT,
    luck_token_zone_name TEXT,
    luck_token_drop_chance REAL,
    luck_token_bonus REAL,
    luck_token_fragment_id TEXT REFERENCES items(id),
    luck_token_fragment_name TEXT,
    luck_token_fragments_needed INTEGER,

    random_items TEXT,              -- JSON array of item IDs
    random_items_with_names TEXT,   -- JSON: [{"item_id": "agate", "item_name": "Agate"}, ...]
    merge_items_needed_ids TEXT,
    merge_items_needed TEXT,        -- JSON: [{"item_id": "a_cunning_society", "item_name": "A Cunning Society"}, ...]
    merge_result_item_id TEXT REFERENCES items(id),
    merge_result_item_name TEXT,
    treasure_map_image_location TEXT,
    treasure_map_reward_id TEXT REFERENCES items(id),
    treasure_map_reward_name TEXT,
    treasure_map_zone_id TEXT REFERENCES zones(id),
    treasure_map_zone_name TEXT,
    treasure_map_position_x REAL,
    treasure_map_position_y REAL,
    treasure_map_position_z REAL,

    -- Optional augment/recipe properties
    augment_armor_set_id TEXT,        -- ID of the set bonus item (e.g., "cobalt_armor_bonus_set")
    augment_armor_set_item_ids TEXT,
    augment_armor_set_members TEXT,   -- JSON: [{"item_id": "cobalt_helmet", "item_name": "Cobalt Helmet"}, ...]
    augment_armor_set_name TEXT,
    augment_skill_bonuses TEXT,
    augment_skill_bonuses_with_names TEXT,  -- JSON: [{"skill_id": "combat_training", "skill_name": "Combat Training", "level_bonus": 2}, ...]
    augment_attribute_bonuses TEXT,   -- JSON: [{"attribute": "strength", "bonus": 10}, ...]
    pack_final_item_id TEXT REFERENCES items(id),
    pack_final_item_name TEXT,
    recipe_potion_learned_id TEXT REFERENCES items(id),
    recipe_potion_learned_name TEXT,
    alchemy_recipe_level_required INTEGER,
    alchemy_recipe_materials TEXT,  -- JSON: [{"item_id": "water", "item_name": "Water", "amount": 1}, ...]
    taught_by_recipe_id TEXT REFERENCES items(id),  -- Reverse: which recipe teaches this potion
    taught_by_recipe_name TEXT,
    alchemy_exp INTEGER,              -- EXP granted when crafting this potion (from alchemy_recipes)
    relic_buff_id TEXT REFERENCES skills(id),
    relic_buff_name TEXT,

    -- Denormalized: Where to get this item (as JSON arrays)
    dropped_by TEXT,                -- JSON: [{"monster_id": "fire_ele", "rate": 0.15, "zone_id": "volcanic"}]
    sold_by TEXT,                   -- JSON: [{"npc_id": "kara", "price": 500, "zone_id": "stonewatch"}]
    rewarded_by TEXT,               -- JSON: [{"quest_id": "quest_blacksmith_1"}]
    provided_by_quests TEXT,        -- JSON: [{"quest_id": "quest_123", "quest_name": "...", "level_recommended": 10, "is_repeatable": false, "class_restrictions": null}]
    rewarded_by_altars TEXT,        -- JSON: [{"altar_id": "altar_forgotten_kings", "altar_name": "Altar of the Forgotten Kings", "reward_tier": "legendary", "min_effective_level": 55, "zone_id": "twilight_forest", "zone_name": "Twilight Forest"}]
    required_for_altars TEXT,       -- JSON: [{"altar_id": "altar_forgotten_kings", "altar_name": "Altar of the Forgotten Kings", "min_level_required": 30, "zone_id": "twilight_forest", "zone_name": "Twilight Forest"}]
    required_for_portals TEXT,      -- JSON: [{"portal_id": "portal_123", "from_zone_id": "krom_razz", "from_zone_name": "Krom Razz", "to_zone_id": "krom_razz", "to_zone_name": "Krom Razz", "position_x": 743.55, "position_y": 350.82, "destination_x": 761.4, "destination_y": 357.42}]
    crafted_from TEXT,              -- JSON: [{"recipe_id": "recipe_0", "result_amount": 1}]
    gathered_from TEXT,             -- JSON: [{"gather_item_id": "iron_ore", "rate": 0.1}]
    opens_chests TEXT,              -- JSON: [{"chest_id": "chest_rf_greendungeon1_reward3", "chest_name": "Chest RF GreenDungeon1", "zone_id": "the_twisted_haunt", "zone_name": "The Twisted Haunt", "position_x": 527.9929, "position_y": 55.8}]
    created_from_merge TEXT,        -- JSON: [{"item_id": "a_cunning_society", "item_name": "A Cunning Society"}, ...]
    found_in_chests TEXT,           -- JSON: [{"chest_id": "chest_of_lost_adventurers_dwarves", "chest_name": "Chest of Lost Adventurers (Dwarves)", "rate": 0.02}]
    found_in_packs TEXT,            -- JSON: [{"pack_id": "pack_10_arrows", "pack_name": "Pack 10 Arrows", "amount": 10}]

    -- Denormalized: Where this item is used (as JSON arrays)
    used_in_recipes TEXT,           -- JSON: [{"recipe_id": "recipe_5", "amount": 3}]
    needed_for_quests TEXT,         -- JSON: [{"quest_id": "quest_blacksmith_1", "purpose": "gather", "amount": 5}]
    used_as_currency_for TEXT,      -- JSON: [{"item_id": "item_123", "item_name": "Cool Sword", "price": 50}]
    found_in_random_items TEXT,     -- JSON: [{"random_item_id": "random_gem_1", "random_item_name": "Random Gem 1"}]
    rewarded_by_treasure_maps TEXT  -- JSON: [{"map_id": "red_scabbard_map", "map_name": "Red Scabbard Map", "zone_id": "everfrost", "zone_name": "Everfrost"}]
);

CREATE INDEX idx_items_item_type ON items(item_type);
CREATE INDEX idx_items_slot ON items(slot);
CREATE INDEX idx_items_quality ON items(quality);
CREATE INDEX idx_items_level ON items(level_required);
CREATE INDEX idx_items_weapon_category ON items(weapon_category);

-- =============================================================================
-- MONSTERS
-- =============================================================================

CREATE TABLE monsters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER,
    level_min INTEGER,              -- Min level from spawns (denormalized)
    level_max INTEGER,              -- Max level from spawns (denormalized)
    health INTEGER,
    type_name TEXT,                 -- Humanoid, Beast, Undead, Elemental, etc.
    class_name TEXT,                -- specific class within type
    zone_bestiary TEXT DEFAULT '',  -- manually set zone name for bestiary display

    -- Combat stats (calculated at base level)
    damage INTEGER DEFAULT 0,
    magic_damage INTEGER DEFAULT 0,
    defense INTEGER DEFAULT 0,
    magic_resist INTEGER DEFAULT 0,
    poison_resist INTEGER DEFAULT 0,
    fire_resist INTEGER DEFAULT 0,
    cold_resist INTEGER DEFAULT 0,
    disease_resist INTEGER DEFAULT 0,
    block_chance REAL DEFAULT 0.0,
    critical_chance REAL DEFAULT 0.0,

    -- Stat scaling (LinearInt: actual = base + per_level * (level - 1))
    health_base INTEGER DEFAULT 0,
    health_per_level INTEGER DEFAULT 0,
    damage_base INTEGER DEFAULT 0,
    damage_per_level INTEGER DEFAULT 0,
    magic_damage_base INTEGER DEFAULT 0,
    magic_damage_per_level INTEGER DEFAULT 0,
    defense_base INTEGER DEFAULT 0,
    defense_per_level INTEGER DEFAULT 0,
    magic_resist_base INTEGER DEFAULT 0,
    magic_resist_per_level INTEGER DEFAULT 0,
    poison_resist_base INTEGER DEFAULT 0,
    poison_resist_per_level INTEGER DEFAULT 0,
    fire_resist_base INTEGER DEFAULT 0,
    fire_resist_per_level INTEGER DEFAULT 0,
    cold_resist_base INTEGER DEFAULT 0,
    cold_resist_per_level INTEGER DEFAULT 0,
    disease_resist_base INTEGER DEFAULT 0,
    disease_resist_per_level INTEGER DEFAULT 0,

    -- Classification flags
    is_boss BOOLEAN DEFAULT 0,
    is_world_boss BOOLEAN DEFAULT 0,
    is_elite BOOLEAN DEFAULT 0,
    is_hunt BOOLEAN DEFAULT 0,
    is_dummy BOOLEAN DEFAULT 0,
    is_summonable BOOLEAN DEFAULT 0,
    is_halloween BOOLEAN DEFAULT 0,
    is_forgotten_altar_event BOOLEAN DEFAULT 0,

    -- Combat flags
    see_invisibility BOOLEAN DEFAULT 0,
    is_immune_debuffs BOOLEAN DEFAULT 0,
    yell_friends BOOLEAN DEFAULT 0,
    flee_on_low_hp BOOLEAN DEFAULT 0,
    no_aggro_monster BOOLEAN DEFAULT 0,
    has_aura BOOLEAN DEFAULT 0,
    follow_distance REAL DEFAULT 0.0,

    -- Spawning and respawn
    does_respawn BOOLEAN DEFAULT 1,
    death_time REAL DEFAULT 0.0,
    respawn_time REAL DEFAULT 0.0,
    respawn_probability REAL DEFAULT 1.0,
    spawn_time_start INTEGER DEFAULT 0,
    spawn_time_end INTEGER DEFAULT 0,
    placeholder_spawn_probability REAL DEFAULT 0.0,
    placeholder_monster_id TEXT REFERENCES monsters(id),

    -- Loot and rewards
    gold_min INTEGER,
    gold_max INTEGER,
    probability_drop_gold REAL DEFAULT 1.0,
    exp_multiplier REAL DEFAULT 1.0,
    base_exp INTEGER,               -- Pre-computed base EXP reward (before level scaling)
    drops TEXT,                     -- JSON array

    -- Messages and interactions
    aggro_messages TEXT,            -- JSON array
    aggro_message_probability REAL DEFAULT 0.0,
    summon_message TEXT DEFAULT '',

    -- Faction changes
    improve_faction TEXT,           -- JSON array
    decrease_faction TEXT,          -- JSON array

    -- Lore (boss-specific)
    lore_boss TEXT DEFAULT '',

    -- Search keywords (generated: boss/elite/hunt/creature based on flags)
    keywords TEXT
);

CREATE INDEX idx_monsters_level ON monsters(level);
CREATE INDEX idx_monsters_type_name ON monsters(type_name);
CREATE INDEX idx_monsters_boss ON monsters(is_boss) WHERE is_boss = 1;
CREATE INDEX idx_monsters_elite ON monsters(is_elite) WHERE is_elite = 1;

-- =============================================================================
-- MONSTER SPAWNS
-- =============================================================================

CREATE TABLE monster_spawns (
    id TEXT PRIMARY KEY,
    monster_id TEXT NOT NULL REFERENCES monsters(id),
    zone_id TEXT NOT NULL REFERENCES zones(id),
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    position_x REAL,
    position_y REAL,
    position_z REAL,
    level INTEGER,                  -- Level of this specific spawn (may differ from canonical monster)
    move_probability REAL DEFAULT 0.0,
    move_distance REAL DEFAULT 0.0,
    is_patrolling BOOLEAN DEFAULT 0,
    patrol_waypoints TEXT,          -- JSON array

    -- Spawn source info (for non-regular spawns)
    spawn_type TEXT DEFAULT 'regular',      -- 'regular', 'placeholder', 'altar', 'summon'
    source_monster_id TEXT,                 -- placeholder: parent monster that triggers spawn
    source_monster_name TEXT,
    source_spawn_probability REAL,          -- placeholder: chance when parent dies
    source_altar_id TEXT,                   -- altar: which altar event
    source_altar_name TEXT,
    source_altar_wave INTEGER,              -- altar: which wave (0-indexed)
    source_altar_activation_item_id TEXT,   -- altar: item needed to start event
    source_altar_activation_item_name TEXT,
    source_summon_trigger_id TEXT,          -- summon: trigger that spawns this
    source_summon_kill_monster_id TEXT,     -- summon: monster to kill (FK to monsters)
    source_summon_kill_monster_name TEXT,   -- summon: denormalized name for display
    source_summon_kill_count INTEGER,       -- summon: how many to kill
    source_summon_message TEXT              -- summon: message shown when summoned
);

CREATE INDEX idx_monster_spawns_monster ON monster_spawns(monster_id);
CREATE INDEX idx_monster_spawns_zone ON monster_spawns(zone_id);
CREATE INDEX idx_monster_spawns_sub_zone ON monster_spawns(sub_zone_id);

-- =============================================================================
-- SUMMON TRIGGERS
-- =============================================================================

CREATE TABLE summon_triggers (
    id TEXT PRIMARY KEY,
    summoned_entity_type TEXT NOT NULL,   -- "Monster" or "Npc"
    summoned_entity_id TEXT NOT NULL,      -- References monsters(id) or npcs(id)
    summoned_entity_name TEXT NOT NULL,
    summon_message TEXT DEFAULT '',
    spawn_position_x REAL,
    spawn_position_y REAL,
    spawn_position_z REAL,
    zone_id TEXT REFERENCES zones(id)
);

CREATE INDEX idx_summon_triggers_zone ON summon_triggers(zone_id);
CREATE INDEX idx_summon_triggers_entity ON summon_triggers(summoned_entity_id);

-- Junction table for placeholder monsters (specific spawns that must be killed)
CREATE TABLE summon_trigger_placeholders (
    trigger_id TEXT NOT NULL REFERENCES summon_triggers(id) ON DELETE CASCADE,
    spawn_id TEXT NOT NULL REFERENCES monster_spawns(id),
    placeholder_order INTEGER NOT NULL,    -- Preserve list order
    PRIMARY KEY (trigger_id, spawn_id)
);

CREATE INDEX idx_summon_placeholders_trigger ON summon_trigger_placeholders(trigger_id);
CREATE INDEX idx_summon_placeholders_spawn ON summon_trigger_placeholders(spawn_id);

-- =============================================================================
-- NPCS
-- =============================================================================

CREATE TABLE npcs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    faction TEXT REFERENCES factions(name),
    race TEXT,

    -- Roles as JSON object
    roles TEXT,                     -- JSON object

    -- What they offer
    quests_offered TEXT,            -- JSON array: [{id, name, level_required, level_recommended}]
    quests_completed_here TEXT,     -- JSON array: [{id, name, level_required, level_recommended}] - denormalized
    items_sold TEXT,                -- JSON array: [{item_id, item_name, quality, price, currency_item_id, currency_item_name, required_faction}]

    -- Base stats
    level INTEGER DEFAULT 1,
    health INTEGER DEFAULT 0,
    mana INTEGER DEFAULT 0,

    -- Combat stats (calculated at base level)
    damage INTEGER DEFAULT 0,
    magic_damage INTEGER DEFAULT 0,
    defense INTEGER DEFAULT 0,
    magic_resist INTEGER DEFAULT 0,
    poison_resist INTEGER DEFAULT 0,
    fire_resist INTEGER DEFAULT 0,
    cold_resist INTEGER DEFAULT 0,
    disease_resist INTEGER DEFAULT 0,
    block_chance REAL DEFAULT 0.0,
    critical_chance REAL DEFAULT 0.0,
    accuracy REAL DEFAULT 0.0,

    -- Stat scaling (LinearInt: actual = base + bonus_per_level * (level - 1))
    health_base INTEGER DEFAULT 0,
    health_per_level INTEGER DEFAULT 0,
    mana_base INTEGER DEFAULT 0,
    mana_per_level INTEGER DEFAULT 0,
    damage_base INTEGER DEFAULT 0,
    damage_per_level INTEGER DEFAULT 0,
    magic_damage_base INTEGER DEFAULT 0,
    magic_damage_per_level INTEGER DEFAULT 0,
    defense_base INTEGER DEFAULT 0,
    defense_per_level INTEGER DEFAULT 0,
    magic_resist_base INTEGER DEFAULT 0,
    magic_resist_per_level INTEGER DEFAULT 0,
    poison_resist_base INTEGER DEFAULT 0,
    poison_resist_per_level INTEGER DEFAULT 0,
    fire_resist_base INTEGER DEFAULT 0,
    fire_resist_per_level INTEGER DEFAULT 0,
    cold_resist_base INTEGER DEFAULT 0,
    cold_resist_per_level INTEGER DEFAULT 0,
    disease_resist_base INTEGER DEFAULT 0,
    disease_resist_per_level INTEGER DEFAULT 0,

    -- Combat flags
    invincible BOOLEAN DEFAULT 0,
    see_invisibility BOOLEAN DEFAULT 0,
    is_summonable BOOLEAN DEFAULT 0,
    flee_on_low_hp BOOLEAN DEFAULT 0,
    is_christmas_npc BOOLEAN DEFAULT 0,

    -- Respawn and behavior
    -- Note: respawn_dungeon_id = 100 is special "World Bosses" case, not a real zone
    respawn_dungeon_id INTEGER DEFAULT 0,
    gold_required_respawn_dungeon INTEGER DEFAULT 0,
    respawn_probability REAL DEFAULT 1.0,
    can_hide_after_spawn BOOLEAN DEFAULT 0,
    respawn_time REAL DEFAULT 600.0,

    -- Combat/loot
    gold_min INTEGER DEFAULT 0,
    gold_max INTEGER DEFAULT 0,
    probability_drop_gold REAL DEFAULT 0.25,
    drops TEXT,                     -- JSON array

    -- Messages
    welcome_messages TEXT,          -- JSON array
    shout_messages TEXT,            -- JSON array
    aggro_messages TEXT,            -- JSON array
    aggro_message_probability REAL DEFAULT 0.0,
    summon_message TEXT DEFAULT '',

    -- Skills (for guards and hostile NPCs)
    skill_ids TEXT,                 -- JSON array: ["skill_id1", "skill_id2"]

    -- Search keywords (generated: service types from roles JSON)
    keywords TEXT
);

-- =============================================================================
-- NPC SPAWNS
-- =============================================================================

CREATE TABLE npc_spawns (
    id TEXT PRIMARY KEY,
    npc_id TEXT NOT NULL REFERENCES npcs(id),
    zone_id TEXT NOT NULL REFERENCES zones(id),
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    position_x REAL,
    position_y REAL,
    position_z REAL,
    origin_follow_position_x REAL DEFAULT 0.0,
    origin_follow_position_y REAL DEFAULT 0.0,
    origin_follow_position_z REAL DEFAULT 0.0,
    follow_distance REAL DEFAULT 30.0,
    move_probability REAL DEFAULT 0.0,
    move_distance REAL DEFAULT 0.0,
    patrol_waypoints TEXT,          -- JSON array
    role_bitmask INTEGER DEFAULT 0, -- Denormalized from npcs.roles for GPU filtering

    teleport_zone_id TEXT REFERENCES zones(id),
    teleport_destination_x REAL,
    teleport_destination_y REAL,
    teleport_destination_z REAL,
    teleport_price INTEGER DEFAULT 0,
    teleport_message TEXT
);

CREATE INDEX idx_npc_spawns_npc ON npc_spawns(npc_id);
CREATE INDEX idx_npc_spawns_zone ON npc_spawns(zone_id);
CREATE INDEX idx_npc_spawns_sub_zone ON npc_spawns(sub_zone_id);

-- =============================================================================
-- QUESTS
-- =============================================================================

CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quest_type TEXT NOT NULL,       -- kill, gather, gather_inventory, location, equip_item, alchemy
    display_type TEXT,              -- Denormalized: Kill, Collect, Deliver, Obtain, Find, Discover, Equip, Alchemy
    level_required INTEGER DEFAULT 0,
    level_recommended INTEGER DEFAULT 0,
    zone_id_final_npc INTEGER DEFAULT -1,
    zone_id_quest_action INTEGER DEFAULT -1,

    -- Flags
    is_main_quest BOOLEAN DEFAULT 0,
    is_epic_quest BOOLEAN DEFAULT 0,
    is_adventurer_quest BOOLEAN DEFAULT 0,
    is_repeatable BOOLEAN DEFAULT 0,

    -- Requirements (stored as JSON arrays)
    race_requirements TEXT,         -- JSON array: ["Human", "Elf"]
    class_requirements TEXT,        -- JSON array: ["Warrior", "Mage"]
    faction_requirements TEXT,      -- JSON array
    finish_quest_locations TEXT,    -- JSON array

    -- Objectives as JSON (flexible structure)
    -- Example: [{"type": "kill", "target": "fire_ele", "amount": 10}]
    objectives TEXT,                -- JSON array

    -- Rewards (stored as JSON)
    -- Example: {"gold": 500, "exp": 150000, "items": [{"item_id": "helm"}]}
    rewards TEXT,                   -- JSON object

    -- UI
    tooltip TEXT,
    tooltip_complete TEXT,
    -- Pre-rendered HTML tooltips per class (JSON object: {"Warrior": "...", "Cleric": "...", etc.})
    tooltip_html TEXT,
    tooltip_complete_html TEXT,

    -- Quest NPCs and quest chains
    start_npc_id TEXT REFERENCES npcs(id),
    end_npc_id TEXT REFERENCES npcs(id),
    predecessor_ids TEXT,  -- JSON array of prerequisite quest IDs (any one unlocks this quest)

    -- Kill quest fields
    kill_target_1_id TEXT REFERENCES monsters(id),
    kill_amount_1 INTEGER DEFAULT 0,
    kill_target_2_id TEXT REFERENCES monsters(id),
    kill_amount_2 INTEGER DEFAULT 0,

    -- Gather quest fields
    gather_item_1_id TEXT REFERENCES items(id),
    gather_amount_1 INTEGER DEFAULT 0,
    gather_item_2_id TEXT REFERENCES items(id),
    gather_amount_2 INTEGER DEFAULT 0,
    gather_item_3_id TEXT REFERENCES items(id),
    gather_amount_3 INTEGER DEFAULT 0,
    gather_items TEXT,              -- JSON array with structured gather objectives
    required_items TEXT,            -- JSON array
    equip_items TEXT,               -- JSON array
    given_item_on_start_id TEXT REFERENCES items(id),

    -- Other quest flags
    remove_items_on_complete BOOLEAN DEFAULT 0,
    is_find_npc_quest BOOLEAN DEFAULT 0,
    potions_amount INTEGER DEFAULT 0,
    potion_item_id TEXT REFERENCES items(id),
    increase_alchemy_skill REAL DEFAULT 0.0,
    discovered_location TEXT,
    discovered_location_zone_id TEXT REFERENCES zones(id),
    discovered_location_sub_zone_id TEXT REFERENCES zone_triggers(id),
    discovered_location_position TEXT,    -- JSON: {x, y, z}
    discovered_location_bounds TEXT,      -- JSON: {min_x, min_y, max_x, max_y}
    tracking_quest_location TEXT
);

CREATE INDEX idx_quests_level ON quests(level_required);
CREATE INDEX idx_quests_type ON quests(quest_type);
CREATE INDEX idx_quests_main ON quests(is_main_quest) WHERE is_main_quest = 1;
CREATE INDEX idx_quests_epic ON quests(is_epic_quest) WHERE is_epic_quest = 1;
CREATE INDEX idx_quests_adventurer ON quests(is_adventurer_quest) WHERE is_adventurer_quest = 1;

-- =============================================================================
-- SKILLS
-- =============================================================================

CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    skill_type TEXT NOT NULL,
    tier INTEGER DEFAULT 0,
    max_level INTEGER DEFAULT 1,
    player_classes TEXT,             -- JSON array: ["cleric", "druid"] - classes that have this skill
    level_required INTEGER DEFAULT 0,
    required_skill_points INTEGER DEFAULT 1,
    required_spent_points INTEGER DEFAULT 0,
    prerequisite_skill_id TEXT REFERENCES skills(id),
    prerequisite_level INTEGER DEFAULT 0,
    prerequisite2_level INTEGER DEFAULT 0,
    required_weapon_category TEXT,
    required_weapon_category2 TEXT,

    -- Costs and timing (stored as JSON for SkillBonus: {"base_value": X, "bonus_per_level": Y})
    mana_cost TEXT,
    energy_cost TEXT,
    cooldown TEXT,
    cast_time TEXT,
    cast_range TEXT,

    -- Flags
    learn_default BOOLEAN DEFAULT 0,
    show_cast_bar BOOLEAN DEFAULT 0,
    cancel_cast_if_target_died BOOLEAN DEFAULT 1,
    allow_dungeon BOOLEAN DEFAULT 1,
    is_spell BOOLEAN DEFAULT 0,
    is_veteran BOOLEAN DEFAULT 0,
    is_mercenary_skill BOOLEAN DEFAULT 0,
    is_pet_skill BOOLEAN DEFAULT 0,
    followup_default_attack BOOLEAN DEFAULT 0,

    -- UI
    tooltip_template TEXT,
    icon_path TEXT,
    skill_aggro_message TEXT,
    pet_prefab_name TEXT,

    -- Combat flags
    is_assassination_skill BOOLEAN DEFAULT 0,
    is_manaburn_skill BOOLEAN DEFAULT 0,
    base_skill BOOLEAN DEFAULT 0,
    break_armor_prob REAL DEFAULT 0.0,
    affects_random_target BOOLEAN DEFAULT 0,
    area_object_size REAL DEFAULT 0.0,
    area_object_delay_damage REAL DEFAULT 0.0,
    area_objects_to_spawn INTEGER DEFAULT 0,

    -- Damage/Healing (stored as JSON for SkillBonusValue)
    damage TEXT,                    -- JSON: {"base_value": X, "bonus_per_level": Y}
    damage_percent TEXT,
    damage_type TEXT,
    heals_health TEXT,
    heals_mana TEXT,
    lifetap_percent REAL DEFAULT 0.0,
    aggro TEXT,

    -- Special mechanics
    is_balance_health BOOLEAN DEFAULT 0,
    is_resurrect_skill BOOLEAN DEFAULT 0,
    can_heal_self BOOLEAN DEFAULT 0,
    can_heal_others BOOLEAN DEFAULT 0,
    stun_chance REAL DEFAULT 0.0,
    stun_time REAL DEFAULT 0.0,
    fear_chance REAL DEFAULT 0.0,
    fear_time REAL DEFAULT 0.0,
    knockback_chance REAL DEFAULT 0.0,

    -- Buff/Debuff properties
    duration_base REAL DEFAULT 0.0,
    duration_per_level REAL DEFAULT 0.0,
    remain_after_death BOOLEAN DEFAULT 0,
    buff_category TEXT,
    is_invisibility BOOLEAN DEFAULT 0,
    is_undead_illusion BOOLEAN DEFAULT 0,
    is_poison_debuff BOOLEAN DEFAULT 0,
    is_fire_debuff BOOLEAN DEFAULT 0,
    is_cold_debuff BOOLEAN DEFAULT 0,
    is_disease_debuff BOOLEAN DEFAULT 0,
    is_melee_debuff BOOLEAN DEFAULT 0,
    is_magic_debuff BOOLEAN DEFAULT 0,
    is_cleanse BOOLEAN DEFAULT 0,
    is_dispel BOOLEAN DEFAULT 0,
    is_ward BOOLEAN DEFAULT 0,
    is_blindness BOOLEAN DEFAULT 0,
    is_avatar_war BOOLEAN DEFAULT 0,
    is_only_for_magic_classes BOOLEAN DEFAULT 0,
    is_permanent BOOLEAN DEFAULT 0,
    prob_ignore_cleanse REAL DEFAULT 0.0,
    is_decrease_resists_skill BOOLEAN DEFAULT 0,

    -- Stat bonuses (all stored as JSON for SkillBonusValue)
    health_max_bonus TEXT,
    health_max_percent_bonus TEXT,
    mana_max_bonus TEXT,
    mana_max_percent_bonus TEXT,
    energy_max_bonus TEXT,
    damage_bonus TEXT,
    damage_percent_bonus TEXT,
    magic_damage_percent_bonus TEXT,
    magic_damage_bonus TEXT,
    defense_bonus TEXT,
    magic_resist_bonus TEXT,
    poison_resist_bonus TEXT,
    fire_resist_bonus TEXT,
    cold_resist_bonus TEXT,
    disease_resist_bonus TEXT,
    block_chance_bonus TEXT,
    accuracy_bonus TEXT,
    critical_chance_bonus TEXT,
    haste_bonus TEXT,
    spell_haste_bonus TEXT,
    health_percent_per_second_bonus TEXT,
    healing_per_second_bonus TEXT,
    mana_percent_per_second_bonus TEXT,
    mana_per_second_bonus TEXT,
    energy_percent_per_second_bonus TEXT,
    energy_per_second_bonus TEXT,
    speed_bonus TEXT,
    damage_shield TEXT,
    cooldown_reduction_percent TEXT,
    heal_on_hit_percent TEXT,
    strength_bonus TEXT,
    intelligence_bonus TEXT,
    dexterity_bonus TEXT,
    charisma_bonus TEXT,
    wisdom_bonus TEXT,
    constitution_bonus TEXT,

    -- Special flags
    is_enrage BOOLEAN DEFAULT 0,
    is_familiar BOOLEAN DEFAULT 0,

    -- Denormalized: Items that grant/trigger this skill (as JSON array)
    granted_by_items TEXT           -- JSON: [{"item_id": "scroll_fireball", "type": "scroll"}, {"item_id": "staff_of_flames", "type": "weapon_proc", "probability": 0.15}]
);

CREATE INDEX idx_skills_skill_type ON skills(skill_type);
CREATE INDEX idx_skills_tier ON skills(tier);
CREATE INDEX idx_skills_prerequisite ON skills(prerequisite_skill_id);
CREATE INDEX idx_skills_is_spell ON skills(is_spell) WHERE is_spell = 1;
CREATE INDEX idx_skills_is_veteran ON skills(is_veteran) WHERE is_veteran = 1;

-- =============================================================================
-- PORTALS
-- =============================================================================

CREATE TABLE portals (
    id TEXT PRIMARY KEY,
    is_template BOOLEAN DEFAULT 0,
    from_zone_id TEXT REFERENCES zones(id),
    from_sub_zone_id TEXT REFERENCES zone_triggers(id),
    to_zone_id TEXT REFERENCES zones(id),
    to_sub_zone_id TEXT REFERENCES zone_triggers(id),
    position_x REAL,
    position_y REAL,
    position_z REAL,
    destination_x REAL,
    destination_y REAL,
    destination_z REAL,
    orientation_x REAL DEFAULT 0.0,
    orientation_y REAL DEFAULT 0.0,
    orientation_z REAL DEFAULT 0.0,
    required_item_id TEXT REFERENCES items(id),
    need_monster_dead_id TEXT REFERENCES monsters(id),
    level_required INTEGER DEFAULT 0,
    is_closed BOOLEAN DEFAULT 0,

    -- Search keywords (generated: "portal" + destination zone name)
    keywords TEXT
);

CREATE INDEX idx_portals_from_zone ON portals(from_zone_id);
CREATE INDEX idx_portals_from_sub_zone ON portals(from_sub_zone_id);
CREATE INDEX idx_portals_to_zone ON portals(to_zone_id);
CREATE INDEX idx_portals_to_sub_zone ON portals(to_sub_zone_id);
CREATE INDEX idx_portals_is_template ON portals(is_template) WHERE is_template = 0;

-- =============================================================================
-- TREASURE LOCATIONS (dig spots for treasure maps)
-- =============================================================================

CREATE TABLE treasure_locations (
    id TEXT PRIMARY KEY,
    zone_id TEXT REFERENCES zones(id),
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    position_x REAL,
    position_y REAL,
    position_z REAL,
    required_map_id TEXT REFERENCES items(id),
    reward_id TEXT REFERENCES items(id)
);

CREATE INDEX idx_treasure_locations_zone ON treasure_locations(zone_id);
CREATE INDEX idx_treasure_locations_sub_zone ON treasure_locations(sub_zone_id);
CREATE INDEX idx_treasure_locations_map ON treasure_locations(required_map_id);

-- =============================================================================
-- ZONE TRIGGERS
-- =============================================================================

CREATE TABLE zone_triggers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zone_id INTEGER NOT NULL REFERENCES zones(zone_id),
    is_outdoor BOOLEAN DEFAULT 0,
    position_x REAL,
    position_y REAL,
    position_z REAL,
    bounds_min_x REAL,
    bounds_min_y REAL,
    bounds_max_x REAL,
    bounds_max_y REAL,
    bloom_color TEXT DEFAULT '#FFFFFFFF',
    light_intensity REAL DEFAULT 0.5,
    audio_zone TEXT,
    loop_sounds_zone TEXT
);

CREATE INDEX idx_zone_triggers_zone ON zone_triggers(zone_id);
CREATE INDEX idx_zone_triggers_is_outdoor ON zone_triggers(is_outdoor);

-- =============================================================================
-- GATHERING RESOURCES
-- =============================================================================

CREATE TABLE gathering_resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,

    -- Type flags
    is_plant BOOLEAN DEFAULT 0,
    is_mineral BOOLEAN DEFAULT 0,
    is_radiant_spark BOOLEAN DEFAULT 0,

    -- Gathering properties
    level INTEGER DEFAULT 0,
    tool_required_id TEXT REFERENCES items(id),
    respawn_time REAL DEFAULT 0.0,
    spawn_ready BOOLEAN DEFAULT 0,
    prob_despawn REAL DEFAULT 0.0,

    -- Guaranteed reward (some nodes give fixed item)
    item_reward_id TEXT REFERENCES items(id),
    item_reward_amount INTEGER DEFAULT 0,

    -- EXP reward
    gathering_exp INTEGER,             -- EXP granted when gathering this resource

    -- Metadata
    decrease_faction TEXT DEFAULT '',
    description TEXT DEFAULT '',

    -- Search keywords (generated: plant/mineral/spark based on type flags)
    keywords TEXT
);

CREATE INDEX idx_gathering_resources_type ON gathering_resources(is_plant, is_mineral, is_radiant_spark);
CREATE INDEX idx_gathering_resources_tool ON gathering_resources(tool_required_id);

-- =============================================================================
-- GATHERING RESOURCE DROPS
-- =============================================================================

CREATE TABLE gathering_resource_drops (
    resource_id TEXT NOT NULL REFERENCES gathering_resources(id),
    item_id TEXT NOT NULL REFERENCES items(id),
    drop_rate REAL NOT NULL,  -- Per-roll probability from game data
    actual_drop_chance REAL,  -- Calculated: (1 / num_drops) * drop_rate

    PRIMARY KEY (resource_id, item_id)
);

CREATE INDEX idx_gathering_resource_drops_item ON gathering_resource_drops(item_id);

-- =============================================================================
-- GATHERING RESOURCE SPAWNS
-- =============================================================================

CREATE TABLE gathering_resource_spawns (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES gathering_resources(id),
    zone_id TEXT NOT NULL REFERENCES zones(id),
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    position_x REAL,
    position_y REAL,
    position_z REAL
);

CREATE INDEX idx_gathering_resource_spawns_resource ON gathering_resource_spawns(resource_id);
CREATE INDEX idx_gathering_resource_spawns_zone ON gathering_resource_spawns(zone_id);
CREATE INDEX idx_gathering_resource_spawns_sub_zone ON gathering_resource_spawns(sub_zone_id);

-- =============================================================================
-- CHESTS
-- =============================================================================

CREATE TABLE chests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,

    -- Location
    zone_id TEXT NOT NULL REFERENCES zones(id),
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    position_x REAL,
    position_y REAL,
    position_z REAL,

    -- Requirements
    key_required_id TEXT REFERENCES items(id),

    -- Rewards
    gold_min INTEGER DEFAULT 0,
    gold_max INTEGER DEFAULT 0,
    item_reward_id TEXT REFERENCES items(id),
    item_reward_amount INTEGER DEFAULT 0,
    chest_reward_probability REAL DEFAULT 0.0,

    -- Respawn
    respawn_time REAL DEFAULT 0.0,

    -- Metadata
    decrease_faction TEXT DEFAULT '',
    keywords TEXT                           -- FTS5 search keywords
);

CREATE INDEX idx_chests_zone ON chests(zone_id);
CREATE INDEX idx_chests_sub_zone ON chests(sub_zone_id);
CREATE INDEX idx_chests_key ON chests(key_required_id);

-- =============================================================================
-- CHEST DROPS
-- =============================================================================

CREATE TABLE chest_drops (
    chest_id TEXT NOT NULL REFERENCES chests(id),
    item_id TEXT NOT NULL REFERENCES items(id),
    drop_rate REAL NOT NULL,  -- Per-roll probability from game data
    actual_drop_chance REAL,  -- Calculated: (1 / num_drops) * drop_rate

    PRIMARY KEY (chest_id, item_id)
);

CREATE INDEX idx_chest_drops_item ON chest_drops(item_id);

-- =============================================================================
-- CRAFTING RECIPES
-- =============================================================================

CREATE TABLE crafting_recipes (
    id TEXT PRIMARY KEY,
    result_item_id TEXT REFERENCES items(id),
    result_amount INTEGER DEFAULT 1,

    -- Materials as JSON (denormalized)
    -- Example: [{"item_id": "iron_ore", "amount": 5}, {"item_id": "coal", "amount": 2}]
    materials TEXT,                 -- JSON array

    -- Crafting station requirement
    station_type TEXT,              -- cooking, forge, alchemy_table, etc.

    -- EXP reward
    crafting_exp INTEGER            -- EXP granted when crafting this recipe
);

CREATE INDEX idx_crafting_result ON crafting_recipes(result_item_id);

-- =============================================================================
-- ALCHEMY RECIPES
-- =============================================================================

CREATE TABLE alchemy_recipes (
    id TEXT PRIMARY KEY,
    result_item_id TEXT REFERENCES items(id),
    level_required INTEGER DEFAULT 0,

    -- Materials as JSON (denormalized)
    -- Example: [{"item_id": "healing_herb", "amount": 3}, {"item_id": "water", "amount": 1}]
    materials TEXT,                 -- JSON array

    -- EXP reward
    alchemy_exp INTEGER             -- EXP granted when crafting this potion
);

CREATE INDEX idx_alchemy_result ON alchemy_recipes(result_item_id);
CREATE INDEX idx_alchemy_level ON alchemy_recipes(level_required);

-- =============================================================================
-- ALCHEMY TABLES (world locations)
-- =============================================================================

CREATE TABLE alchemy_tables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zone_id TEXT REFERENCES zones(id),
    zone_name TEXT,
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    sub_zone_name TEXT,
    position_x REAL,
    position_y REAL,
    position_z REAL,

    -- Search keywords (generated: "alchemy crafting")
    keywords TEXT
);

CREATE INDEX idx_alchemy_tables_zone ON alchemy_tables(zone_id);

-- =============================================================================
-- CRAFTING STATIONS (world locations)
-- =============================================================================

CREATE TABLE crafting_stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zone_id TEXT REFERENCES zones(id),
    zone_name TEXT,
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    sub_zone_name TEXT,
    position_x REAL,
    position_y REAL,
    position_z REAL,
    is_cooking_oven BOOLEAN DEFAULT 0,

    -- Search keywords (generated: "forge crafting" or "cooking crafting" based on type)
    keywords TEXT
);

CREATE INDEX idx_crafting_stations_zone ON crafting_stations(zone_id);
CREATE INDEX idx_crafting_stations_cooking ON crafting_stations(is_cooking_oven);

-- =============================================================================
-- FULL-TEXT SEARCH
-- =============================================================================

CREATE VIRTUAL TABLE items_fts USING fts5(
    name,
    tooltip,
    content=items,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE VIRTUAL TABLE monsters_fts USING fts5(
    name,
    keywords,
    content=monsters,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE VIRTUAL TABLE npcs_fts USING fts5(
    name,
    keywords,
    content=npcs,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE VIRTUAL TABLE quests_fts USING fts5(
    name,
    tooltip,
    content=quests,
    content_rowid=rowid,
    prefix='2,3'
);

-- Triggers to keep FTS tables in sync
CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, name, tooltip) VALUES (new.rowid, new.name, new.tooltip);
END;

CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, name, tooltip) VALUES ('delete', old.rowid, old.name, old.tooltip);
END;

CREATE TRIGGER items_au AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, name, tooltip) VALUES ('delete', old.rowid, old.name, old.tooltip);
    INSERT INTO items_fts(rowid, name, tooltip) VALUES (new.rowid, new.name, new.tooltip);
END;

-- Similar triggers for other FTS tables
CREATE TRIGGER monsters_ai AFTER INSERT ON monsters BEGIN
    INSERT INTO monsters_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER monsters_ad AFTER DELETE ON monsters BEGIN
    INSERT INTO monsters_fts(monsters_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
END;

CREATE TRIGGER monsters_au AFTER UPDATE ON monsters BEGIN
    INSERT INTO monsters_fts(monsters_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
    INSERT INTO monsters_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER npcs_ai AFTER INSERT ON npcs BEGIN
    INSERT INTO npcs_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER npcs_ad AFTER DELETE ON npcs BEGIN
    INSERT INTO npcs_fts(npcs_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
END;

CREATE TRIGGER npcs_au AFTER UPDATE ON npcs BEGIN
    INSERT INTO npcs_fts(npcs_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
    INSERT INTO npcs_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER quests_ai AFTER INSERT ON quests BEGIN
    INSERT INTO quests_fts(rowid, name, tooltip) VALUES (new.rowid, new.name, new.tooltip);
END;

CREATE TRIGGER quests_ad AFTER DELETE ON quests BEGIN
    INSERT INTO quests_fts(quests_fts, rowid, name, tooltip) VALUES ('delete', old.rowid, old.name, old.tooltip);
END;

CREATE TRIGGER quests_au AFTER UPDATE ON quests BEGIN
    INSERT INTO quests_fts(quests_fts, rowid, name, tooltip) VALUES ('delete', old.rowid, old.name, old.tooltip);
    INSERT INTO quests_fts(rowid, name, tooltip) VALUES (new.rowid, new.name, new.tooltip);
END;

-- Zones FTS5 (for map search)
CREATE VIRTUAL TABLE zones_fts USING fts5(
    name,
    content=zones,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE TRIGGER zones_ai AFTER INSERT ON zones BEGIN
    INSERT INTO zones_fts(rowid, name) VALUES (new.rowid, new.name);
END;

CREATE TRIGGER zones_ad AFTER DELETE ON zones BEGIN
    INSERT INTO zones_fts(zones_fts, rowid, name) VALUES ('delete', old.rowid, old.name);
END;

CREATE TRIGGER zones_au AFTER UPDATE ON zones BEGIN
    INSERT INTO zones_fts(zones_fts, rowid, name) VALUES ('delete', old.rowid, old.name);
    INSERT INTO zones_fts(rowid, name) VALUES (new.rowid, new.name);
END;

-- Gathering Resources FTS5 (for map search)
CREATE VIRTUAL TABLE gathering_resources_fts USING fts5(
    name,
    keywords,
    content=gathering_resources,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE TRIGGER gathering_resources_ai AFTER INSERT ON gathering_resources BEGIN
    INSERT INTO gathering_resources_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER gathering_resources_ad AFTER DELETE ON gathering_resources BEGIN
    INSERT INTO gathering_resources_fts(gathering_resources_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
END;

CREATE TRIGGER gathering_resources_au AFTER UPDATE ON gathering_resources BEGIN
    INSERT INTO gathering_resources_fts(gathering_resources_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
    INSERT INTO gathering_resources_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

-- Chests FTS5 (for map search)
CREATE VIRTUAL TABLE chests_fts USING fts5(
    name,
    keywords,
    content=chests,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE TRIGGER chests_ai AFTER INSERT ON chests BEGIN
    INSERT INTO chests_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER chests_ad AFTER DELETE ON chests BEGIN
    INSERT INTO chests_fts(chests_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
END;

CREATE TRIGGER chests_au AFTER UPDATE ON chests BEGIN
    INSERT INTO chests_fts(chests_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
    INSERT INTO chests_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

-- Altars FTS5 (for map search)
CREATE VIRTUAL TABLE altars_fts USING fts5(
    name,
    keywords,
    content=altars,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE TRIGGER altars_ai AFTER INSERT ON altars BEGIN
    INSERT INTO altars_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER altars_ad AFTER DELETE ON altars BEGIN
    INSERT INTO altars_fts(altars_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
END;

CREATE TRIGGER altars_au AFTER UPDATE ON altars BEGIN
    INSERT INTO altars_fts(altars_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
    INSERT INTO altars_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

-- Portals FTS5 (for map search - "portal" + destination zone name)
CREATE VIRTUAL TABLE portals_fts USING fts5(
    keywords,
    content=portals,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE TRIGGER portals_ai AFTER INSERT ON portals BEGIN
    INSERT INTO portals_fts(rowid, keywords) VALUES (new.rowid, new.keywords);
END;

CREATE TRIGGER portals_ad AFTER DELETE ON portals BEGIN
    INSERT INTO portals_fts(portals_fts, rowid, keywords) VALUES ('delete', old.rowid, old.keywords);
END;

CREATE TRIGGER portals_au AFTER UPDATE ON portals BEGIN
    INSERT INTO portals_fts(portals_fts, rowid, keywords) VALUES ('delete', old.rowid, old.keywords);
    INSERT INTO portals_fts(rowid, keywords) VALUES (new.rowid, new.keywords);
END;

-- Crafting Stations FTS5 (for map search)
CREATE VIRTUAL TABLE crafting_stations_fts USING fts5(
    name,
    keywords,
    content=crafting_stations,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE TRIGGER crafting_stations_ai AFTER INSERT ON crafting_stations BEGIN
    INSERT INTO crafting_stations_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER crafting_stations_ad AFTER DELETE ON crafting_stations BEGIN
    INSERT INTO crafting_stations_fts(crafting_stations_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
END;

CREATE TRIGGER crafting_stations_au AFTER UPDATE ON crafting_stations BEGIN
    INSERT INTO crafting_stations_fts(crafting_stations_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
    INSERT INTO crafting_stations_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

-- Alchemy Tables FTS5 (for map search)
CREATE VIRTUAL TABLE alchemy_tables_fts USING fts5(
    name,
    keywords,
    content=alchemy_tables,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE TRIGGER alchemy_tables_ai AFTER INSERT ON alchemy_tables BEGIN
    INSERT INTO alchemy_tables_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER alchemy_tables_ad AFTER DELETE ON alchemy_tables BEGIN
    INSERT INTO alchemy_tables_fts(alchemy_tables_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
END;

CREATE TRIGGER alchemy_tables_au AFTER UPDATE ON alchemy_tables BEGIN
    INSERT INTO alchemy_tables_fts(alchemy_tables_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
    INSERT INTO alchemy_tables_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;
