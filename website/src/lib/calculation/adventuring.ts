import { multiplyF32 } from "./unity-math";

// Source: server-scripts/PlayerQuests.cs:UserCode_CmdComplete__NetworkIdentity__Int32 — an Adventurer quest adds its configured XP reward times 5E-08f to Adventuring, before the current skill is capped at one.
export function adventuringSkillGain(rewardXp: number): number {
  return multiplyF32(rewardXp, 5e-8);
}
