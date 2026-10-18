<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    className = "",
    parentScroll = false,
    children,
  }: {
    label: string;
    className?: string;
    parentScroll?: boolean;
    children: Snippet;
  } = $props();
  const regionId = $props.id();
  let viewport: HTMLDivElement | undefined = $state();

  function scrollPage(direction: number) {
    if (viewport)
      viewport.scrollBy({ top: direction * viewport.clientHeight * 0.8 });
  }

  function scrollWithKeys(event: KeyboardEvent) {
    if (!viewport || event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowUp":
        viewport.scrollBy({ top: -40 });
        break;
      case "ArrowDown":
        viewport.scrollBy({ top: 40 });
        break;
      case "PageUp":
        scrollPage(-1);
        break;
      case "PageDown":
        scrollPage(1);
        break;
      case "Home":
        viewport.scrollTo({ top: 0 });
        break;
      case "End":
        viewport.scrollTo({ top: viewport.scrollHeight });
        break;
      default:
        return;
    }
    event.preventDefault();
  }
</script>

<div class="relative min-w-0">
  {#if !parentScroll}
    <div
      class="sr-only focus-within:not-sr-only focus-within:my-2"
      role="group"
      aria-label="Scroll controls for {label}"
    >
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-controls={regionId}
          aria-label="Scroll {label} up"
          onclick={() => scrollPage(-1)}
          onkeydown={scrollWithKeys}>Scroll up</button
        >
        <button
          type="button"
          class="rounded border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-controls={regionId}
          aria-label="Scroll {label} down"
          onclick={() => scrollPage(1)}
          onkeydown={scrollWithKeys}>Scroll down</button
        >
      </div>
      <p class="mt-1 text-sm text-muted-foreground">
        Arrow keys scroll. Page Up, Page Down, Home and End also work.
      </p>
    </div>
  {/if}
  <div
    bind:this={viewport}
    id={regionId}
    role="region"
    aria-label={label}
    class={className}
    style:max-height={parentScroll ? "none" : undefined}
    style:overflow={parentScroll ? "visible" : undefined}
    style:overscroll-behavior-y={parentScroll ? undefined : "none"}
  >
    {@render children()}
  </div>
</div>
