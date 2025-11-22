import { query, queryOne } from "$lib/db";

export interface Altar {
  id: string;
  name: string;
  type: string;
  zone_id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  min_level_required: number;
  required_activation_item_id: string | null;
  required_activation_item_name: string | null;
  init_event_message: string | null;
  radius_event: number;
  uses_veteran_scaling: boolean;
  reward_normal_id: string | null;
  reward_normal_name: string | null;
  reward_magic_id: string | null;
  reward_magic_name: string | null;
  reward_epic_id: string | null;
  reward_epic_name: string | null;
  reward_legendary_id: string | null;
  reward_legendary_name: string | null;
  total_waves: number;
  estimated_duration_seconds: number;
  waves: string; // JSON
}

/**
 * Get all altars.
 */
export async function getAltars(): Promise<Altar[]> {
  return query<Altar>("SELECT * FROM altars ORDER BY name");
}

/**
 * Get a single altar by ID.
 */
export async function getAltarById(id: string): Promise<Altar | null> {
  return queryOne<Altar>("SELECT * FROM altars WHERE id = ?", [id]);
}
