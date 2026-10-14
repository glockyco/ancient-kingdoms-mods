<!--
  One topic of a reference page, in its own card. The heading text comes from
  the outline. A link from elsewhere lands here and the card highlights, so the
  reader sees where the rule they followed starts.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { referenceTopic } from "./outline";
  import Panel from "./Panel.svelte";

  let { id, children }: { id: string; children: Snippet } = $props();

  // svelte-ignore state_referenced_locally
  const topic = referenceTopic(id);
</script>

<article
  {id}
  aria-labelledby="{id}-title"
  class="group/topic scroll-mt-20 rounded-xl target:ring-2 target:ring-(--brand-gold)/60 lg:scroll-mt-6"
>
  <Panel>
    {#snippet heading()}
      <h3
        id="{id}-title"
        class="mb-3 flex items-baseline gap-2 text-lg font-semibold tracking-tight"
      >
        {topic.title}
        <a
          href="#{id}"
          aria-label="Link to {topic.title}"
          class="font-normal text-muted-foreground opacity-0 transition-opacity group-hover/topic:opacity-100 hover:text-foreground focus-visible:opacity-100"
          >#</a
        >
      </h3>
    {/snippet}
    {@render children()}
  </Panel>
</article>
