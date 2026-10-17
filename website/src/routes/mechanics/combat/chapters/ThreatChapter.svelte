<script lang="ts">
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import GameBug from "$lib/components/reference/GameBug.svelte";
  import { threatCalculation } from "$lib/calculation/combat-rules";
</script>

<Chapter id="threat">
  <!-- Source: server-scripts/Combat.cs:DealDamageAt — hit threat combines skill threat, damage and control threat, capped at the victim's current Health. -->
  <p>
    A hit adds threat from the skill's threat, damage, stun and fear, up to the
    victim's current Hit Points.
  </p>
  <!-- Source: server-scripts/Combat.cs:609-623,711-717 — the monster's threat list is updated before the avoidance roll. -->
  <p>
    Threat is added before the avoidance roll, so a blocked, missed or resisted
    hit adds the same threat as one that lands.
  </p>
  <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; AreaDamageSkill.cs:Apply; Combat.cs:DealDamageAt — eligible targeted and direct area hits add maximum Health to positive listed threat before the hit's damage and control threat. -->
  <Formula calculation={threatCalculation} />
  <!-- Source: server-scripts/DamageSkill.cs:ToolTip; TargetDamageSkill.cs:ApplyDamage; AreaDamageSkill.cs:Apply — threat tooltips show one third of maximum Health where eligible hits add it all. -->
  <GameBug>
    The in-game threat tooltip shows only one third of maximum Hit Points.
    Eligible targeted and direct area hits add all of it.
  </GameBug>
  <!-- Source: server-scripts/Combat.cs:DealDamageAt — negative listed threat reduces existing monster threat to at least 1. -->
  <p>
    Negative listed skill threat reduces the attacker's existing monster threat,
    leaving at least 1.
  </p>
</Chapter>
