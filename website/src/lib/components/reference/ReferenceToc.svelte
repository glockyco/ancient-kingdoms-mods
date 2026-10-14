<!--
  The contents of a reference page: every chapter with every topic, so a reader
  can see the whole page at once. The entry for the reader's position is marked
  with aria-current, which also draws the highlight.
-->
<script lang="ts">
  import type { ReferenceOutline } from "./outline";

  interface Props {
    outline: ReferenceOutline;
    activeId: string | null;
    onnavigate?: () => void;
  }

  let { outline, activeId, onnavigate }: Props = $props();

  const activeChapter = $derived(
    outline.find(
      (chapter) =>
        chapter.id === activeId ||
        chapter.topics.some((topic) => topic.id === activeId),
    )?.id ?? null,
  );
</script>

<ul class="space-y-4 text-sm">
  {#each outline as chapter (chapter.id)}
    <li>
      <a
        href="#{chapter.id}"
        onclick={onnavigate}
        aria-current={activeId === chapter.id ? "location" : undefined}
        class={[
          "block font-semibold transition-colors hover:text-foreground",
          activeChapter === chapter.id
            ? "text-foreground"
            : "text-foreground/75",
        ]}>{chapter.title}</a
      >
      {#if chapter.topics.length > 0}
        <ul class="mt-1.5 border-l border-border">
          {#each chapter.topics as topic (topic.id)}
            <li>
              <a
                href="#{topic.id}"
                onclick={onnavigate}
                aria-current={activeId === topic.id ? "location" : undefined}
                class="-ml-px block border-l-2 border-transparent py-1 pl-3 text-muted-foreground transition-colors hover:text-foreground aria-[current=location]:border-(--brand-gold) aria-[current=location]:text-foreground"
                >{topic.title}</a
              >
            </li>
          {/each}
        </ul>
      {/if}
    </li>
  {/each}
</ul>
