// How each virtue earns points, worded after the game's Adventurer's Guide.
import Coins from "@lucide/svelte/icons/coins";
import Crosshair from "@lucide/svelte/icons/crosshair";
import DoorOpen from "@lucide/svelte/icons/door-open";
import Footprints from "@lucide/svelte/icons/footprints";
import Hand from "@lucide/svelte/icons/hand";
import Handshake from "@lucide/svelte/icons/handshake";
import HeartPulse from "@lucide/svelte/icons/heart-pulse";
import Landmark from "@lucide/svelte/icons/landmark";
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
        name: "Spare a Fleeing Monster",
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
        name: "Lead a Stranded Adventurer Out",
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
        name: "Win a Fair Fight",
        icon: Swords,
        steps: [
          {
            icon: Target,
            text: "Pick a monster at full Health, near your level or stronger",
          },
          { icon: Shield, text: "Let it hit you first" },
          // Source: server-scripts/VirtueCombat.cs:OnDeath — each eligible kill pays its Honor at once.
          { icon: Skull, text: "Defeat it to receive its points" },
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
        name: "Make an Offering",
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
        name: "Fight with Weaker Defenses",
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
        name: "Return Lost Belongings",
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
        name: "Defeat Your Quarry",
        icon: Crosshair,
        // Source: server-scripts/Player.cs:AssignValorTarget,CompleteValorTarget,TickValorTarget — each quarry has an hour, and Valor names the next when it falls or the hour ends.
        steps: [
          {
            icon: Landmark,
            text: "Receive the blessing. Valor names an elite or boss in a dungeon",
          },
          { icon: Skull, text: "Help defeat it within an hour" },
          {
            icon: Crosshair,
            text: "Valor names the next when it falls or the hour runs out",
          },
        ],
        rewards: [
          { value: `+${valorPoints(true)}`, unit: "per boss" },
          { value: `+${valorPoints(false)}`, unit: "per elite" },
        ],
        notes: [
          `Quarries are elites and bosses that always respawn, from ${-quarryMin} levels below you to ${quarryMax} above.`,
          // Source: server-scripts/Player.cs:ValorTargetSecondsRemaining,ExportVirtues,InitializeVirtues — the save keeps the seconds left, so the hour counts only while you are online.
          "The hour counts only while you are online.",
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
      // Source: server-scripts/VirtueCombat.cs:HostileAction,BuffApplied,Assistance — once it has hit you, your own debuffs and crowd control are ordinary attacks, and your own familiar's buffs do not end Honor.
      items: [
        "Your own pet",
        "Your own debuffs, stuns, fear and knockback once it has hit you",
        "Buffs from your own familiar",
        "Monsters that join the fight",
      ],
    },
    {
      // Source: server-scripts/VirtueCombat.cs:CancelHonor,Assistance,ClearFinishedHonorFight,OnDeath — the fight is marked invalid or ends, so its later kills give no Honor.
      title: "The Rest of the Fight Gives No Points",
      kind: "no",
      items: [
        "Active mercenaries",
        "Help or heals from another player",
        "Healing potions and bandages",
      ],
    },
    {
      // Source: server-scripts/VirtueCombat.cs:HostileAction,MonsterHit,BuffApplied — acting on it before its first hit, a debuff from anyone else on it at that hit, or another attacker makes that monster not count.
      title: "That Monster Gives No Points",
      kind: "no",
      items: [
        "Hitting or debuffing it before it hits you",
        "A debuff from anyone else on it when it first hits you",
        "Someone else fighting it",
      ],
    },
  ],
  sacrifice: [
    {
      title: "Good to Know",
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
      title: "Good to Know",
      kind: "info",
      items: [
        // Source: server-scripts/VirtueCombat.cs:OnDeath — the kill counts within 40 yd of the monster.
        "A kill counts when you damaged the monster and are alive and within 40\u00a0yd.",
      ],
    },
  ],
  honesty: [
    {
      title: "Good to Know",
      kind: "info",
      items: [
        // Source: server-scripts/VirtueEncounters.cs:TryEnterHonestyZone,CreateHonestySearch,MaximumUncollectedBelongings,HonestySpawnChance — each zone entered rolls 40% for 1 or 2 belongings unless one is already there, up to 10 waiting.
        "Each region or dungeon you enter has a 40% chance to hold 1 or 2 belongings, unless one you have not picked up is already there. At most 10 wait at a time.",
        // Source: server-scripts/VirtueLostPlacement.cs:HasEntrancePath — each belonging lies on a walkable path from one of the zone's entrances.
        "You can walk to each one from an entrance of its zone.",
        // Source: server-scripts/VirtueEncounters.cs:Cleanup,ClearHonestySearch — belongings not yet picked up vanish when the blessing ends or you log out.
        "Belongings you have not picked up vanish when the blessing ends or you log out.",
        // Source: server-scripts/Player.cs:UserCode_CmdActivateVirtue__VirtueShrine — the shrine refuses Honesty while belongings are out, unless Honesty is at rank 5.
        "Returns count even after the blessing ends, but below rank\u00a05 you must return everything before taking Honesty again.",
        "The bank and house chests do not take belongings.",
      ],
    },
  ],
  valor: [
    {
      title: "Good to Know",
      kind: "info",
      items: [
        // Source: server-scripts/Player.cs:UserCode_CmdActivateVirtue__VirtueShrine,AssignValorTarget — 5 minutes after a quarry is named, renewing at a shrine names a different one.
        "Renew at a shrine 5 minutes after a quarry is named to get a different one.",
        // Source: server-scripts/Player.cs:AssignValorTarget,UserCode_CmdActivateVirtue__VirtueShrine — below rank 5, the shrine refuses Valor when no quarry fits.
        'Below rank\u00a05, when none fits your level, the shrine says "No worthy quarry answers the shrine at this time."',
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
  valor: "Help defeat the elite or boss Valor names, within an hour.",
};
