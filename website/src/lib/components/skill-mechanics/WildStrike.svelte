<script lang="ts">
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import { EXAMPLE_HIT, wildStrikeHit } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/DamageSkill.cs:49-67 (TryConsumeWildStrike) -->
<!-- Source: server-scripts/TargetDamageSkill.cs:244,291 (ApplyDamage) -->
<!-- Source: server-scripts/TargetProjectileSkill.cs:221-222,252-256 (Apply) -->
<!-- Source: server-scripts/Combat.cs:DealDamageAt — Magic Resist reduces the converted hit by 5% per 100 points, at most 90%. -->
<div class="space-y-1">
  <h3 class="font-semibold">Wild Strike</h3>
  <p class="text-muted-foreground">
    Your next auto attack, Swift Slash with any melee weapon or Archer Shot,
    consumes the buff. After its ordinary damage calculation, the hit deals 10%
    more per Wild Strike rank, rounded, and becomes Magic damage. Magic Resist
    reduces it by 5% per 100 points, at most 90%. At rank {skill.max_level}, a {fmt.formatNumber(
      EXAMPLE_HIT,
    )}-damage auto attack deals {fmt.formatNumber(
      wildStrikeHit(skill.max_level),
    )}. See
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#wild-strike">Wild Strike</a
    >,
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#damage-pipeline">the damage pipeline</a
    >
    and
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#resistance">resistance</a
    >.
  </p>
  <RoundingDefinition />
  <!-- Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike — the buff multiplies the completed auto-attack calculation. -->
  <p class="text-muted-foreground">
    Use the <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/skills/swift_slash#mechanics">Swift Slash</a
    >
    or
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/skills/archer_shot#mechanics">Archer Shot</a
    > calculator for the auto attack's damage, then multiply it by 100% + 10% per
    Wild Strike rank, rounded, before the target's defenses.
  </p>
</div>
