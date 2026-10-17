<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { bloodPactCalculation } from "$lib/skills/calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/NecromancerBloodPactSkill.cs:CanConvert,Apply — both amounts must be positive, Mana below maximum and current Health above the cost; the full Health cost is paid when the Mana gain is capped. -->
<div class="space-y-3">
  <h3 class="font-semibold">Blood Pact</h3>
  <Calculation calculation={bloodPactCalculation(skill)} />
  <p class="text-muted-foreground">
    You must be missing Mana and have more Hit Points than the cost. The
    conversion must restore at least 1 Mana. You pay the full Hit Points cost
    even if you need less Mana than it restores.
  </p>
</div>
