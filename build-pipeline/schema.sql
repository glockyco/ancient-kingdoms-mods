-- Ancient Kingdoms Compendium - Database Schema
-- Design: Optimized for read performance with denormalized data

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =============================================================================
-- STAT VOCABULARY (runtime-exported names and numeric field mappings)
-- =============================================================================

CREATE TABLE stats (
    id TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_key TEXT,
    item_name TEXT,
    item_label TEXT,
    weapon_item_name TEXT,
    override_reason TEXT,
    format TEXT NOT NULL CHECK (format IN ('integer', 'percent', 'decimal')),
    min_value REAL,
    max_value REAL,
    pool_id TEXT REFERENCES stats(id) DEFERRABLE INITIALLY DEFERRED,
    per_point_of TEXT NOT NULL
);

CREATE TABLE stat_fields (
    source TEXT NOT NULL CHECK (source IN ('item', 'skill', 'class', 'pet')),
    field TEXT NOT NULL,
    stat_id TEXT NOT NULL REFERENCES stats(id),
    modifier TEXT NOT NULL CHECK (
        modifier IN ('flat', 'percent', 'per_second', 'percent_of_max_per_second')
    ),
    curve TEXT CHECK (curve IN ('base', 'per_level')),
    PRIMARY KEY (source, field)
);

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
-- VISUAL ASSETS (runtime-exported images copied into website/static/images)
-- =============================================================================

CREATE TABLE visual_assets (
    domain TEXT NOT NULL,              -- monster, npc, item, skill
    entity_id TEXT NOT NULL,
    kind TEXT NOT NULL,                -- primary, icon
    export_path TEXT NOT NULL,         -- original DataExporter path under exported-data/
    public_path TEXT NOT NULL,         -- website/static-relative path
    source_field TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_name TEXT,
    sprite_name TEXT,
    texture_name TEXT,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    PRIMARY KEY (domain, entity_id, kind)
);

CREATE UNIQUE INDEX idx_visual_assets_public_path ON visual_assets(public_path);
CREATE INDEX idx_visual_assets_entity ON visual_assets(domain, entity_id);

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
    description TEXT DEFAULT '',
    min_zoom_map REAL DEFAULT 80.0,
    max_zoom_map REAL DEFAULT 80.0,
    level_min INTEGER,                 -- Min monster level (denormalized, NULL if no monsters)
    level_max INTEGER,                 -- Max monster level (denormalized, NULL if no monsters)
    level_median INTEGER,              -- Median monster level (denormalized, NULL if no monsters)
    discovery_exp INTEGER,             -- EXP granted when discovering this zone
    -- Denormalized bounds from entity positions (monsters, npcs, portals, etc.)
    bounds_min_x REAL,
    bounds_min_y REAL,
    bounds_max_x REAL,
    bounds_max_y REAL
);

CREATE INDEX idx_zones_zone_id ON zones(zone_id);
CREATE INDEX idx_zones_is_dungeon ON zones(is_dungeon);

-- =============================================================================
-- ACHIEVEMENTS
-- =============================================================================

CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    hidden INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL UNIQUE
);

CREATE INDEX idx_achievements_display_order ON achievements(display_order);

-- =============================================================================
-- PROFESSIONS
-- =============================================================================

CREATE TABLE professions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,             -- 'crafting', 'gathering', 'exploration', 'combat'
    icon_path TEXT,
    achievement_id TEXT NOT NULL REFERENCES achievements(id),
    max_level INTEGER DEFAULT 100,
    tracking_type TEXT NOT NULL,        -- 'float_level', 'count_based'
    tracking_denominator INTEGER        -- For count_based professions (e.g., 13 books, 38 zones)
);

CREATE INDEX idx_professions_category ON professions(category);

-- =============================================================================
-- CLASSES (Player Classes)
-- =============================================================================

CREATE TABLE classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    primary_role TEXT NOT NULL,
    secondary_role TEXT,
    difficulty INTEGER NOT NULL,
    resource_type TEXT NOT NULL,
    compatible_races TEXT NOT NULL,      -- JSON array: ["human", "elf", "dwarf"]

    -- Combat stats (LinearInt: actual = base + per_level * (level - 1))
    -- From classes_combat.json (exported from player prefabs at runtime)
    base_health_value INTEGER DEFAULT 0,
    base_health_per_level INTEGER DEFAULT 0,
    base_mana_value INTEGER DEFAULT 0,
    base_mana_per_level INTEGER DEFAULT 0,
    base_energy_value INTEGER DEFAULT 0,
    base_energy_per_level INTEGER DEFAULT 0,
    base_damage_value INTEGER DEFAULT 0,
    base_damage_per_level INTEGER DEFAULT 0,
    base_magic_damage_value INTEGER DEFAULT 0,
    base_magic_damage_per_level INTEGER DEFAULT 0,
    base_defense_value INTEGER DEFAULT 0,
    base_defense_per_level INTEGER DEFAULT 0,
    base_magic_resist_value INTEGER DEFAULT 0,
    base_magic_resist_per_level INTEGER DEFAULT 0,
    base_poison_resist_value INTEGER DEFAULT 0,
    base_poison_resist_per_level INTEGER DEFAULT 0,
    base_fire_resist_value INTEGER DEFAULT 0,
    base_fire_resist_per_level INTEGER DEFAULT 0,
    base_cold_resist_value INTEGER DEFAULT 0,
    base_cold_resist_per_level INTEGER DEFAULT 0,
    base_disease_resist_value INTEGER DEFAULT 0,
    base_disease_resist_per_level INTEGER DEFAULT 0,
    base_block_chance_value REAL DEFAULT 0,
    base_block_chance_per_level REAL DEFAULT 0,
    base_accuracy_value REAL DEFAULT 0,
    base_accuracy_per_level REAL DEFAULT 0,
    base_critical_chance_value REAL DEFAULT 0,
    base_critical_chance_per_level REAL DEFAULT 0
);

-- =============================================================================
-- ARCHETYPE EQUIPMENT SLOTS
-- =============================================================================

CREATE TABLE equipment_slots (
    owner_type TEXT NOT NULL CHECK (owner_type IN ('player', 'mercenary')),
    owner_id TEXT NOT NULL,
    slot_index INTEGER NOT NULL CHECK (slot_index >= 0),
    accepted_category TEXT NOT NULL,
    PRIMARY KEY (owner_type, owner_id, slot_index)
);

CREATE INDEX idx_equipment_slots_owner ON equipment_slots(owner_type, owner_id);

-- =============================================================================
-- ADVENTURER'S GUIDE
-- =============================================================================

-- The in-game guide's articles, in English. The website maps each one to the
-- compendium section that covers it and makes its title searchable.
CREATE TABLE game_guide_articles (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL
);

-- =============================================================================
-- CHARACTER PROGRESSION
-- =============================================================================

CREATE TABLE progression_rules (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    max_level INTEGER NOT NULL CHECK (max_level >= 1),
    max_veteran_points INTEGER NOT NULL CHECK (max_veteran_points >= 0),
    attribute_points_per_veteran INTEGER NOT NULL CHECK (attribute_points_per_veteran >= 0),
    veteran_skill_points_per_veteran INTEGER NOT NULL CHECK (veteran_skill_points_per_veteran >= 0)
);

CREATE TABLE race_progression (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    strength INTEGER NOT NULL,
    constitution INTEGER NOT NULL,
    dexterity INTEGER NOT NULL,
    intelligence INTEGER NOT NULL,
    wisdom INTEGER NOT NULL,
    charisma INTEGER NOT NULL
);

CREATE TABLE class_level_progression (
    class_id TEXT NOT NULL REFERENCES classes(id),
    level INTEGER NOT NULL CHECK (level >= 1),
    strength INTEGER NOT NULL,
    constitution INTEGER NOT NULL,
    dexterity INTEGER NOT NULL,
    intelligence INTEGER NOT NULL,
    wisdom INTEGER NOT NULL,
    charisma INTEGER NOT NULL,
    PRIMARY KEY (class_id, level)
);

CREATE TABLE level_budgets (
    level INTEGER PRIMARY KEY CHECK (level >= 1),
    normal_skill_points INTEGER NOT NULL CHECK (normal_skill_points >= 0),
    attribute_points INTEGER NOT NULL CHECK (attribute_points >= 0)
);

-- =============================================================================
-- LUCK TOKENS
-- =============================================================================

