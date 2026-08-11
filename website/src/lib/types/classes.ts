/**
 * Player class types
 */

/**
 * Player class from the database
 */
export interface Class {
  id: string;
  name: string;
  description: string;
  primary_role: string;
  secondary_role: string | null;
  difficulty: number;
  resource_type: string;
  compatible_races: string; // JSON array
  game_version: string;
  /** Published class/icon artwork, when the optional visual asset exists. */
  visual_public_path: string | null;
  visual_width: number | null;
  visual_height: number | null;
  visual_source_field: string | null;
  visual_source_type: string | null;
}
