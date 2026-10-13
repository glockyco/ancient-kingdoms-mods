import { createContext } from "svelte";
import type { MechanicsContext } from "$lib/skills/mechanics-sections";

/**
 * The skill the mechanics card describes. `MechanicsCard` provides it, and each section that
 * shows skill data reads it, so sections with fixed text need no props.
 */
export const [getMechanicsContext, setMechanicsContext] =
  createContext<MechanicsContext>();
