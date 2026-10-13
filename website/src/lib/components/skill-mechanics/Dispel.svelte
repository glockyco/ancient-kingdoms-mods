<script lang="ts">
  import { formatPercent } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { debuffResistance } = $derived(mechanics.facts);
  const playerCast = $derived(
    skill.is_scroll || skill.player_classes.length > 0,
  );
  const resistantBuffs = $derived(
    skill.monster_buffs_with_cleanse_resist ?? [],
  );
</script>

<div class="space-y-1">
  <!-- Source: server-scripts/TargetDebuffSkill.cs:105-143 (resist gate), 173-205,209-234,238-250 (removal); AreaDebuffSkill.cs:104-139 (resist gate), 164-205,209-233,238-258 (removal); Combat.cs:1540-1567 GetProbResistMagic/Disease -->
  <h3 class="font-semibold">
    <a
      href="/mechanics/combat#dispel"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >Dispel Mechanics</a
    >
  </h3>
  {#if playerCast}
    <p class="text-muted-foreground">
      <span class="block"
        >You cast this on a monster to remove its beneficial buffs.</span
      >
      <span class="block"
        >First the monster can resist the skill, then each buff has a separate
        removal chance.</span
      >
    </p>
    <p class="text-muted-foreground">
      <span class="block"
        ><span class="font-medium">1. Resist.</span> The monster rolls to resist
        this skill with its {debuffResistance}, and your Accuracy lowers the
        chance.</span
      >
      <span class="block">If the monster resists, no buffs are removed.</span>
    </p>
    <p class="text-muted-foreground">
      <span class="block"
        ><span class="font-medium">2. Remove buffs.</span> Each buff has a separate
        removal roll.</span
      >
      <span class="block"
        >The chance to remove a buff is 100% minus its Cleanse Resist (listed in
        the buff's Effect row), plus your Cleanse Resist reduction, limited to
        0–100%.</span
      >
      <span class="block"
        >A buff with 0% Cleanse Resist is always removed{!skill.is_scroll &&
        skill.skill_type === "target_debuff"
          ? " unless your Accuracy is negative"
          : ""}.</span
      >
    </p>
    {#if resistantBuffs.length > 0}
      <p class="text-muted-foreground">
        Monster buffs with Cleanse Resist:
        {#each resistantBuffs as buff, index (buff.id)}{index > 0 ? ", " : ""}<a
            href="/skills/{buff.id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{buff.name}</a
          >
          ({formatPercent(buff.prob_ignore_cleanse)}){/each}. Every other
        monster buff has 0%.
      </p>
    {/if}
    {#if skill.skill_type === "target_debuff"}
      {#if skill.is_scroll}
        <!-- Source: server-scripts/ScrollItem.cs:UseAfterCast; TargetDebuffSkill.cs:Apply — scroll cast rank is rounded Scroll Mastery × 20; each rank reduces probIgnoreCleanse by 1 percentage point. -->
        <p class="text-muted-foreground">
          The scroll lowers each buff's Cleanse Resist by 1 percentage point per
          cast rank (see Scroll Mastery above), up to {skill.max_level}.
          Accuracy helps the scroll land in step 1. Scroll Mastery improves buff
          removal in step 2.
        </p>
      {:else}
        <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; Combat.cs:accuracy — removal subtracts half signed Accuracy from probIgnoreCleanse. -->
        <p class="text-muted-foreground">
          Your reduction is half your Accuracy: 20% Accuracy lowers each buff's
          Cleanse Resist by 10 percentage points. Negative Accuracy raises it.
        </p>
      {/if}
    {:else}
      <p class="text-muted-foreground">
        <span class="block"
          >Area dispels do not lower any buff's Cleanse Resist, so each buff
          faces its full removal chance.</span
        >
        <span class="block">Your Accuracy still helps the skill land.</span>
      </p>
    {/if}
  {:else}
    <p class="text-muted-foreground">
      <span class="block"
        >Monsters use this to remove beneficial buffs from you and your pets.</span
      >
      <span class="block"
        >First you can resist the skill, then it removes your buffs.</span
      >
    </p>
    <p class="text-muted-foreground">
      <span class="block"
        ><span class="font-medium">1. Resist.</span> You roll to resist this
        skill with your {debuffResistance}, and the monster's Accuracy lowers
        the chance.</span
      >
      <span class="block">If you resist, your buffs stay.</span>
    </p>
    <p class="text-muted-foreground">
      <span class="block"
        ><span class="font-medium">2. Remove buffs.</span> If the skill lands, it
        removes your skill, food, potion and relic buffs except Rest. Bard songs stay.</span
      >
      <span class="block"
        >On a pet it removes the same buffs, including Rest. Bard songs stay.</span
      >
    </p>
  {/if}
</div>
