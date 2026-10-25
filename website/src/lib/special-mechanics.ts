import { formatNumber } from "$lib/utils/format";

export interface SpecialMechanicLink {
  href: string;
  label: string;
}

export type SpecialMechanicText = Array<string | SpecialMechanicLink>;

export interface SpecialMechanic {
  title: string;
  summary: SpecialMechanicText;
  details: SpecialMechanicText[];
}

const DRAGONBAIT_STEW_LINK: SpecialMechanicLink = {
  href: "/items/dragonbait_stew",
  label: "Dragonbait Stew",
};

const VALAARK_LINK: SpecialMechanicLink = {
  href: "/monsters/valaark",
  label: "Valaark",
};

// Sources: server-scripts/GameManager.cs:TryUseValaarkDragonbaitStew,
// server-scripts/Player.cs:UserCode_CmdRemoveInvencibleValaark__Int32,
// server-scripts/Monster.cs:ApplyValaarkVulnerability,RestoreValaarkInvincibility;
// server-scripts/AreaDamageSkill.cs:Apply.
const VALAARK_INVULNERABILITY: SpecialMechanic = {
  title: "Invulnerability",
  summary: [
    "Valaark is invulnerable until ",
    DRAGONBAIT_STEW_LINK,
    " is used within 4 yd of him.",
  ],
  details: [
    [
      "Use ",
      DRAGONBAIT_STEW_LINK,
      " while targeting Valaark from within 4 yd.",
    ],
    [
      "One stew makes Valaark vulnerable for a random duration from 1m to 4m 59s.",
    ],
    [
      `While Valaark is vulnerable, two of his five resistances, chosen at random, drop to 200. The other three stay at ${formatNumber(2000)}.`,
    ],
    [
      "A stew used while Valaark is already vulnerable is not consumed and does not extend the timer.",
    ],
    [
      "Invulnerability returns when the timer ends or when Valaark returns to his spawn point after losing his targets.",
    ],
    [
      "While vulnerable, Valaark's area damage is halved, rounded to the nearest integer. Exact halves round to the even number.",
    ],
  ],
};

const DRAGONBAIT_STEW_USE: SpecialMechanic = {
  title: "Valaark vulnerability",
  summary: [
    "Target ",
    VALAARK_LINK,
    " and use the stew within 4 yd to make him vulnerable for a random duration from 1m to 4m 59s.",
  ],
  details: [],
};

const TRIAL_OF_THE_ANCIENTS_LINK: SpecialMechanicLink = {
  href: "/zones/trial_of_the_ancients",
  label: "Trial of the Ancients",
};

// Source: server-scripts/TrialAncientsEvent.cs:MainCoroutineEvent — defeating the final wave spawns Astral Projection Erasis inside the trial.
const ERASIS_SPAWN: SpecialMechanic = {
  title: "Spawn",
  summary: [
    "Appears in ",
    TRIAL_OF_THE_ANCIENTS_LINK,
    " once the trial's final wave is defeated.",
  ],
  details: [],
};

const MONSTER_SPECIAL_MECHANICS: Record<string, SpecialMechanic[]> = {
  valaark: [VALAARK_INVULNERABILITY],
};

const ITEM_SPECIAL_MECHANICS: Record<string, SpecialMechanic[]> = {
  dragonbait_stew: [DRAGONBAIT_STEW_USE],
};

const NPC_SPECIAL_MECHANICS: Record<string, SpecialMechanic[]> = {
  astral_projection_erasis: [ERASIS_SPAWN],
};

export function getMonsterSpecialMechanics(id: string): SpecialMechanic[] {
  return MONSTER_SPECIAL_MECHANICS[id] ?? [];
}

export function getItemSpecialMechanics(id: string): SpecialMechanic[] {
  return ITEM_SPECIAL_MECHANICS[id] ?? [];
}

export function getNpcSpecialMechanics(id: string): SpecialMechanic[] {
  return NPC_SPECIAL_MECHANICS[id] ?? [];
}
