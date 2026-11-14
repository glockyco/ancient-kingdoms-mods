<!--
  The monsters whose drop table holds the run's entry item, highest chance first. The item
  is excluded from the compendium, so it appears as the existing "Redacted item" placeholder.
-->
<script lang="ts">
  import { resolve } from "$app/paths";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import RedactedEntry from "$lib/components/RedactedEntry.svelte";
  import { formatPercent } from "$lib/utils/format";

  export interface Dropper {
    readonly id: string;
    readonly name: string;
    readonly level: number;
    readonly chance: number;
    readonly visual_public_path: string | null;
  }

  let {
    droppers,
    class: className = "",
  }: { droppers: readonly Dropper[]; class?: string } = $props();
</script>

<figure class="space-y-3 {className}">
  <figcaption class="text-sm text-balance text-muted-foreground">
    These elite monsters drop
    <span class="whitespace-nowrap"
      >1 <RedactedEntry kind="item" slot={false} /></span
    >.
  </figcaption>
  <div class="max-h-[26rem] overflow-y-auto rounded-lg border">
    <table class="w-full text-sm">
      <thead class="sticky top-0 bg-card">
        <tr class="border-b text-left">
          <th class="p-2 font-medium">Monster</th>
          <th class="p-2 text-right font-medium">Level</th>
          <th class="p-2 text-right font-medium">Chance</th>
        </tr>
      </thead>
      <tbody class="[&>tr:nth-child(even)]:bg-muted/30">
        {#each droppers as dropper (dropper.id)}
          <tr>
            <td class="p-2">
              <EntityLink
                variant="reference"
                href={resolve("/monsters/[id]", { id: dropper.id })}
                name={dropper.name}
                domain="monster"
                imageAvailable={dropper.visual_public_path}
                size={28}
              />
            </td>
            <td class="p-2 text-right tabular-nums">{dropper.level}</td>
            <td class="p-2 text-right tabular-nums"
              >{formatPercent(dropper.chance, { decimals: 1 })}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</figure>
