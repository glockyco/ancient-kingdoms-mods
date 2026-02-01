// Wave monster info (parsed from waves JSON)
export interface AltarWaveMonster {
  monster_id: string;
  monster_name: string;
  base_level: number;
  is_boss: boolean;
  is_fabled: boolean;
  is_elite: boolean;
}

// Individual wave data (parsed from waves JSON)
export interface AltarWave {
  wave_number: number;
  init_wave_message: string | null;
  finish_wave_message: string | null;
  seconds_before_start: number;
  seconds_to_complete_wave: number;
  require_all_monsters_cleared: boolean;
  monsters: AltarWaveMonster[];
}

// Reward tier info for display
export interface AltarReward {
  tier: "common" | "magic" | "epic" | "legendary";
  itemId: string | null;
  itemName: string | null;
  quality: number;
  tooltipHtml: string | null;
  dropRate: number | null;
}

// Full altar info for detail page
export interface AltarInfo {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  zoneName: string;
  subZoneId: string | null;
  subZoneName: string | null;
  positionX: number;
  positionY: number;
  positionZ: number;
  minLevelRequired: number;
  requiredActivationItemId: string | null;
  requiredActivationItemName: string | null;
  activationItemTooltipHtml: string | null;
  initEventMessage: string | null;
  radiusEvent: number;
  usesVeteranScaling: boolean;
  totalWaves: number;
  estimatedDurationSeconds: number;
}

// Individual drop from a boss
export interface AltarBossDrop {
  itemId: string;
  itemName: string;
  rate: number;
  quantity: number;
  tooltipHtml: string | null;
}

// Boss info for avatar altars (and forgotten altar final wave)
export interface AltarBoss {
  monsterId: string;
  monsterName: string;
  level: number;
  health: number;
  damage: number;
  magicDamage: number;
  drops: AltarBossDrop[];
}

// Detail page data
export interface AltarDetailPageData {
  altar: AltarInfo;
  description: string;
  rewards: AltarReward[];
  waves: AltarWave[];
  bosses: AltarBoss[];
}

// List view for overview page
export interface AltarListView {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  zoneName: string;
  minLevelRequired: number;
  totalWaves: number;
  usesVeteranScaling: boolean;
  totalEnemies: number;
  bossId: string | null;
  bossName: string | null;
}

// Overview page data
export interface AltarsPageData {
  altars: AltarListView[];
}
