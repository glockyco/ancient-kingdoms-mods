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
    You can use it only while your Mana is below maximum, your current Health is
    above the Health spent and both amounts are above 0. You pay the full Health
    cost even when the Mana restored is capped.
  </p>
</div>
