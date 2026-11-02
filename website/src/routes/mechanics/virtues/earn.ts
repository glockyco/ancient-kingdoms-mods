// How each virtue earns points, worded after the game's Adventurer's Guide.
import Coins from "@lucide/svelte/icons/coins";
import Crosshair from "@lucide/svelte/icons/crosshair";
import DoorOpen from "@lucide/svelte/icons/door-open";
import Footprints from "@lucide/svelte/icons/footprints";
import Hand from "@lucide/svelte/icons/hand";
import Handshake from "@lucide/svelte/icons/handshake";
import HeartPulse from "@lucide/svelte/icons/heart-pulse";
import Landmark from "@lucide/svelte/icons/landmark";
import LogOut from "@lucide/svelte/icons/log-out";
import Route from "@lucide/svelte/icons/route";
import Search from "@lucide/svelte/icons/search";
import Shield from "@lucide/svelte/icons/shield";
import ShieldOff from "@lucide/svelte/icons/shield-off";
import Skull from "@lucide/svelte/icons/skull";
import Swords from "@lucide/svelte/icons/swords";
import Target from "@lucide/svelte/icons/target";
import UserRound from "@lucide/svelte/icons/user-round";
import type { Component } from "svelte";
import {
  COMPASSION_SPARE_BASE_POINTS,
  HUMILITY_KILL_BASE_POINTS,
  SACRIFICE_GOLD_PER_POINT,
  SACRIFICE_ITEM_LEVELS_PER_POINT,
  combatPoints,
  valorPoints,
  valorQuarryLevels,
  type VirtueId,
} from "$lib/calculation/virtues";
import type { VirtueRules } from "$lib/queries/virtues.server";
import { formatNumber } from "$lib/utils/format";

export interface Reward {
  value: string;
  unit: string;
  /** Why the value varies, shown on hover. */
  reason?: string;
}

export interface EarnMethod {
  name: string;
  icon: Component;
  steps: { icon: Component; text: string }[];
  rewards: Reward[];
  notes: string[];
  /** Where the page or other pages list this method's values. */
  link?: { href: string; text: string };
}

export interface RuleGroup {
  title: string;
  kind: "ok" | "no" | "info";
  items: string[];
}

/** The range a kill or spare gives: the base, up to 5 more against a stronger monster. */
function combatRange(base: number): string {
  return `+${base} to +${combatPoints(base, 0, 10)}`;
}

// Source: server-scripts/VirtueRules.cs:CombatPoints — 1 more point per 2 levels the monster is above you.
const LEVEL_BONUS = "plus 1 for every 2 levels the monster is above you";

export function earnMethods(
  rules: VirtueRules,
): Record<VirtueId, EarnMethod[]> {
  const [quarryMin, quarryMax] = valorQuarryLevels(0);
  return {
    compassion: [
      {
        name: "Spare a fleeing monster",
        icon: Hand,
        steps: [
          {
            icon: Swords,
            text: "Fight a monster near your level or stronger until it flees",
          },
          // Source: server-scripts/VirtueCombat.cs:Tick — you stay within 60 yd while it recovers.
          {
            icon: Footprints,
            text: "Stop attacking and stay within 60\u00a0yd",
          },
          {
            icon: HeartPulse,
            text: "Wait until it leaves combat and recovers fully",
          },
        ],
        rewards: [
          {
            value: combatRange(COMPASSION_SPARE_BASE_POINTS),
            unit: "per monster",
          },
        ],
        notes: [
          `${COMPASSION_SPARE_BASE_POINTS} points, ${LEVEL_BONUS}. A monster counts once until it respawns.`,
        ],
      },
      {
        name: "Lead a stranded adventurer out",
        icon: DoorOpen,
        steps: [
          { icon: DoorOpen, text: "Enter a dungeon with the blessing active" },
          { icon: UserRound, text: "Find the stranded adventurer" },
          { icon: Route, text: "Lead them safely out of the dungeon" },
        ],
        rewards: [{ value: `+${rules.escort_points}`, unit: "per escort" }],
        notes: [
          // Source: server-scripts/VirtueEscort.cs:OnInteractServer,ServerTick — 15 minutes from talking to them, and a 35 yd leash.
          "Once you talk to them, monsters can attack them and you have 15\u00a0minutes. The escort ends if they die or you get more than 35\u00a0yd away.",
          // Source: server-scripts/VirtueEncounters.cs:TryClaimEscort — at least 30 minutes until the next escort.
          "One escort every 30\u00a0minutes. An escort you finish counts even after the blessing ends.",
        ],
        link: {
          href: "#stranded-adventurers",
          text: "Each dungeon's adventurer is listed below.",
        },
      },
    ],
    honor: [
      {
        name: "Win a fair fight",
        icon: Swords,
        steps: [
          {
            icon: Target,
            text: "Pick a monster at full Health, near your level or stronger",
          },
          { icon: Shield, text: "Let it hit you first" },
          {
            icon: LogOut,
            text: "Win, then leave combat to receive your points",
          },
        ],
        rewards: [
          {
            value: "Varies",
            unit: "by monster",
            reason:
              "Monsters with more Health for their level give more points. Elites give twice as many, bosses three times.",
          },
        ],
        notes: [
          "Monsters above your level give more, up to twice as many at 10 levels above you.",
          "Monsters that join the fight give a tenth of their points, but elites and bosses give all of theirs.",
        ],
        link: {
          href: "/monsters",
          text: "Each monster's page shows its Honor points.",
        },
      },
    ],
    sacrifice: [
      {
        name: "Make an offering",
        icon: Coins,
        steps: [
          { icon: Coins, text: "Bring gold and up to 3 pieces of equipment" },
          { icon: Landmark, text: "Offer them at a Shrine of Sacrifice" },
        ],
        rewards: [
          {
            value: "+1",
            unit: `per ${formatNumber(SACRIFICE_GOLD_PER_POINT)} gold`,
          },
          {
            value: "+1",
            unit: `per ${SACRIFICE_ITEM_LEVELS_PER_POINT} item levels`,
          },
        ],
        notes: [],
        link: {
          href: "#offering",
          text: "Each equipment page shows what it is worth in an offering.",
        },
      },
    ],
    humility: [
      {
        name: "Fight with weaker defenses",
        icon: ShieldOff,
        steps: [
          {
            icon: ShieldOff,
            text: "Take the blessing, which halves your defenses at first",
          },
          // Source: server-scripts/VirtueCombat.cs:IsHumilitySolo — no active mercenaries and no other player in the party.
          {
            icon: Swords,
            text: "Defeat monsters near your level or stronger, without active mercenaries or other players in your party",
          },
        ],
        rewards: [
          {
            value: combatRange(HUMILITY_KILL_BASE_POINTS),
            unit: "per monster",
          },
        ],
        notes: [`${HUMILITY_KILL_BASE_POINTS} points, ${LEVEL_BONUS}.`],
      },
    ],
    honesty: [
      {
        name: "Return lost belongings",
        icon: Handshake,
        steps: [
          {
            icon: Search,
            text: "Explore regions and dungeons for lost belongings",
          },
          { icon: UserRound, text: "Pick one up. Its tooltip names the owner" },
          {
            icon: Handshake,
            text: "Speak to the owner with it in your bags, out of combat",
          },
        ],
        rewards: [{ value: `+${rules.return_points}`, unit: "per belonging" }],
        notes: [],
      },
    ],
    valor: [
      {
        name: "Defeat your quarry",
        icon: Crosshair,
        steps: [
          {
            icon: Landmark,
            text: "The shrine names an elite or boss in a dungeon",
          },
          { icon: Skull, text: "Help defeat it while Valor is active" },
          { icon: Landmark, text: "Return to a Shrine of Valor for the next" },
        ],
        rewards: [
          { value: `+${valorPoints(true)}`, unit: "per boss" },
          { value: `+${valorPoints(false)}`, unit: "per elite" },
        ],
        notes: [
          `Quarries are elites and bosses from ${-quarryMin} levels below you to ${quarryMax} above.`,
        ],
        link: {
          href: "#quarries",
          text: "The quarries for your level are listed below.",
        },
      },
    ],
  };
}