CREATE TABLE luck_tokens (
    zone_id TEXT PRIMARY KEY REFERENCES zones(id),
    zone_name TEXT NOT NULL,
    boss_luck_token_id TEXT REFERENCES items(id),
    fragment_token_id TEXT REFERENCES items(id),
    fragment_amount_needed INTEGER DEFAULT 0
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
    required_activation_item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    required_activation_item_withheld INTEGER NOT NULL DEFAULT 0 CHECK (required_activation_item_withheld IN (0,1)),
    required_activation_item_name TEXT,
    init_event_message TEXT,
    radius_event INTEGER DEFAULT 0,
    -- The event object, not the altar, is the centre of radius_event.
    event_position_x REAL,
    event_position_y REAL,
    event_position_z REAL,
    uses_veteran_scaling BOOLEAN DEFAULT 0,
    reward_common_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    reward_common_withheld INTEGER NOT NULL DEFAULT 0 CHECK (reward_common_withheld IN (0,1)),
    reward_common_name TEXT,
    reward_magic_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    reward_magic_withheld INTEGER NOT NULL DEFAULT 0 CHECK (reward_magic_withheld IN (0,1)),
    reward_magic_name TEXT,
    reward_epic_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    reward_epic_withheld INTEGER NOT NULL DEFAULT 0 CHECK (reward_epic_withheld IN (0,1)),
    reward_epic_name TEXT,
    reward_legendary_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    reward_legendary_withheld INTEGER NOT NULL DEFAULT 0 CHECK (reward_legendary_withheld IN (0,1)),
    reward_legendary_name TEXT,
    magic_reward_threshold INTEGER,
    epic_reward_threshold INTEGER,
    legendary_reward_threshold INTEGER,
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
-- HOUSES (purchase locations)
-- =============================================================================

CREATE TABLE houses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    -- The game applies player-specific modifiers on purchase, so this is the
    -- pre-modifier figure and must be labelled as a base price.
    -- Source: server-scripts/Housing.cs:47 — CalculatePurchaseItemPrice(price_house, player)
    base_price INTEGER NOT NULL DEFAULT 0,
    -- Deliberately not a foreign key to factions(id). The game stores a display
    -- name here, not a normalized id, so exported values look like
    -- "Elven Kingdom". Preserve the exported value rather than inventing a join.
    -- Source: server-scripts/Housing.cs:13 — public string faction_house
    faction_id TEXT,
    faction_required REAL DEFAULT 0,
    zone_id TEXT REFERENCES zones(id),
    zone_name TEXT,
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    sub_zone_name TEXT,
    position_x REAL,
    position_y REAL,
    position_z REAL,
    keywords TEXT
);

CREATE INDEX idx_houses_zone ON houses(zone_id);
CREATE INDEX idx_houses_price ON houses(base_price);


-- =============================================================================
-- ITEMS
-- =============================================================================

CREATE TABLE items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    item_type TEXT,                 -- weapon, armor, consumable, etc.
    quality INTEGER,                -- 0-5 (common to legendary)
    level_required INTEGER DEFAULT 0,
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
    primal_essence_value INTEGER,   -- Game-computed trade amount, NULL when the game refuses the item
    buy_token_id TEXT REFERENCES items(id),
    buy_token_withheld INTEGER NOT NULL DEFAULT 0 CHECK (buy_token_withheld IN (0,1)),
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
    tooltip_stat_fields TEXT NOT NULL DEFAULT '[]',  -- JSON: stat fields whose value tooltip_html states through a placeholder
    comments TEXT DEFAULT '',

    -- Equipment properties
    slot TEXT,
    weapon_category TEXT,
    stats TEXT,                     -- JSON object with equipment stats
    is_costume BOOLEAN DEFAULT 0,
    item_level INTEGER DEFAULT 0,   -- Exported from the game's item-level function

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
    potion_buff_allow_dungeon BOOLEAN DEFAULT 1,
    food_buff_allow_dungeon BOOLEAN DEFAULT 1,
    scroll_skill_allow_dungeon BOOLEAN DEFAULT 1,
    relic_buff_allow_dungeon BOOLEAN DEFAULT 1,
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
    scroll_instant_use BOOLEAN NOT NULL DEFAULT 0,  -- applies on use, without the 1-second scroll cast
    mount_speed REAL DEFAULT 0.0,
    backpack_slots INTEGER DEFAULT 0,
    backpack_is_unique BOOLEAN DEFAULT 0,
    travel_zone_id INTEGER REFERENCES zones(zone_id),
    travel_destination_x REAL,
    travel_destination_y REAL,
    travel_destination_z REAL,
    travel_destination_name TEXT,


    -- Additional item properties
    relic_buff_level INTEGER DEFAULT 0,
    structure_price INTEGER DEFAULT 0,
    weapon_proc_effect_probability REAL DEFAULT 0.0,
    weapon_proc_effect_id TEXT REFERENCES skills(id),
    weapon_proc_effect_name TEXT,
    weapon_proc_on_spell_cast INTEGER NOT NULL DEFAULT 0 CHECK (weapon_proc_on_spell_cast IN (0,1)),
    weapon_delay INTEGER DEFAULT 0,
    weapon_required_ammo_id TEXT REFERENCES items(id),
    weapon_required_ammo_withheld INTEGER NOT NULL DEFAULT 0 CHECK (weapon_required_ammo_withheld IN (0,1)),
    fragment_amount_needed INTEGER DEFAULT 0,
    fragment_result_item_id TEXT REFERENCES items(id),
    fragment_result_item_withheld INTEGER NOT NULL DEFAULT 0 CHECK (fragment_result_item_withheld IN (0,1)),
    fragment_result_item_name TEXT,

    -- Luck token properties
    luck_token_zone_id TEXT,
    luck_token_zone_name TEXT,
    luck_token_role TEXT CHECK (luck_token_role IN ('fatecharm', 'fragment')),
    luck_token_fragment_id TEXT REFERENCES items(id),
    luck_token_fragment_name TEXT,
    luck_token_fragments_needed INTEGER,

    treasure_map_image_location TEXT,

    -- Optional augment/recipe properties
    augment_armor_set_id TEXT,        -- ID of the set bonus item (e.g., "cobalt_armor_bonus_set")
    augment_armor_set_item_ids TEXT,
    augment_armor_set_members TEXT,   -- JSON: [{"item_id": "cobalt_helmet", "item_name": "Cobalt Helmet"}, ...]
    augment_armor_set_name TEXT,
    augment_skill_bonuses TEXT,
    augment_skill_bonuses_with_names TEXT,  -- JSON: [{"skill_id": "combat_training", "skill_name": "Combat Training", "level_bonus": 2}, ...]
    augment_attribute_bonuses TEXT,   -- JSON: [{"stat_id": "strength", "bonus": 10}, ...]
    augment_is_defensive INTEGER,  -- NULL for non-augments; 1=Defensive (armor slots: Head/Chest/Legs/Feet/Hands/Bracers/Belt/Shield), 0=Offensive (weapon slots). Source: server-scripts/AugmentItem.cs isDefensiveAugment
    recipe_potion_learned_id TEXT REFERENCES items(id),
    relic_buff_id TEXT REFERENCES skills(id),
    relic_buff_name TEXT,
    is_ornamentation_token BOOLEAN DEFAULT 0
);

CREATE INDEX idx_items_item_type ON items(item_type);
CREATE INDEX idx_items_slot ON items(slot);
CREATE INDEX idx_items_quality ON items(quality);
CREATE INDEX idx_items_level ON items(level_required);
CREATE INDEX idx_items_weapon_category ON items(weapon_category);

CREATE TABLE fish (
    item_id TEXT PRIMARY KEY REFERENCES items(id),
    is_trash BOOLEAN NOT NULL DEFAULT 0
);
CREATE INDEX idx_fish_trash ON fish(is_trash);



-- =============================================================================
-- SEASONS
-- =============================================================================

-- One row per seasonal event the game configures. The id is the game's season key.
-- The dates are constants in server-scripts/EnviromentSystem.cs:CheckSpecialEvents
-- and live with the website's season presentation.
CREATE TABLE seasons (
    id TEXT PRIMARY KEY,
    ordinal INTEGER NOT NULL UNIQUE,
    buff_skill_id TEXT NOT NULL REFERENCES skills(id) DEFERRABLE INITIALLY DEFERRED
);

-- =============================================================================
-- MONSTERS
-- =============================================================================

-- One row per monster template. Its scalar stat columns hold one spawn's values at one
-- level. Each spawn's level, health, defense, and resistances are in monster_spawns.
-- Derived combat stats such as block chance come from
-- website/src/lib/utils/monster-stats.ts, which follows server-scripts/Combat.cs.
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
    accuracy REAL DEFAULT 0.0,
    -- Combat.fearImmune: fear never lands. Bosses refuse fear regardless.
    fear_immune BOOLEAN NOT NULL DEFAULT 0,

    -- Stat scaling (LinearInt/LinearFloat: actual = base + per_level * (level - 1))
    health_base INTEGER DEFAULT 0,
    health_per_level INTEGER DEFAULT 0,
    health_multiplier REAL DEFAULT 1.0,
    health_regen_base INTEGER DEFAULT 0,
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
    block_chance_base REAL DEFAULT 0.0,
    block_chance_per_level REAL DEFAULT 0.0,
    critical_chance_base REAL DEFAULT 0.0,
    critical_chance_per_level REAL DEFAULT 0.0,
    accuracy_base REAL DEFAULT 0.0,
    accuracy_per_level REAL DEFAULT 0.0,

    -- Mana scaling
    mana INTEGER DEFAULT 0,
    mana_base INTEGER DEFAULT 0,
    mana_per_level INTEGER DEFAULT 0,

    -- Movement and detection
    speed REAL DEFAULT 0.0,
    aggro_range REAL DEFAULT 0.0,

    -- Classification flags
    is_boss BOOLEAN DEFAULT 0,
    is_world_boss BOOLEAN DEFAULT 0,
    is_elite BOOLEAN DEFAULT 0,
    is_fabled BOOLEAN DEFAULT 0,
    is_hunt BOOLEAN DEFAULT 0,
    is_dummy BOOLEAN DEFAULT 0,
    is_summonable BOOLEAN DEFAULT 0,
    season TEXT REFERENCES seasons(id) DEFERRABLE INITIALLY DEFERRED,
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
    loot_pool_id TEXT REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    gold_min INTEGER,
    gold_max INTEGER,
    probability_drop_gold REAL DEFAULT 1.0,
    exp_multiplier REAL DEFAULT 1.0,
    base_exp INTEGER,               -- Pre-computed base EXP reward (before level scaling)

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
CREATE INDEX idx_monsters_fabled ON monsters(is_fabled) WHERE is_fabled = 1;

