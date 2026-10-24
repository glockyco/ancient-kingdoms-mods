<script lang="ts">
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import { threatCalculation } from "$lib/calculation/combat-rules";
</script>

<Chapter id="threat">
  <!-- Source: server-scripts/Combat.cs:DealDamageAt — hit threat combines skill threat, damage and control threat, capped at the victim's current Health. -->
  <p>
    A hit adds threat from the skill's threat, starting damage, stun and fear,
    up to the target's current Hit Points.
  </p>
  <!-- Source: server-scripts/Combat.cs:619-634,737-743 — the monster's threat list is updated before the avoidance roll. -->
  <p>
    Blocked, missed and resisted hits generate just as much threat as hits that
    land.
  </p>
  <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; AreaDamageSkill.cs:Apply; Combat.cs:DealDamageAt — eligible targeted and direct area hits add one third of maximum Health, rounded, to positive listed threat before the hit's damage and control threat. -->
  <Formula calculation={threatCalculation} />
  <!-- Source: server-scripts/Combat.cs:DealDamageAt — negative listed threat reduces existing monster threat to at least 1. -->
  <p>
    A skill with negative listed threat lowers the attacker's threat on the
    monster, to no less than 1.
  </p>
</Chapter>
