<script lang="ts" module>
  export interface PageSection {
    /** Element id of the section this entry jumps to. */
    id: string;
    label: string;
  }

  /**
   * Longest label that still reads comfortably in a quarter-width column. At
   * four columns the page container leaves roughly 240px per column, which
   * fits about eighteen characters at this text size before it crowds.
   */
  const FOUR_COLUMN_LABEL_LIMIT = 18;
</script>

<script lang="ts">
  interface Props {
    sections: PageSection[];
  }

  let { sections }: Props = $props();

  // Column count follows the content. Pages of short labels such as "Kill XP"
  // would otherwise leave most of each column empty, while a page carrying
  // "Equipment, Death, and Remains" needs the wider three-column track.
  const longestLabel = $derived(
    sections.reduce((max, section) => Math.max(max, section.label.length), 0),
  );
  const columnClass = $derived(
    longestLabel <= FOUR_COLUMN_LABEL_LIMIT
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : "sm:grid-cols-2 lg:grid-cols-3",
  );
</script>

<!--
  Jump list for a long reference page. A grid rather than a wrapping flex row:
  labels vary from "Healing" to "Equipment, Death, and Remains", so wrapping
  leaves a ragged edge while columns stay aligned at any label length.
-->
<nav aria-label="Page sections">
  <ul class="grid gap-x-6 gap-y-2 text-sm text-muted-foreground {columnClass}">
    {#each sections as section (section.id)}
      <li>
        <a href="#{section.id}" class="hover:text-foreground hover:underline"
          >{section.label}</a
        >
      </li>
    {/each}
  </ul>
</nav>