-- =============================================================================
-- MONSTER SKILLS (junction table linking monsters to their abilities)
-- =============================================================================

CREATE TABLE monster_skills (
    monster_id TEXT NOT NULL REFERENCES monsters(id),
    skill_id TEXT NOT NULL REFERENCES skills(id),
    skill_index INTEGER NOT NULL,   -- 0 = default attack, 1+ = special abilities
    runtime_level INTEGER NOT NULL, -- Skill(ScriptableSkill) uses 1 when learn_default, otherwise 0
    PRIMARY KEY (monster_id, skill_id, skill_index)
);

CREATE INDEX idx_monster_skills_monster ON monster_skills(monster_id);
CREATE INDEX idx_monster_skills_skill ON monster_skills(skill_id);


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
    health INTEGER DEFAULT 0,           -- Runtime HP for this specific spawn (scene instances can override canonical template stats)
    damage INTEGER DEFAULT 0,
    magic_damage INTEGER DEFAULT 0,
    defense INTEGER DEFAULT 0,
    magic_resist INTEGER DEFAULT 0,
    poison_resist INTEGER DEFAULT 0,
    fire_resist INTEGER DEFAULT 0,
    cold_resist INTEGER DEFAULT 0,
    disease_resist INTEGER DEFAULT 0,
    move_probability REAL DEFAULT 0.0,
    move_distance REAL DEFAULT 0.0,
    is_patrolling BOOLEAN DEFAULT 0,
    patrol_waypoints TEXT           -- JSON array

);

CREATE INDEX idx_monster_spawns_monster ON monster_spawns(monster_id);
CREATE INDEX idx_monster_spawns_zone ON monster_spawns(zone_id);
CREATE INDEX idx_monster_spawns_sub_zone ON monster_spawns(sub_zone_id);

-- =============================================================================
-- SUMMON TRIGGERS
-- =============================================================================

CREATE TABLE summon_triggers (
    id TEXT PRIMARY KEY,
    summoned_entity_type TEXT NOT NULL CHECK (summoned_entity_type IN ('Monster','Npc')),
    summoned_entity_id TEXT NOT NULL,      -- References monsters(id) or npcs(id)
    summoned_entity_name TEXT NOT NULL,
    summoned_monster_spawn_id TEXT REFERENCES monster_spawns(id) DEFERRABLE INITIALLY DEFERRED,
    summoned_npc_spawn_id TEXT REFERENCES npc_spawns(id) DEFERRABLE INITIALLY DEFERRED,
    summoned_target_withheld INTEGER NOT NULL DEFAULT 0 CHECK (summoned_target_withheld IN (0,1)),
    summon_message TEXT DEFAULT '',
    spawn_position_x REAL,
    spawn_position_y REAL,
    spawn_position_z REAL,
    zone_id TEXT REFERENCES zones(id),
    -- The placed summon's own values; a trigger only counts a summonable entity as dead.
    summoned_is_summonable BOOLEAN NOT NULL,
    summoned_respawn_time REAL NOT NULL,
    summoned_respawn_probability REAL NOT NULL,
    summoned_death_time REAL, -- NULL for an Npc, whose corpse time is a code constant
    CHECK (
        (summoned_target_withheld=1 AND summoned_monster_spawn_id IS NULL AND summoned_npc_spawn_id IS NULL)
        OR (summoned_target_withheld=0 AND (
            (summoned_entity_type='Monster' AND summoned_monster_spawn_id IS NOT NULL AND summoned_npc_spawn_id IS NULL)
            OR (summoned_entity_type='Npc' AND summoned_npc_spawn_id IS NOT NULL AND summoned_monster_spawn_id IS NULL)
        ))
    )
);

CREATE INDEX idx_summon_triggers_zone ON summon_triggers(zone_id);
CREATE INDEX idx_summon_triggers_entity ON summon_triggers(summoned_entity_id);

-- Ordered current-instance guards. A withheld guard remains an unknown operand.
CREATE TABLE summon_trigger_placeholders (
    id TEXT PRIMARY KEY,
    trigger_id TEXT NOT NULL REFERENCES summon_triggers(id) DEFERRABLE INITIALLY DEFERRED,
    spawn_id TEXT REFERENCES monster_spawns(id) DEFERRABLE INITIALLY DEFERRED,
    placeholder_order INTEGER NOT NULL CHECK (placeholder_order >= 0),
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (trigger_id,placeholder_order),
    CHECK ((spawn_id IS NOT NULL AND withheld=0) OR (spawn_id IS NULL AND withheld=1))
);

CREATE INDEX idx_summon_placeholders_trigger ON summon_trigger_placeholders(trigger_id);
CREATE INDEX idx_summon_placeholders_spawn ON summon_trigger_placeholders(spawn_id);

-- =============================================================================
-- REGIONAL EVENTS (Dynamic Events)
-- =============================================================================

-- The server's Dynamic Events settings. Schedules, goals and rewards are code.
CREATE TABLE regional_event_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled BOOLEAN NOT NULL,
    activity_duration_minutes REAL NOT NULL,
    prosperity_duration_minutes REAL NOT NULL
);

CREATE TABLE regional_invasions (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,                     -- RegionalInvasionCity member, such as 'Elven'
    city_name TEXT NOT NULL,
    zone_id TEXT NOT NULL REFERENCES zones(id),
    health_multiplier REAL NOT NULL,
    minimum_level INTEGER NOT NULL,
    maximum_level INTEGER NOT NULL CHECK (maximum_level >= minimum_level)
);

-- Attackers in the order the waves cycle through them.
CREATE TABLE regional_invasion_attackers (
    invasion_id TEXT NOT NULL REFERENCES regional_invasions(id),
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    monster_id TEXT NOT NULL REFERENCES monsters(id),
    PRIMARY KEY (invasion_id, ordinal)
);

CREATE INDEX idx_regional_invasion_attackers_monster ON regional_invasion_attackers(monster_id);

-- What each event region can host besides herb, ore and invasion requests, as the
-- game's own discovery finds it. Herb, ore and invasion availability are code rules.
CREATE TABLE regional_event_regions (
    zone_id TEXT PRIMARY KEY REFERENCES zones(id),
    fishing BOOLEAN NOT NULL,
    cooking_city TEXT,                      -- RegionalInvasionCity member whose ovens host the cooking request
    cooking_animal TEXT,                    -- the animal whose meat a dish must contain
    CHECK ((cooking_city IS NULL) = (cooking_animal IS NULL))
);

-- Ingredients the game counts as the cooking request's meat.
CREATE TABLE regional_event_cooking_meats (
    region_zone_id TEXT NOT NULL REFERENCES regional_event_regions(zone_id),
    item_id TEXT NOT NULL REFERENCES items(id),
    PRIMARY KEY (region_zone_id, item_id)
);

CREATE INDEX idx_regional_event_cooking_meats_item ON regional_event_cooking_meats(item_id);

-- Dishes that count for the cooking request: made from the meat, directly or through another dish.
CREATE TABLE regional_event_cooking_dishes (
    region_zone_id TEXT NOT NULL REFERENCES regional_event_regions(zone_id),
    item_id TEXT NOT NULL REFERENCES items(id),
    PRIMARY KEY (region_zone_id, item_id)
);

CREATE INDEX idx_regional_event_cooking_dishes_item ON regional_event_cooking_dishes(item_id);

-- Animals a hunting request can ask for, up to the most players whose goal they still meet.
CREATE TABLE regional_event_hunt_targets (
    region_zone_id TEXT NOT NULL REFERENCES regional_event_regions(zone_id),
    monster_id TEXT NOT NULL REFERENCES monsters(id),
    max_players INTEGER NOT NULL CHECK (max_players BETWEEN 1 AND 5),
    PRIMARY KEY (region_zone_id, monster_id)
);

CREATE INDEX idx_regional_event_hunt_targets_monster ON regional_event_hunt_targets(monster_id);

