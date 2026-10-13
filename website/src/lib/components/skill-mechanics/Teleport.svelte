<script lang="ts">
  import { formatLinear } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/AreaBuffSkill.cs:Apply; ZoneInfo.cs:GetEvacuateIdZone — all living visible nearby players teleport to the zone's assigned city; the stun is set before the portal. -->
<div class="space-y-1">
  <h3 class="font-semibold">Teleport</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Teleports you and every other living, visible player within
      {formatLinear(skill.cast_range, " yd")}, in your party or not, to the city
      assigned to your current zone.</span
    >
    <span class="block"
      >Each teleported player is stunned for 1 second when the spell resolves.</span
    >
  </p>
</div>
