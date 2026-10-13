<script lang="ts">
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    damageCalculation,
    calculationCasters,
    calculationCasterLabel,
    damageStatInputs,
    isMercenaryGroup,
  } from "$lib/skills/damage-calculations";
  import { DAMAGE, MAGIC_DAMAGE } from "$lib/calculation/inputs";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill, spec } = $derived(mechanics);
  const { damageMechanics } = $derived(mechanics.facts);
  const damageBlocks = $derived(
    spec.damageContexts.flatMap((ctx) =>
      calculationCasters(
        ctx.casters,
        ctx.formula === "manaburn" ? undefined : skill,
      ).map((casters) => ({
        key: `${ctx.formula}:${calculationCasterLabel(casters)}`,
        casters,
        kind: ctx.formula,
        stats: damageStatInputs(skill, ctx.formula),
        calculation: damageCalculation(skill, ctx, casters),
      })),
    ),
  );
</script>

<div class="space-y-3">
  <h3 class="font-semibold">Skill Damage</h3>
  {#each damageBlocks as block (block.key)}
    <div class="space-y-2">
      <h4 class="font-medium text-muted-foreground">
        {calculationCasterLabel(block.casters)}
      </h4>
      {#if block.calculation.inputs?.some((input) => input.key === DAMAGE.key || input.key === MAGIC_DAMAGE.key)}
        <!-- Source: server-scripts/UICharacterInfo.cs:Update; UIEquipmentMercenary.cs:Update — displayed combat values belong to the caster. -->
        <p class="text-muted-foreground">
          <a
            href="/mechanics/combat#damage-formulas"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{block.stats.map((stat) => stat.label).join(" and ")}</a
          >
          {block.stats.length === 1 ? "is the value" : "are the values"} in
          {isMercenaryGroup(block.casters)
            ? "the mercenary's equipment"
            : "your character"} window.
        </p>
      {/if}
      {#if isMercenaryGroup(block.casters) && skill.max_level > 1}
        <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — the owner determines the mercenary's skill rank. -->
        <p class="text-muted-foreground">
          Use the rank from Mercenary Skill Rank on this page. The examples use
          the same owner level and veteran points.
        </p>
      {/if}
      {#if block.calculation.inputs?.some((input) => input.key === "bowDamage" || input.key === "offhandDamage" || input.key === "meleeDamage")}
        <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; Equipment.cs:GetEquippedWeaponIndex — deductions use weapon Base Damage even when broken; a bow shot falls back to the bow when no main-hand weapon is equipped. -->
        <p class="text-muted-foreground">
          Enter Base Damage from the weapon's tooltip, even if the weapon is
          broken.
          {#if block.calculation.inputs?.some((input) => input.key === "meleeDamage")}
            With no main-hand weapon, enter the bow's Base Damage instead.
          {:else}
            Enter 0 if no weapon is equipped in the named slot.
          {/if}
        </p>
      {/if}
      {#if skill.is_scroll}
        <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; AreaDamageSkill.cs:Apply — scroll casts zero the character contribution. -->
        <p class="text-muted-foreground">
          Scroll casts use the skill's damage without your Attack Power or Spell
          Power.
        </p>
      {/if}
      {#if block.kind === "monster_magic" || block.kind === "monster_melee"}
        <p class="text-muted-foreground">
          The caster uses its own {block.stats
            .map((stat) => stat.label)
            .join(" and ")} at its level.
        </p>
      {/if}
      <Calculation calculation={block.calculation} />
    </div>
  {/each}
  <!-- Source: server-scripts/Combat.cs:654-661,844-861 — physical hits use block/miss and Defense, elemental hits use the matching resist. -->
  {#if skill.is_manaburn_skill}
    <!-- Source: server-scripts/Combat.cs:700-703,836-875 — Mana Burn and Rageblow skip avoidance and mitigation, not variance, combat advantage, level adjustment or critical scaling. -->
    <p class="text-muted-foreground">
      This skill skips avoidance and damage reduction from Armor Class or
      resistance. Variance, combat advantage, level adjustment and eligible
      critical hits still apply. See the <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-pipeline">damage pipeline</a
      >.
    </p>
  {:else if damageMechanics}
    <!-- Source: server-scripts/Combat.cs:307-319,844-861,1539-1580 — the matching stat reduces damage by 0.0005 per point, at most 0.9, rounded up; Defense adds 0.0001 per point to blockChance, at most 0.8; a resist stat adds 0.0005 per point to the resist chance. -->
    <p class="text-muted-foreground">
      {#if damageMechanics.avoidance === "block"}
        The target's Armor Class reduces this damage by 5% per 100 points, at
        most 90%, with the reduction rounded up. The hit can also be blocked or
        missed, at the target's base block chance plus 1 percentage point per
        100 Armor Class and any block bonuses, at most 80%.
      {:else}
        The target's {damageMechanics.stat} reduces this damage by 5% per 100 points,
        at most 90%, with the reduction rounded up, and gives 5 percentage points
        of chance per 100 points to resist the hit entirely.
      {/if}
      Level differences and Accuracy change these chances: see
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#resistance">resistance and avoidance</a
      >. See also the
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-pipeline">damage pipeline</a
      >
      and
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#combat-advantage"
        >moving targets and backstabs</a
      >.
    </p>
  {:else}
    <p>
      Unknown damage type: {skill.damage_type}. Its mitigation rule is not
      mapped.
    </p>
  {/if}
  {#if skill.followup_default_attack && skill.skill_type === "target_damage" && skill.player_classes.includes("rogue")}
    <!-- Source: server-scripts/TargetDamageSkill.cs:167-195 — Master Poisoner changes the Rogue auto attack's damage type before damage is computed. -->
    <p class="text-muted-foreground">
      With <a
        href="/skills/master_poisoner"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >Master Poisoner</a
      >
      active, a Rogue's auto attack adds 250% of Dexterity above 0, rounded, and deals
      Poison damage against Poison Resist.
    </p>
    <RoundingDefinition />
  {/if}
  {#if skill.followup_default_attack && skill.player_classes.includes("ranger")}
    <!-- Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike; Combat.cs:DealDamageAt,GetProbResistMagic — a Ranger player's next auto attack gains 10% damage per buff rank and uses Magic Resist. -->
    <p class="text-muted-foreground">
      With <a
        href="/skills/wild_strike"
        class="text-blue-600 dark:text-blue-400 hover:underline">Wild Strike</a
      >
      active, the Ranger's next hit deals 10% more per Wild Strike rank, rounded,
      as Magic damage. Apply this bonus after the calculation above. Magic Resist
      reduces that hit by 5% per 100 points, at most 90%, and adds 5 percentage points
      per 100 points to its chance to be resisted.
    </p>
  {/if}
</div>
