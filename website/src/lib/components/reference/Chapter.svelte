<!--
  A chapter of a reference page: its heading and description come from the
  outline. A chapter without topics is a single topic itself, so its content
  sits in one card that highlights when a link opens the chapter.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { referenceChapter } from "./outline";
  import Panel from "./Panel.svelte";

  let { id, children }: { id: string; children: Snippet } = $props();

  // svelte-ignore state_referenced_locally
  const chapter = referenceChapter(id);
  const Icon = $derived(chapter.icon);
</script>

<section
  {id}
  aria-labelledby="{id}-title"
  class="group/chapter scroll-mt-20 lg:scroll-mt-6"
>
  <header class="mb-5 flex items-start gap-3.5">
    <span
      class="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/50 text-foreground/80"
      aria-hidden="true"
    >
      <Icon class="size-5" />
    </span>
    <div>
      <h2 id="{id}-title" class="text-2xl font-semibold tracking-tight">
        <a href="#{id}" class="hover:underline">{chapter.title}</a>
      </h2>
      <p class="mt-0.5 text-muted-foreground">{chapter.description}</p>
    </div>
  </header>

  {#if chapter.topics.length === 0}
    <Panel highlight>{@render children()}</Panel>
  {:else}
    <div class="space-y-5">{@render children()}</div>
  {/if}
</section>
