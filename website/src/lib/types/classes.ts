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
}
