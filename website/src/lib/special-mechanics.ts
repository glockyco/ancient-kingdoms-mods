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

const VALAARK_INVULNERABILITY: SpecialMechanic = {
  title: "Invulnerability",
  summary: [
    "Valaark is invulnerable until ",
    DRAGONBAIT_STEW_LINK,
    " is used nearby.",
  ],
  details: [
    [
      "Use ",
      DRAGONBAIT_STEW_LINK,
      " from inventory while targeting Valaark within melee range.",
    ],
    ["One stew makes Valaark vulnerable for 60-299 seconds."],
    [
      "During that window, one random damage resistance drops to 500 while the others stay at 2000.",
    ],
    [
      "Using another stew while Valaark is already vulnerable only shows a warning and does not consume it.",
    ],
    [
      "When the timer expires, or when Valaark leashes and returns home, invulnerability returns.",
    ],
    ["While vulnerable, Valaark's area damage is halved."],
  ],
};

const DRAGONBAIT_STEW_USE: SpecialMechanic = {
  title: "Valaark Vulnerability",
  summary: ["Used to temporarily remove ", VALAARK_LINK, "'s invulnerability."],
  details: [],
};

const MONSTER_SPECIAL_MECHANICS: Record<string, SpecialMechanic[]> = {
  valaark: [VALAARK_INVULNERABILITY],
};

const ITEM_SPECIAL_MECHANICS: Record<string, SpecialMechanic[]> = {
  dragonbait_stew: [DRAGONBAIT_STEW_USE],
};

export function getMonsterSpecialMechanics(id: string): SpecialMechanic[] {
  return MONSTER_SPECIAL_MECHANICS[id] ?? [];
}

export function getItemSpecialMechanics(id: string): SpecialMechanic[] {
  return ITEM_SPECIAL_MECHANICS[id] ?? [];
}
