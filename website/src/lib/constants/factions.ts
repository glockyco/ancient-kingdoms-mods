import Shield from "@lucide/svelte/icons/shield";
import Sprout from "@lucide/svelte/icons/sprout";
import Hammer from "@lucide/svelte/icons/hammer";
import Skull from "@lucide/svelte/icons/skull";
import Flame from "@lucide/svelte/icons/flame";
import Sparkles from "@lucide/svelte/icons/sparkles";

export interface FactionAccent {
  icon: typeof Shield;
  /** Icon colour class. */
  color: string;
  /** Badge background class for the overview card. */
  bg: string;
}

/** Icon and colour per faction id. The game exports no faction artwork. */
export const FACTION_ACCENTS: Record<string, FactionAccent> = {
  elven_kingdom: {
    icon: Sprout,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  children_of_illithor: {
    icon: Hammer,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  army_of_order: { icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10" },
  the_forsaken: {
    icon: Skull,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
  },
  dark_alliance: { icon: Flame, color: "text-red-500", bg: "bg-red-500/10" },
  ancient_gods: {
    icon: Sparkles,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
};

export const FACTION_ACCENT_FALLBACK: FactionAccent = {
  icon: Shield,
  color: "text-muted-foreground",
  bg: "bg-muted",
};