export const VIRTUE_RULES: Record<VirtueId, RuleGroup[]> = {
  compassion: [],
  honor: [
    {
      title: "Allowed",
      kind: "ok",
      items: [
        "Your own pet",
        "Effects that only deal damage over time",
        "Monsters that join the fight",
      ],
    },
    {
      // Source: server-scripts/VirtueCombat.cs:CancelHonor,Assistance,SettleHonorIfFinished — the fight's points are lost.
      title: "The fight gives no points",
      kind: "no",
      items: [
        "Active mercenaries",
        "Help or heals from another player",
        "Healing potions and bandages",
        "Using a portal",
        "Dying",
      ],
    },
    {
      // Source: server-scripts/VirtueCombat.cs:HostileAction,MonsterHit,BuffApplied,CrowdControl — that monster does not count.
      title: "That monster gives no points",
      kind: "no",
      items: [
        "Hitting it before it hits you",
        "Stuns, removing its buffs, or debuffs that do more than damage",
        "Someone else fighting it",
      ],
    },
  ],
  sacrifice: [
    {
      title: "Good to know",
      kind: "info",
      items: [
        "Common equipment and anything you cannot sell or destroy do not count.",
        "A fitted augment adds to the offering and is lost with it.",
        "Each offering starts or renews the blessing. At rank 5 the blessing is free.",
      ],
    },
  ],
  humility: [
    {
      title: "Good to know",
      kind: "info",
      items: [
        // Source: server-scripts/VirtueCombat.cs:OnDeath — the kill counts within 40 yd in the monster's zone.
        "A kill counts when you damaged the monster and are alive, in its zone and within 40\u00a0yd.",
      ],
    },
  ],
  honesty: [
    {
      title: "Good to know",
      kind: "info",
      items: [
        // Source: server-scripts/VirtueEncounters.cs:LostItemsPerSearch,BeginHonestySearch — 10 belongings, 3 hours apart.
        "A search hides 10 belongings. The next can start 3 hours later.",
        // Source: server-scripts/Player.cs:UserCode_CmdActivateVirtue__VirtueShrine — the shrine refuses Honesty while belongings are out, unless Honesty is at rank 5.
        "Returns count even after the blessing ends, but below rank 5 you must return everything before taking Honesty again.",
        "The bank and house chests do not take belongings.",
      ],
    },
  ],
  valor: [
    {
      title: "Good to know",
      kind: "info",
      items: [
        // Source: server-scripts/Player.cs:AssignValorTarget — the shrine refuses Valor when no quarry fits.
        'When none fits your level, the shrine says "No worthy quarry answers the shrine at this time."',
      ],
    },
  ],
};

/** What a player does for each virtue, in one line for its tile. */
export const EARN_SUMMARIES: Record<VirtueId, string> = {
  compassion:
    "Spare fleeing monsters and lead stranded adventurers out of dungeons.",
  honor: "Let monsters hit you first and win without help.",
  sacrifice: "Offer gold and equipment at a shrine.",
  humility:
    "Defeat monsters near your level while the blessing weakens your defenses.",
  honesty: "Find lost belongings and return them to their owners.",
  valor: "Help defeat the elite or boss the shrine names.",
};
