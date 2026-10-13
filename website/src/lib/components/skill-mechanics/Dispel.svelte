<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { debuffResistance } = $derived(mechanics.facts);
  const playerCast = $derived(
    skill.is_scroll || skill.player_classes.length > 0,
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
        >The chance to remove a buff is 100% minus its Dispel Resist, plus your
        Dispel Resist reduction.</span
      >
      <span class="block">A buff with 0% Dispel Resist is always removed.</span>
    </p>
    {#if skill.skill_type === "target_debuff"}
      {#if skill.is_scroll}
        <p>
          Each effective scroll rank lowers Dispel Resist by 1 percentage point.
        </p>
        <p class="text-muted-foreground">
          Your reduction grows with your
          <a
            href="/professions/scroll_mastery"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Scroll Mastery</a
          >
          rank, lowering a monster's Dispel Resist by 1 percentage point per effective
          rank (up to {skill.max_level}).
          <span class="block">Accuracy helps the scroll land in step 1.</span>
          <span class="block">Scroll Mastery removes more buffs in step 2.</span
          >
        </p>
      {:else}
        <p>
          Half your Accuracy reduces Dispel Resist by the same number of
          percentage points.
        </p>
        <p class="text-muted-foreground">
          <span class="block"
            >Your Accuracy helps the dispel land and reduces each buff's Dispel
            Resist.</span
          >
          <span class="block"
            >For example, 20% Accuracy lowers Dispel Resist by 10 percentage
            points.</span
          >
        </p>
      {/if}
    {:else}
      <p class="text-muted-foreground">
        <span class="block"
          >Area dispels do not lower any buff's Dispel Resist, so each buff
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
        removes all your buffs except Rest.</span
      >
      <span class="block">It removes all buffs from an affected pet.</span>
    </p>
  {/if}
</div>
