import { NPC_ROLE_BITS } from "$lib/types/map";

/**
 * Calculate tooltip position with screen edge detection.
 * Flips position when tooltip would overflow viewport edges.
 */
export function calculateTooltipPosition(
  mouseX: number,
  mouseY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  offset = 12,
  edgePadding = 8,
): { left: number; top: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Default: bottom-right of cursor
  let left = mouseX + offset;
  let top = mouseY + offset;

  // Flip horizontal if would overflow right edge
  if (left + tooltipWidth + edgePadding > viewportWidth) {
    left = mouseX - tooltipWidth - offset;
  }

  // Flip vertical if would overflow bottom edge
  if (top + tooltipHeight + edgePadding > viewportHeight) {
    top = mouseY - tooltipHeight - offset;
  }

  // Ensure doesn't go past left edge
  if (left < edgePadding) {
    left = edgePadding;
  }

  // Ensure doesn't go past top edge
  if (top < edgePadding) {
    top = edgePadding;
  }

  return { left, top };
}

/**
 * Check if an NPC has a specific role via bitmask.
 */
export function hasNpcRole(
  roleBitmask: number,
  role: keyof typeof NPC_ROLE_BITS,
): boolean {
  return (roleBitmask & (1 << NPC_ROLE_BITS[role])) !== 0;
}

/**
 * Human-readable display names for NPC roles.
 */
const ROLE_DISPLAY_NAMES: Record<keyof typeof NPC_ROLE_BITS, string> = {
  isVendor: "Vendor",
  isQuestGiver: "Quests",
  canRepair: "Repair",
  isBank: "Bank",
  isInnkeeper: "Innkeeper",
  isSoulBinder: "Soul Binder",
  isSkillTrainer: "Skill Trainer",
  isVeteranTrainer: "Veteran Trainer",
  isAttributeReset: "Attribute Reset",
  isFactionVendor: "Faction Vendor",
  isEssenceTrader: "Essence Trader",
  isAugmenter: "Augmenter",
  isPriestess: "Priestess",
  isRenewalSage: "Renewal Sage",
  isAdventurerTaskgiver: "Adventurer Tasks",
  isAdventurerVendor: "Adventurer Vendor",
  isMercenaryRecruiter: "Mercenary Recruiter",
  isGuard: "Guard",
};

/**
 * Get all role display names for an NPC based on their bitmask.
 */
export function getNpcRoles(roleBitmask: number): string[] {
  const roles: string[] = [];

  for (const [role, bitPosition] of Object.entries(NPC_ROLE_BITS)) {
    if ((roleBitmask & (1 << bitPosition)) !== 0) {
      roles.push(ROLE_DISPLAY_NAMES[role as keyof typeof NPC_ROLE_BITS]);
    }
  }

  return roles;
}