-- Dungeons whose kills count as their region's for Prosperity.
CREATE TABLE regional_event_dungeons (
    dungeon_zone_id TEXT PRIMARY KEY REFERENCES zones(id),
    region_zone_id TEXT NOT NULL REFERENCES regional_event_regions(zone_id)
);

CREATE INDEX idx_regional_event_dungeons_region ON regional_event_dungeons(region_zone_id);

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

    -- Race a mercenary recruiter always hires ('' when unset)
    preferred_mercenary_race TEXT DEFAULT '',


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
    season TEXT REFERENCES seasons(id) DEFERRABLE INITIALLY DEFERRED,
    is_notable BOOLEAN DEFAULT 0,

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

    -- Faction changes (when killed)
    improve_faction TEXT,           -- JSON array
    decrease_faction TEXT,          -- JSON array

    -- Messages
    welcome_messages TEXT,          -- JSON array
    shout_messages TEXT,            -- JSON array
    aggro_messages TEXT,            -- JSON array
    aggro_message_probability REAL DEFAULT 0.0,
    summon_message TEXT DEFAULT '',


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
    -- Total veteran points before the Adventurer offers this quest; 0 means no gate.
    veteran_level_recommended INTEGER NOT NULL DEFAULT 0,

    -- Flags
    is_main_quest BOOLEAN DEFAULT 0,
    is_epic_quest BOOLEAN DEFAULT 0,
    is_adventurer_quest BOOLEAN DEFAULT 0,
    is_repeatable BOOLEAN DEFAULT 0,
    reward_gold INTEGER NOT NULL DEFAULT 0,
    reward_experience INTEGER NOT NULL DEFAULT 0,


    -- UI
    tooltip TEXT,
    tooltip_complete TEXT,
    -- Pre-rendered HTML tooltips per class (JSON object: {"Warrior": "...", "Cleric": "...", etc.})
    tooltip_html TEXT,
    tooltip_complete_html TEXT,


    -- Other quest flags
    remove_items_on_complete BOOLEAN DEFAULT 0,
    is_find_npc_quest BOOLEAN DEFAULT 0,
    increase_alchemy_skill REAL DEFAULT 0.0
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
    class_skill_positions TEXT,      -- JSON object: {"cleric": 12, "druid": 14}
    level_required INTEGER DEFAULT 0,
    required_skill_points INTEGER DEFAULT 1,
    required_spent_points INTEGER DEFAULT 0,
    level_requirement TEXT CHECK (level_requirement IS NULL OR json_valid(level_requirement)),
    skill_point_cost TEXT CHECK (skill_point_cost IS NULL OR json_valid(skill_point_cost)),
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
    -- Engine flag from ScriptableSkill.isScroll, true only when the skill
    -- is owned by a scroll cast scriptable. NOT a reliable "this skill can
    -- be cast from a scroll item" signal. Use granted_by_items entries
    -- with type = 'scroll' for that.
    is_scroll BOOLEAN DEFAULT 0,
    followup_default_attack BOOLEAN DEFAULT 0,

    -- UI
    tooltip_template TEXT,
    icon_path TEXT,
    skill_aggro_message TEXT,
    pet_id TEXT,                  -- References pets(id), loaded after skills

    -- Combat flags
    is_assassination_skill BOOLEAN DEFAULT 0,
    is_manaburn_skill BOOLEAN DEFAULT 0,
    base_skill BOOLEAN DEFAULT 0,
    break_armor_prob REAL DEFAULT 0.0,
    affects_random_target BOOLEAN DEFAULT 0,
    -- AreaDamageSkill.projectile is set: hits travel as projectiles without the caster's maximum Health threat.
    area_projectile BOOLEAN NOT NULL DEFAULT 0,
    area_object_size REAL DEFAULT 0.0,
    area_object_delay_damage REAL DEFAULT 0.0,
    area_objects_to_spawn INTEGER DEFAULT 0,
    -- ChanneledTargetDamageSkill damage pulses; 0 for a skill that is not channeled.
    channel_pulses INTEGER NOT NULL DEFAULT 0,

    -- Damage/Healing (stored as JSON for SkillBonusValue)
    damage TEXT,                    -- JSON: {"base_value": X, "bonus_per_level": Y}
    damage_percent TEXT,
    damage_type TEXT,
    damage_over_time_type TEXT,
    damage_shield_type TEXT,
    heals_health TEXT,
    heals_mana TEXT,
    lifetap_percent TEXT,
    aggro TEXT,

    -- Special mechanics
    is_balance_health BOOLEAN DEFAULT 0,
    is_resurrect_skill BOOLEAN DEFAULT 0,
    can_heal_self BOOLEAN DEFAULT 0,
    can_heal_others BOOLEAN DEFAULT 0,
    can_buff_self BOOLEAN DEFAULT 0,
    can_buff_others BOOLEAN DEFAULT 0,
    is_double_exp_spell BOOLEAN DEFAULT 0,
    -- TargetBuffSkill: a self-cast also buffs the caster's living combat pet in range.
    also_buff_active_pet BOOLEAN NOT NULL DEFAULT 0,

    -- Necromancer skill classes. health_cost_percent is the share of maximum Health
    -- that Blood Pact or Death Bloom spends (Death Bloom authors a flat value).
    is_necromancer_blood_pact BOOLEAN NOT NULL DEFAULT 0,
    is_necromancer_death_bloom BOOLEAN NOT NULL DEFAULT 0,
    is_necromancer_pet_buff BOOLEAN NOT NULL DEFAULT 0,
    is_necromancer_reaper_form BOOLEAN NOT NULL DEFAULT 0,
    health_cost_percent TEXT,
    mana_restored_percent TEXT,
    healing_percent TEXT,
    healing_percent_per_intelligence REAL NOT NULL DEFAULT 0.0,
    stun_chance TEXT,
    stun_time TEXT,
    fear_chance TEXT,
    fear_time TEXT,
    knockback_chance TEXT,
    -- Flat travel distance for a knocked-back victim; not scaled by skill level.
    knockback_distance REAL DEFAULT 0.0,

    -- Buff/Debuff properties
    duration_base REAL DEFAULT 0.0,
    duration_per_level REAL DEFAULT 0.0,
    remain_after_death BOOLEAN DEFAULT 0,
    buff_category TEXT,
    is_invisibility BOOLEAN DEFAULT 0,
    -- Whether the invisibility also hides the target from monsters that see invisibility.
    ignores_see_invisibility BOOLEAN DEFAULT 0,
    is_undead_illusion BOOLEAN DEFAULT 0,
    illusion_race TEXT,
    is_poison_debuff BOOLEAN DEFAULT 0,
    is_fire_debuff BOOLEAN DEFAULT 0,
    is_cold_debuff BOOLEAN DEFAULT 0,
    is_disease_debuff BOOLEAN DEFAULT 0,
    is_melee_debuff BOOLEAN DEFAULT 0,
    is_magic_debuff BOOLEAN DEFAULT 0,
    is_cleanse BOOLEAN DEFAULT 0,
    is_dispel BOOLEAN DEFAULT 0,
    is_mana_shield BOOLEAN DEFAULT 0,
    is_blindness BOOLEAN DEFAULT 0,
    is_avatar_war BOOLEAN DEFAULT 0,
    is_only_for_magic_classes BOOLEAN DEFAULT 0,
    is_permanent BOOLEAN DEFAULT 0,
    prob_ignore_cleanse REAL DEFAULT 0.0,
    is_decrease_resists_skill BOOLEAN DEFAULT 0,
    is_aura BOOLEAN DEFAULT 0,
    is_teleport BOOLEAN DEFAULT 0,
    is_relic BOOLEAN DEFAULT 0,
    scales_with_charisma BOOLEAN DEFAULT 0,
    damage_over_time_bonus_per_charisma_point REAL NOT NULL DEFAULT 0.0,
    scales_with_intelligence BOOLEAN NOT NULL DEFAULT 0,
    poison_disease_scales_with_intelligence BOOLEAN NOT NULL DEFAULT 0,
    damage_over_time_bonus_per_intelligence_point REAL NOT NULL DEFAULT 0.0,
    lifetap_healing_percent_bonus TEXT,
    is_bard_song BOOLEAN DEFAULT 0,
    is_bard_charm BOOLEAN DEFAULT 0,
    is_bard_final_cadence BOOLEAN DEFAULT 0,
    is_bard_virtuosity BOOLEAN DEFAULT 0,
    additional_damage_percent_per_song REAL DEFAULT 0.0,
    charmed_damage_percent TEXT,
    additional_active_bard_songs INTEGER DEFAULT 0,
    unlimited_active_bard_songs BOOLEAN DEFAULT 0,
    bard_song_duration_bonus_per_level REAL DEFAULT 0.0,
    extra_gather_item_chance REAL DEFAULT 0.0,
    food_and_drink_buff_duration_bonus_per_level REAL DEFAULT 0.0,
    damage_over_time_execute_bonus TEXT,

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
    critical_resist_bonus TEXT,
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
    ward_bonus TEXT,
    fear_resist_chance_bonus TEXT,
    fear_resist_chance_bonus_cap REAL NOT NULL DEFAULT 0,

    -- Special flags
    is_enrage BOOLEAN DEFAULT 0,
    is_familiar BOOLEAN DEFAULT 0,

    -- SummonSkillMonsters fields (skill_type = "summon_monsters", boss add-summoning)
    summoned_monster_id TEXT,              -- References monsters(id), no FK due to load order
    summoned_monster_level INTEGER,
    summon_count_per_cast INTEGER,        -- -1 = based on aggro count
    max_active_summons INTEGER,

    -- MercenarySummonSkill companion references, loaded before pets
    archer_pet_id TEXT,
    reaper_pet_id TEXT,

    -- Denormalized: Items that grant/trigger this skill (as JSON array)
    granted_by_items TEXT           -- JSON: [{"item_id": "scroll_fireball", "type": "scroll"}, {"item_id": "staff_of_flames", "type": "weapon_proc", "probability": 0.15}]
);

