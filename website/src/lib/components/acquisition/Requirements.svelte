<script lang="ts">
  import type { RequirementRoot } from "$lib/acquisition/types";
  import { describeRequirement } from "$lib/acquisition/conditions";
  import { REQUIREMENT_PHASE_LABELS } from "./display";
  let {
    roots,
    names = {},
  }: {
    roots: readonly RequirementRoot[];
    names?: Readonly<Record<string, string>>;
  } = $props();
  const displayRoots = $derived([...new Set(roots)]);
</script>

{#if displayRoots.length}
  <ul class="space-y-1 text-sm text-muted-foreground">
    {#each displayRoots as root, rootIndex (rootIndex)}
      {#each describeRequirement(root, names) as description, descriptionIndex (descriptionIndex)}
        <li>
          {REQUIREMENT_PHASE_LABELS[description.phase]}: {description.text}
        </li>
      {/each}
    {/each}
  </ul>
{/if}
