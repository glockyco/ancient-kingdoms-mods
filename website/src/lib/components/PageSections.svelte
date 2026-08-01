<script lang="ts" module>
  export interface PageSection {
    /** Element id of the section this entry jumps to. */
    id: string;
    label: string;
  }
</script>

<script lang="ts">
  interface Props {
    sections: PageSection[];
  }

  let { sections }: Props = $props();
</script>

<!--
  Jump list for a long reference page. A wrapping row rather than a column grid:
  labels run from "Healing" to "Equipment, Death, and Remains", and a fixed
  column count leaves short labels stranded in wide empty tracks while long ones
  still wrap. Wrapping packs every label at its own width instead.

  The rules and the label are what stop it reading as a stray group of links
  between the intro and the first section.
-->
<nav aria-label="Page sections" class="border-y py-3.5">
  <p class="mb-2.5 text-xs uppercase tracking-wider text-muted-foreground">
    On this page
  </p>
  <ul class="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-sm">
    {#each sections as section (section.id)}
      <li>
        <a
          href="#{section.id}"
          class="text-foreground/80 transition-colors hover:text-foreground hover:underline"
          >{section.label}</a
        >
      </li>
    {/each}
  </ul>
</nav>