CREATE INDEX idx_skills_skill_type ON skills(skill_type);
CREATE INDEX idx_skills_tier ON skills(tier);
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
    required_item_withheld INTEGER NOT NULL DEFAULT 0 CHECK (required_item_withheld IN (0,1)),
    requires_everyone_key BOOLEAN NOT NULL DEFAULT 0,
    need_monster_dead_spawn_id TEXT REFERENCES monster_spawns(id) DEFERRABLE INITIALLY DEFERRED,
    need_monster_dead_withheld INTEGER NOT NULL DEFAULT 0 CHECK (need_monster_dead_withheld IN (0,1)),
    destination_withheld INTEGER NOT NULL DEFAULT 0 CHECK (destination_withheld IN (0,1)),
    level_required INTEGER DEFAULT 0,
    item_level_required INTEGER DEFAULT 0,
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
    required_map_withheld INTEGER NOT NULL DEFAULT 0 CHECK (required_map_withheld IN (0,1)),
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
    discovery_exp INTEGER,             -- EXP granted for discovering this named area
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
    loop_sounds_zone TEXT,
    environment_hazard_skill_id TEXT REFERENCES skills(id)
);

CREATE INDEX idx_zone_triggers_zone ON zone_triggers(zone_id);
CREATE INDEX idx_zone_triggers_is_outdoor ON zone_triggers(is_outdoor);

-- =============================================================================
-- TRAPS
-- =============================================================================

CREATE TABLE traps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,

    -- Type discriminator: 'disarmable', 'dangerous_ground', 'wall_trap'
    type TEXT NOT NULL,

    -- Location
    zone_id TEXT NOT NULL REFERENCES zones(id),
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    position_x REAL,
    position_y REAL,
    position_z REAL,

    -- Debuff (disarmable, dangerous_ground) or damage (wall_trap) skill applied
    effect_skill_id TEXT REFERENCES skills(id),

    -- Local activation message shown by disarmable traps
    message TEXT,

    -- Teleport traps (disarmable, dangerous_ground) portal the player instead
    has_teleport BOOLEAN NOT NULL DEFAULT 0,
    teleport_zone_id TEXT REFERENCES zones(id),
    teleport_position_x REAL,
    teleport_position_y REAL,
    teleport_position_z REAL,
    teleport_orientation_x REAL,
    teleport_orientation_y REAL,
    teleport_orientation_z REAL,

    -- Wall traps only: seconds between shots
    fire_interval REAL,

    -- Area the trap covers, one closed ring per collider path in world coordinates
    area_paths TEXT,                        -- JSON: [[[x, y], ...], ...]

    keywords TEXT                           -- FTS5 search keywords
);

CREATE INDEX idx_traps_zone ON traps(zone_id);
CREATE INDEX idx_traps_sub_zone ON traps(sub_zone_id);
CREATE INDEX idx_traps_type ON traps(type);
CREATE INDEX idx_traps_effect_skill ON traps(effect_skill_id);

-- =============================================================================
-- GATHERING RESOURCES
-- =============================================================================

CREATE TABLE gathering_resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,

    -- Type flags
    is_plant BOOLEAN DEFAULT 0,
    is_fishing_spot BOOLEAN DEFAULT 0,
    is_mineral BOOLEAN DEFAULT 0,
    is_radiant_spark BOOLEAN DEFAULT 0,

    -- Gathering properties
    level INTEGER DEFAULT 0,
    tool_required_id TEXT REFERENCES items(id),
    tool_required_withheld INTEGER NOT NULL DEFAULT 0 CHECK (tool_required_withheld IN (0,1)),
    respawn_time REAL DEFAULT 0.0,
    spawn_ready BOOLEAN DEFAULT 0,
    prob_despawn REAL DEFAULT 0.0,

    -- EXP reward
    gathering_exp INTEGER,             -- EXP granted when gathering this resource

    -- Metadata
    decrease_faction TEXT DEFAULT '',
    description TEXT DEFAULT '',

    -- Search keywords (generated: plant/mineral/spark based on type flags)
    keywords TEXT
);

CREATE INDEX idx_gathering_resources_type ON gathering_resources(is_plant, is_fishing_spot, is_mineral, is_radiant_spark);
CREATE INDEX idx_gathering_resources_tool ON gathering_resources(tool_required_id);

-- =============================================================================
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

    -- Respawn
    respawn_time REAL DEFAULT 0.0,

    -- Metadata
    decrease_faction TEXT DEFAULT '',
    keywords TEXT                           -- FTS5 search keywords
);

CREATE INDEX idx_chests_zone ON chests(zone_id);
CREATE INDEX idx_chests_sub_zone ON chests(sub_zone_id);

-- =============================================================================
-- CRAFTING RECIPES
-- =============================================================================

