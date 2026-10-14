<!--
  Layout for a long reference page: the contents stay beside the text on wide
  screens and behind a sticky bar on narrow ones, and both mark the topic the
  reader is in. A link from another page lands on the topic, which the Topic
  card highlights.
-->
<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ListTree from "@lucide/svelte/icons/list-tree";
  import ReferenceToc from "./ReferenceToc.svelte";
  import { provideRoundingTerms } from "$lib/calculation/rounding";
  import {
    outlineIds,
    setReferenceOutline,
    type ReferenceOutline,
  } from "./outline";

  interface Props {
    outline: ReferenceOutline;
    /** Breadcrumb, title and introduction, shown above the mobile contents bar. */
    header: Snippet;
    children: Snippet;
  }

  let { outline, header, children }: Props = $props();

  // The outline is static page data, so reading it once during setup is intended.
  // svelte-ignore state_referenced_locally
  setReferenceOutline(outline);
  provideRoundingTerms();

  let activeId = $state<string | null>(null);
  let menuOpen = $state(false);
  let sidebar = $state<HTMLElement>();

  const titles = $derived(
    new Map(
      outline.flatMap((chapter) => [
        [chapter.id, chapter.title],
        ...chapter.topics.map((topic) => [topic.id, topic.title] as const),
      ]),
    ),
  );

  onMount(() => {
    const sections = outlineIds(outline)
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    let frame = 0;

    // The active entry is the last section whose top has passed a reading line
    // a quarter of the way down the window. Sections near the end of the page
    // can never reach that line, so at the end the section a link opened wins,
    // or else the last one on screen.
    const update = () => {
      frame = 0;
      const line = window.innerHeight / 4;
      let current: string | null = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top > line) break;
        current = section.id;
      }
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atEnd) {
        const onScreen = sections.filter(
          (section) => section.getBoundingClientRect().top < window.innerHeight,
        );
        const followed = onScreen.find(
          (section) => section.id === location.hash.slice(1),
        );
        current = (followed ?? onScreen.at(-1))?.id ?? current;
      }
      activeId = current;
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      cancelAnimationFrame(frame);
    };
  });

  // Keep the marked entry visible inside the sidebar, which scrolls on its own.
  $effect(() => {
    if (!sidebar || activeId === null) return;
    const link = sidebar.querySelector<HTMLElement>(
      `a[href="#${CSS.escape(activeId)}"]`,
    );
    if (!link) return;
    const top = link.offsetTop;
    const bottom = top + link.offsetHeight;
    if (
      top < sidebar.scrollTop ||
      bottom > sidebar.scrollTop + sidebar.clientHeight
    ) {
      sidebar.scrollTop = top - sidebar.clientHeight / 3;
    }
  });

  function closeMenu() {
    menuOpen = false;
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape") closeMenu();
  }}
  onhashchange={closeMenu}
/>

<div
  class="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start lg:gap-12"
>
  <nav
    bind:this={sidebar}
    aria-label="Contents"
    class="sticky top-6 hidden max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 pb-6 lg:block"
  >
    <p class="mb-3 font-semibold text-foreground">Contents</p>
    <ReferenceToc {outline} {activeId} />
  </nav>

  <div class="min-w-0">
    {@render header()}

    <div
      class="sticky top-0 z-20 -mx-4 mt-6 border-y border-border bg-background px-4 sm:-mx-8 sm:px-8 lg:hidden"
    >
      <button
        type="button"
        class="flex w-full items-center gap-2 py-3 text-left text-sm"
        aria-expanded={menuOpen}
        aria-controls="reference-contents"
        onclick={() => (menuOpen = !menuOpen)}
      >
        <ListTree class="size-4 shrink-0 text-muted-foreground" />
        <span class="font-semibold">Contents</span>
        {#if activeId !== null}
          <span class="truncate text-muted-foreground"
            >· {titles.get(activeId)}</span
          >
        {/if}
        <ChevronDown
          class={[
            "ml-auto size-4 shrink-0 transition-transform",
            menuOpen && "rotate-180",
          ]}
        />
      </button>
      {#if menuOpen}
        <nav
          id="reference-contents"
          aria-label="Contents"
          class="max-h-[70vh] overflow-y-auto border-t border-border py-4"
        >
          <ReferenceToc {outline} {activeId} onnavigate={closeMenu} />
        </nav>
      {/if}
    </div>

    <div class="space-y-16 pt-10">
      {@render children()}
    </div>
  </div>
</div>