CREATE TABLE crafting_recipes (
    id TEXT PRIMARY KEY,
    result_item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_crafting_result ON crafting_recipes(result_item_id);

-- =============================================================================
-- ALCHEMY RECIPES
-- =============================================================================

CREATE TABLE alchemy_recipes (
    id TEXT PRIMARY KEY,
    result_item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_alchemy_result ON alchemy_recipes(result_item_id);

-- =============================================================================
-- SCRIBING RECIPES
-- =============================================================================

CREATE TABLE scribing_recipes (
    id TEXT PRIMARY KEY,
    result_item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_scribing_result ON scribing_recipes(result_item_id);

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
-- SCRIBING TABLES (world locations)
-- =============================================================================

CREATE TABLE scribing_tables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zone_id TEXT REFERENCES zones(id),
    zone_name TEXT,
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    sub_zone_name TEXT,
    position_x REAL,
    position_y REAL,
    position_z REAL,

    -- Search keywords (generated: "scribing crafting")
    keywords TEXT
);

CREATE INDEX idx_scribing_tables_zone ON scribing_tables(zone_id);

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
-- PETS (familiars, animal pets, and mercenaries from pets.json)
-- =============================================================================

CREATE TABLE pets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_mercenary BOOLEAN DEFAULT 0,
    is_familiar BOOLEAN DEFAULT 0,
    type_monster TEXT NOT NULL,         -- Class archetype (e.g. "Cleric", "Druid")
    level INTEGER NOT NULL,
    -- Level.max: a summoned non-familiar pet takes its owner's level up to this cap.
    level_max INTEGER NOT NULL,
    -- Health.multiplierHealth: maximum Health is round(base Health at level × this).
    health_multiplier REAL NOT NULL,
    mana INTEGER DEFAULT 0,
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
    -- Combat.fearImmune: fear never lands on this pet.
    fear_immune BOOLEAN NOT NULL DEFAULT 0,
    has_buffs BOOLEAN DEFAULT 0,
    has_heals BOOLEAN DEFAULT 0,
    -- Pet.seekTargetBack: whether the pet may reposition behind its target.
    seek_target_back BOOLEAN NOT NULL DEFAULT 1,
    -- NecromancerPetStats keeps the pet at its owner's level and adds a bonus per
    -- owner veteran point.
    has_necromancer_pet_stats BOOLEAN NOT NULL DEFAULT 0,
    icon_path TEXT NOT NULL,

    -- Stat scaling (LinearInt/LinearFloat: actual = base + per_level * (level - 1))
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
    block_chance_base REAL DEFAULT 0.0,
    block_chance_per_level REAL DEFAULT 0.0,
    critical_chance_base REAL DEFAULT 0.0,
    critical_chance_per_level REAL DEFAULT 0.0
);

CREATE TABLE pet_skills (
    pet_id TEXT NOT NULL REFERENCES pets(id),
    skill_id TEXT NOT NULL REFERENCES skills(id),
    skill_index INTEGER NOT NULL,
    is_innate BOOLEAN DEFAULT 0,
    PRIMARY KEY (pet_id, skill_id, skill_index)
);

-- Canonical acquisition facts. Private staging is consumed before closure.
CREATE TABLE acquisition_methods (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('kill','vendor','quest_accept','quest_complete','altar_activate','recipe','gather','world_chest','portable_chest','pack_use','merge','fragment','treasure_dig','blessing','essence','creation','housing','cap_xp')),
    rule_id TEXT NOT NULL CHECK (rule_id IN ('monster_loot','boss_loot','altar_final_loot','placeholder_loot','lootless','vendor','quest_accept','quest_complete','altar_activate','crafting','cooking','alchemy','scribing','herbalism','mining','fishing','radiant','gather_fixed','world_chest','portable_chest','pack_use','merge','fragment','treasure_dig','blessing','essence','creation','housing','cap_xp')),
    setup_method_id TEXT REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    rooted INTEGER NOT NULL DEFAULT 0 CHECK (rooted IN (0,1)),
    source_level_hint INTEGER
);
CREATE TABLE acquisition_cost_groups (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    phase TEXT NOT NULL CHECK (phase IN ('activate','purchase','accept','complete','attempt','use','exchange')),
    quantity_rule TEXT NOT NULL CHECK (quantity_rule IN ('fixed','all_carried','quest_completion')),
    consumption_rule TEXT NOT NULL CHECK (consumption_rule IN ('on_success','before_roll','after_outer_success','quest_inventory_then_equipped','replace_carried_stack')),
    selection_rule TEXT NOT NULL DEFAULT 'always' CHECK (selection_rule IN ('always','chest_key_first','chest_lockpick_fallback'))
);
CREATE TABLE acquisition_inputs (
    id TEXT PRIMARY KEY,
    cost_group_id TEXT NOT NULL REFERENCES acquisition_cost_groups(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    resource_kind TEXT NOT NULL CHECK (resource_kind IN ('item','gold')),
    item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    amount INTEGER NOT NULL CHECK (amount > 0),
    role TEXT NOT NULL CHECK (role IN ('material','currency','activation','key','lockpick','component','fragment','selected_instance','quest_primary','quest_secondary')),
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (cost_group_id,ordinal),
    CHECK ((resource_kind='gold' AND item_id IS NULL AND withheld=0) OR (resource_kind='item' AND ((item_id IS NOT NULL AND withheld=0) OR (item_id IS NULL AND withheld=1))))
);
CREATE TABLE acquisition_outputs (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    resource_kind TEXT NOT NULL CHECK (resource_kind IN ('item','gold')),
    item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    amount_min INTEGER,
    amount_max INTEGER,
    yield_rule TEXT NOT NULL CHECK (yield_rule IN ('fixed','uniform_inclusive','uniform_upper_exclusive','all_carried','extra_gather','radiant','pool')),
    delivery TEXT NOT NULL CHECK (delivery IN ('inventory','keyring','equipment','corpse','placed_structure','quest_progress')),
    slot INTEGER,
    condition_slot INTEGER,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (method_id,ordinal),
    CHECK (resource_kind != 'gold' OR (item_id IS NULL AND withheld=0)),
    CHECK (yield_rule != 'fixed' OR (amount_min IS NOT NULL AND amount_max IS NOT NULL AND amount_min > 0 AND amount_min=amount_max)),
    CHECK (slot IS NULL OR (delivery='equipment' AND slot>=0)),
    CHECK (condition_slot IS NULL OR condition_slot>=0)
);
-- Items that can only be obtained through seasonal content, with the seasons that
-- offer them. Derived from rooted methods, so an item obtained only by opening a
-- seasonal quest reward is seasonal too. Year-round items have no rows.
CREATE TABLE item_seasons (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    season_id TEXT NOT NULL REFERENCES seasons(id) DEFERRABLE INITIALLY DEFERRED,
    UNIQUE (item_id, season_id)
);
CREATE TABLE acquisition_faction_effects (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    event TEXT NOT NULL CHECK (event IN ('corpse_generation','eligible_kill','successful_hook','cast','attempt','successful_opening','opening','parent_award')),
    faction_id TEXT REFERENCES factions(id) DEFERRABLE INITIALLY DEFERRED,
    delta INTEGER NOT NULL,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1))
);
CREATE TABLE acquisition_global_roots (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    origin TEXT NOT NULL CHECK (origin IN ('creation','housing','cap_xp'))
);
CREATE TABLE loot_pools (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('monster','random','portable_chest','resource_secondary','fishing_primary','fishing_trash','fishing_fallback'))
);
CREATE TABLE loot_pool_entries (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    child_pool_id TEXT REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    resolution TEXT NOT NULL CHECK (resolution IN ('direct','uniform_child')),
    probability REAL NOT NULL CHECK (probability >= 0 AND probability <= 1),
    duplicate_group INTEGER NOT NULL CHECK (duplicate_group >= 0),
    cap INTEGER CHECK (cap IS NULL OR cap >= 0),
    counts_equipment INTEGER NOT NULL CHECK (counts_equipment IN (0,1)),
    guaranteed_equipment_candidate INTEGER NOT NULL CHECK (guaranteed_equipment_candidate IN (0,1)),
    quest_gate TEXT NOT NULL CHECK (quest_gate IN ('none','public_need','withheld_need')),
    scales_with_treasure_hunter INTEGER NOT NULL CHECK (scales_with_treasure_hunter IN (0,1)),
    quality INTEGER,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (pool_id,ordinal),
    CHECK ((resolution='direct' AND child_pool_id IS NULL) OR (resolution='uniform_child' AND child_pool_id IS NOT NULL))
);
CREATE TABLE acquisition_method_pools (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    event TEXT NOT NULL CHECK (event IN ('corpse_generation','eligible_kill','successful_hook','cast','attempt','successful_opening','opening','parent_award')),
    UNIQUE (method_id,ordinal)
);
CREATE TABLE loot_monster_rules (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE loot_chest_rules (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    num_items INTEGER NOT NULL CHECK (num_items >= 0)
);
CREATE TABLE loot_fishing_rules (
    id TEXT PRIMARY KEY,
    primary_pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    trash_pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    fallback_pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    spot_tier INTEGER NOT NULL CHECK (spot_tier >= 0)
);
CREATE TABLE acquisition_method_fishing_rules (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL UNIQUE REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    fishing_rule_id TEXT NOT NULL REFERENCES loot_fishing_rules(id) DEFERRABLE INITIALLY DEFERRED,
    CHECK (id=method_id)
);
CREATE TABLE item_pool_definitions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    role TEXT NOT NULL CHECK (role IN ('random','portable_chest'))
);
CREATE TABLE acquisition_kill_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    monster_id TEXT NOT NULL REFERENCES monsters(id) DEFERRABLE INITIALLY DEFERRED,
    loot_pool_id TEXT NOT NULL REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,
    loot_zone_number INTEGER,
    loot_zone_id TEXT REFERENCES zones(id) DEFERRABLE INITIALLY DEFERRED,
    loot_zone_withheld INTEGER NOT NULL DEFAULT 0 CHECK (loot_zone_withheld IN (0,1)),
    respawn INTEGER NOT NULL CHECK (respawn IN (0,1)),
    exp_multiplier REAL NOT NULL,
    is_boss INTEGER NOT NULL CHECK (is_boss IN (0,1)),
    is_elite INTEGER NOT NULL CHECK (is_elite IN (0,1)),
    is_hunt INTEGER NOT NULL CHECK (is_hunt IN (0,1)),
    is_summoned_pet INTEGER NOT NULL CHECK (is_summoned_pet IN (0,1)),
    altar_id TEXT REFERENCES altars(id) DEFERRABLE INITIALLY DEFERRED,
    wave_number INTEGER,
    wave_member_index INTEGER,
    parent_monster_spawn_id TEXT REFERENCES monster_spawns(id) DEFERRABLE INITIALLY DEFERRED,
    event_kind TEXT NOT NULL CHECK (event_kind IN ('authored','altar_final','placeholder','lootless')),
    gold_min INTEGER NOT NULL,
    gold_max INTEGER NOT NULL,
    gold_probability REAL NOT NULL CHECK (gold_probability >= 0 AND gold_probability <= 1),
    CHECK ((loot_zone_withheld=1 AND loot_zone_number IS NULL AND loot_zone_id IS NULL) OR (loot_zone_withheld=0 AND loot_zone_number IS NOT NULL))
);
CREATE TABLE acquisition_vendor_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    npc_id TEXT NOT NULL REFERENCES npcs(id) DEFERRABLE INITIALLY DEFERRED,
    offered_item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    -- Null for a year-round offer.
    season TEXT REFERENCES seasons(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE acquisition_quest_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    phase TEXT NOT NULL CHECK (phase IN ('accept','complete'))
);
CREATE TABLE acquisition_recipe_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    crafting_recipe_id TEXT REFERENCES crafting_recipes(id) DEFERRABLE INITIALLY DEFERRED,
    alchemy_recipe_id TEXT REFERENCES alchemy_recipes(id) DEFERRABLE INITIALLY DEFERRED,
    scribing_recipe_id TEXT REFERENCES scribing_recipes(id) DEFERRABLE INITIALLY DEFERRED,
    declared_result_item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    result_amount INTEGER NOT NULL CHECK (result_amount > 0),
    tier INTEGER NOT NULL CHECK (tier >= 0),
    display_kind TEXT NOT NULL CHECK (display_kind IN ('crafting','cooking','alchemy','scribing')),
    experience INTEGER,
    CHECK ((crafting_recipe_id IS NOT NULL)+(alchemy_recipe_id IS NOT NULL)+(scribing_recipe_id IS NOT NULL)=1)
);
CREATE TABLE acquisition_resource_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    resource_id TEXT NOT NULL REFERENCES gathering_resources(id) DEFERRABLE INITIALLY DEFERRED,
    resource_kind TEXT NOT NULL CHECK (resource_kind IN ('plant','mineral','fishing','radiant','other')),
    outer_success REAL NOT NULL CHECK (outer_success >= 0 AND outer_success <= 1),
    gold_min INTEGER NOT NULL,
    gold_max INTEGER NOT NULL
);
CREATE TABLE acquisition_world_chest_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    chest_id TEXT NOT NULL REFERENCES chests(id) DEFERRABLE INITIALLY DEFERRED,
    key_item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    key_item_withheld INTEGER NOT NULL DEFAULT 0 CHECK (key_item_withheld IN (0,1)),
    outer_success REAL NOT NULL CHECK (outer_success >= 0 AND outer_success <= 1),
    gold_min INTEGER NOT NULL,
    gold_max INTEGER NOT NULL
);
CREATE TABLE acquisition_item_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE acquisition_treasure_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    treasure_location_id TEXT NOT NULL REFERENCES treasure_locations(id) DEFERRABLE INITIALLY DEFERRED,
    map_item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    map_item_withheld INTEGER NOT NULL DEFAULT 0 CHECK (map_item_withheld IN (0,1))
);
CREATE TABLE acquisition_service_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    service_role TEXT NOT NULL CHECK (service_role IN ('blessing','essence'))
);
CREATE TABLE acquisition_creation_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    class_id TEXT NOT NULL REFERENCES classes(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE acquisition_housing_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    structure_item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE acquisition_cap_xp_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    reward_item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE acquisition_altar_details (
    id TEXT PRIMARY KEY REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    altar_id TEXT NOT NULL REFERENCES altars(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE acquisition_providers_monster_spawns (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    monster_spawn_id TEXT NOT NULL REFERENCES monster_spawns(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_npcs (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    npc_id TEXT NOT NULL REFERENCES npcs(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_altars (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    altar_id TEXT NOT NULL REFERENCES altars(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_resource_spawns (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    resource_spawn_id TEXT NOT NULL REFERENCES gathering_resource_spawns(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_chests (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    chest_id TEXT NOT NULL REFERENCES chests(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_crafting_stations (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    crafting_station_id TEXT NOT NULL REFERENCES crafting_stations(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_alchemy_tables (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    alchemy_table_id TEXT NOT NULL REFERENCES alchemy_tables(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_scribing_tables (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    scribing_table_id TEXT NOT NULL REFERENCES scribing_tables(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_items (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_classes (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    class_id TEXT NOT NULL REFERENCES classes(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_providers_treasure_locations (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    treasure_location_id TEXT NOT NULL REFERENCES treasure_locations(id) DEFERRABLE INITIALLY DEFERRED,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE acquisition_home_providers (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL REFERENCES acquisition_methods(id) DEFERRABLE INITIALLY DEFERRED,
    structure_item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    component_path TEXT NOT NULL,
    offer_index INTEGER CHECK (offer_index IS NULL OR offer_index >= 0)
);
CREATE TABLE quest_objectives (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    kind TEXT NOT NULL CHECK (kind IN ('item','monster','location','brew')),
    role TEXT NOT NULL CHECK (role IN ('gather_counter','inventory_primary','inventory_secondary','equipped','kill_counter','location_visit','tracking_location','brew_counter')),
    amount INTEGER,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (quest_id,ordinal),
    CHECK ((kind='location' AND amount IS NULL) OR (kind!='location' AND amount>0))
);
CREATE TABLE quest_objective_items (
    id TEXT PRIMARY KEY REFERENCES quest_objectives(id) DEFERRABLE INITIALLY DEFERRED,
    item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE quest_objective_monsters (
    id TEXT PRIMARY KEY REFERENCES quest_objectives(id) DEFERRABLE INITIALLY DEFERRED,
    monster_id TEXT REFERENCES monsters(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE quest_objective_brews (
    id TEXT PRIMARY KEY REFERENCES quest_objectives(id) DEFERRABLE INITIALLY DEFERRED,
    item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE quest_objective_locations (
    id TEXT PRIMARY KEY REFERENCES quest_objectives(id) DEFERRABLE INITIALLY DEFERRED,
    zone_id TEXT REFERENCES zones(id) DEFERRABLE INITIALLY DEFERRED,
    sub_zone_id TEXT REFERENCES zone_triggers(id) DEFERRABLE INITIALLY DEFERRED,
    discovered_location TEXT,
    position_x REAL,
    position_y REAL,
    position_z REAL,
    area_shape TEXT CHECK (area_shape IN ('circle','polygon')),
    area_radius REAL,                       -- circle radius around position_x/position_y
    area_paths TEXT,                        -- JSON polygon rings: [[[x, y], ...]]
    tracking_quest_location TEXT
);
CREATE TABLE quest_predecessors (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    predecessor_quest_id TEXT REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (quest_id,ordinal)
);
CREATE TABLE quest_class_requirements (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    class_id TEXT REFERENCES classes(id) DEFERRABLE INITIALLY DEFERRED,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (quest_id,ordinal)
);
CREATE TABLE quest_race_requirements (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    race_id TEXT REFERENCES race_progression(id) DEFERRABLE INITIALLY DEFERRED,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (quest_id,ordinal)
);
CREATE TABLE quest_faction_requirements (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    faction_id TEXT REFERENCES factions(id) DEFERRABLE INITIALLY DEFERRED,
    standing INTEGER NOT NULL,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (quest_id,ordinal)
);
CREATE TABLE quest_reward_slots (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    slot_kind TEXT NOT NULL CHECK (slot_kind IN ('shared','class')),
    class_id TEXT REFERENCES classes(id) DEFERRABLE INITIALLY DEFERRED,
    item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    class_withheld INTEGER NOT NULL DEFAULT 0 CHECK (class_withheld IN (0,1)),
    item_withheld INTEGER NOT NULL DEFAULT 0 CHECK (item_withheld IN (0,1)),
    amount INTEGER NOT NULL CHECK (amount > 0),
    UNIQUE (quest_id,ordinal),
    CHECK ((slot_kind='shared' AND class_id IS NULL AND class_withheld=0) OR (slot_kind='class' AND (class_id IS NOT NULL OR class_withheld=1)))
);
CREATE TABLE quest_provided_items (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    item_id TEXT REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    amount INTEGER NOT NULL CHECK (amount > 0),
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (quest_id,ordinal)
);
CREATE TABLE npc_quest_memberships (
    id TEXT PRIMARY KEY,
    npc_id TEXT NOT NULL REFERENCES npcs(id) DEFERRABLE INITIALLY DEFERRED,
    quest_id TEXT NOT NULL REFERENCES quests(id) DEFERRABLE INITIALLY DEFERRED,
    role TEXT NOT NULL CHECK (role IN ('offer','complete')),
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    UNIQUE (npc_id,role,ordinal)
);
CREATE TABLE npc_skills (
    id TEXT PRIMARY KEY,
    npc_id TEXT NOT NULL REFERENCES npcs(id) DEFERRABLE INITIALLY DEFERRED,
    skill_id TEXT NOT NULL REFERENCES skills(id) DEFERRABLE INITIALLY DEFERRED,
    skill_index INTEGER NOT NULL CHECK (skill_index >= 0),
    UNIQUE (npc_id,skill_index)
);
CREATE TABLE item_class_requirements (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    class_id TEXT REFERENCES classes(id) DEFERRABLE INITIALLY DEFERRED,
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (item_id,ordinal)
);
CREATE TABLE skill_predecessors (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL REFERENCES skills(id) DEFERRABLE INITIALLY DEFERRED,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    predecessor_skill_id TEXT REFERENCES skills(id) DEFERRABLE INITIALLY DEFERRED,
    rank INTEGER NOT NULL CHECK (rank >= 0),
    withheld INTEGER NOT NULL DEFAULT 0 CHECK (withheld IN (0,1)),
    UNIQUE (skill_id,ordinal)
);

CREATE TABLE _acquisition_input_items (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_skills (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_monsters (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_monster_spawns (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_npcs (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_quests (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_gathering (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_crafting_recipes (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_alchemy_recipes (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_scribing_recipes (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_crafting_stations (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_alchemy_tables (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_scribing_tables (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TABLE _acquisition_input_game_config (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK (json_valid(payload))
);

CREATE INDEX idx_acquisition_methods_setup ON acquisition_methods(setup_method_id);
CREATE INDEX idx_acquisition_cost_groups_method ON acquisition_cost_groups(method_id);
CREATE INDEX idx_acquisition_inputs_item ON acquisition_inputs(item_id);
CREATE INDEX idx_acquisition_outputs_item ON acquisition_outputs(item_id);
CREATE INDEX idx_acquisition_faction_effects_method ON acquisition_faction_effects(method_id);
CREATE INDEX idx_acquisition_faction_effects_faction ON acquisition_faction_effects(faction_id);
CREATE INDEX idx_acquisition_global_roots_method ON acquisition_global_roots(method_id);
CREATE INDEX idx_acquisition_method_pools_pool ON acquisition_method_pools(pool_id);
CREATE INDEX idx_loot_pool_entries_item ON loot_pool_entries(item_id);
CREATE INDEX idx_loot_pool_entries_child ON loot_pool_entries(child_pool_id);
CREATE INDEX idx_loot_monster_rules_pool ON loot_monster_rules(pool_id);
CREATE INDEX idx_loot_chest_rules_pool ON loot_chest_rules(pool_id);
CREATE INDEX idx_loot_fishing_rules_primary ON loot_fishing_rules(primary_pool_id);
CREATE INDEX idx_loot_fishing_rules_trash ON loot_fishing_rules(trash_pool_id);
CREATE INDEX idx_loot_fishing_rules_fallback ON loot_fishing_rules(fallback_pool_id);
CREATE INDEX idx_acquisition_method_fishing_rules_rule ON acquisition_method_fishing_rules(fishing_rule_id);
CREATE INDEX idx_item_pool_definitions_item ON item_pool_definitions(item_id);
CREATE INDEX idx_item_pool_definitions_pool ON item_pool_definitions(pool_id);
CREATE INDEX idx_monsters_loot_pool ON monsters(loot_pool_id);
CREATE INDEX idx_acquisition_kill_details_monster ON acquisition_kill_details(monster_id);
CREATE INDEX idx_acquisition_kill_details_pool ON acquisition_kill_details(loot_pool_id);
CREATE INDEX idx_acquisition_kill_details_zone ON acquisition_kill_details(loot_zone_id);
CREATE INDEX idx_acquisition_kill_details_altar ON acquisition_kill_details(altar_id);
CREATE INDEX idx_acquisition_kill_details_parent ON acquisition_kill_details(parent_monster_spawn_id);
CREATE INDEX idx_acquisition_vendor_details_npc ON acquisition_vendor_details(npc_id);
CREATE INDEX idx_acquisition_vendor_details_item ON acquisition_vendor_details(offered_item_id);
CREATE INDEX idx_acquisition_quest_details_quest ON acquisition_quest_details(quest_id);
CREATE INDEX idx_acquisition_recipe_details_crafting ON acquisition_recipe_details(crafting_recipe_id);
CREATE INDEX idx_acquisition_recipe_details_alchemy ON acquisition_recipe_details(alchemy_recipe_id);
CREATE INDEX idx_acquisition_recipe_details_scribing ON acquisition_recipe_details(scribing_recipe_id);
CREATE INDEX idx_acquisition_recipe_details_item ON acquisition_recipe_details(declared_result_item_id);
CREATE INDEX idx_acquisition_resource_details_resource ON acquisition_resource_details(resource_id);
CREATE INDEX idx_acquisition_world_chest_details_chest ON acquisition_world_chest_details(chest_id);
CREATE INDEX idx_acquisition_world_chest_details_key ON acquisition_world_chest_details(key_item_id);
CREATE INDEX idx_acquisition_item_details_item ON acquisition_item_details(item_id);
CREATE INDEX idx_acquisition_treasure_details_location ON acquisition_treasure_details(treasure_location_id);
CREATE INDEX idx_acquisition_treasure_details_map ON acquisition_treasure_details(map_item_id);
CREATE INDEX idx_acquisition_creation_details_class ON acquisition_creation_details(class_id);
CREATE INDEX idx_acquisition_housing_details_item ON acquisition_housing_details(structure_item_id);
CREATE INDEX idx_acquisition_cap_xp_details_item ON acquisition_cap_xp_details(reward_item_id);
CREATE INDEX idx_acquisition_altar_details_altar ON acquisition_altar_details(altar_id);
CREATE INDEX idx_acquisition_providers_monster_spawns_method ON acquisition_providers_monster_spawns(method_id);
CREATE INDEX idx_acquisition_providers_monster_spawns_target ON acquisition_providers_monster_spawns(monster_spawn_id);
CREATE INDEX idx_acquisition_providers_npcs_method ON acquisition_providers_npcs(method_id);
CREATE INDEX idx_acquisition_providers_npcs_target ON acquisition_providers_npcs(npc_id);
CREATE INDEX idx_acquisition_providers_altars_method ON acquisition_providers_altars(method_id);
CREATE INDEX idx_acquisition_providers_altars_target ON acquisition_providers_altars(altar_id);
CREATE INDEX idx_acquisition_providers_resource_spawns_method ON acquisition_providers_resource_spawns(method_id);
CREATE INDEX idx_acquisition_providers_resource_spawns_target ON acquisition_providers_resource_spawns(resource_spawn_id);
CREATE INDEX idx_acquisition_providers_chests_method ON acquisition_providers_chests(method_id);
CREATE INDEX idx_acquisition_providers_chests_target ON acquisition_providers_chests(chest_id);
CREATE INDEX idx_acquisition_providers_crafting_stations_method ON acquisition_providers_crafting_stations(method_id);
CREATE INDEX idx_acquisition_providers_crafting_stations_target ON acquisition_providers_crafting_stations(crafting_station_id);
CREATE INDEX idx_acquisition_providers_alchemy_tables_method ON acquisition_providers_alchemy_tables(method_id);
CREATE INDEX idx_acquisition_providers_alchemy_tables_target ON acquisition_providers_alchemy_tables(alchemy_table_id);
CREATE INDEX idx_acquisition_providers_scribing_tables_method ON acquisition_providers_scribing_tables(method_id);
CREATE INDEX idx_acquisition_providers_scribing_tables_target ON acquisition_providers_scribing_tables(scribing_table_id);
CREATE INDEX idx_acquisition_providers_items_method ON acquisition_providers_items(method_id);
CREATE INDEX idx_acquisition_providers_items_target ON acquisition_providers_items(item_id);
CREATE INDEX idx_acquisition_providers_classes_method ON acquisition_providers_classes(method_id);
CREATE INDEX idx_acquisition_providers_classes_target ON acquisition_providers_classes(class_id);
CREATE INDEX idx_acquisition_providers_treasure_locations_method ON acquisition_providers_treasure_locations(method_id);
CREATE INDEX idx_acquisition_providers_treasure_locations_target ON acquisition_providers_treasure_locations(treasure_location_id);
CREATE INDEX idx_acquisition_home_providers_method ON acquisition_home_providers(method_id);
CREATE INDEX idx_acquisition_home_providers_item ON acquisition_home_providers(structure_item_id);
CREATE INDEX idx_quest_objective_items_item ON quest_objective_items(item_id);
CREATE INDEX idx_quest_objective_monsters_monster ON quest_objective_monsters(monster_id);
CREATE INDEX idx_quest_objective_brews_item ON quest_objective_brews(item_id);
CREATE INDEX idx_quest_objective_locations_zone ON quest_objective_locations(zone_id);
CREATE INDEX idx_quest_objective_locations_sub_zone ON quest_objective_locations(sub_zone_id);
CREATE INDEX idx_quest_predecessors_target ON quest_predecessors(predecessor_quest_id);
CREATE INDEX idx_quest_class_requirements_target ON quest_class_requirements(class_id);
CREATE INDEX idx_quest_race_requirements_target ON quest_race_requirements(race_id);
CREATE INDEX idx_quest_faction_requirements_target ON quest_faction_requirements(faction_id);
CREATE INDEX idx_quest_reward_slots_class ON quest_reward_slots(class_id);
CREATE INDEX idx_quest_reward_slots_item ON quest_reward_slots(item_id);
CREATE INDEX idx_quest_provided_items_item ON quest_provided_items(item_id);
CREATE INDEX idx_npc_quest_memberships_quest ON npc_quest_memberships(quest_id);
CREATE INDEX idx_npc_skills_skill ON npc_skills(skill_id);
CREATE INDEX idx_item_class_requirements_class ON item_class_requirements(class_id);
CREATE INDEX idx_skill_predecessors_target ON skill_predecessors(predecessor_skill_id);
CREATE INDEX idx_portals_monster_gate ON portals(need_monster_dead_spawn_id);
CREATE INDEX idx_altars_activation_item ON altars(required_activation_item_id);
CREATE INDEX idx_altars_reward_common ON altars(reward_common_id);
CREATE INDEX idx_altars_reward_magic ON altars(reward_magic_id);
CREATE INDEX idx_altars_reward_epic ON altars(reward_epic_id);
CREATE INDEX idx_altars_reward_legendary ON altars(reward_legendary_id);
CREATE INDEX idx_summon_triggers_monster_target ON summon_triggers(summoned_monster_spawn_id);
CREATE INDEX idx_summon_triggers_npc_target ON summon_triggers(summoned_npc_spawn_id);
