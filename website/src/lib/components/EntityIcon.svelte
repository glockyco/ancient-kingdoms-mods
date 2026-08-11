<script lang="ts">
  import ImageIcon from "@lucide/svelte/icons/image";
  import type { IconNode } from "lucide";
  import type { Component } from "svelte";
  import EntityGlyph from "$lib/components/EntityGlyph.svelte";

  interface Props {
    src: string | null;
    alt: string;
    fallback?: Component<{ class?: string }>;
    fallbackIcon?: IconNode;
    size?: number;
    width?: number;
    height?: number;
    class?: string;
    bordered?: boolean;
  }

  let {
    src,
    alt,
    fallback: Fallback = ImageIcon,
    fallbackIcon,
    size = 28,
    width = size,
    height = size,
    class: className = "",
    bordered = true,
  }: Props = $props();

  let imageFailed = $state(false);
  const showImage = $derived(Boolean(src) && !imageFailed);
  const iconClass = $derived(`h-full w-full ${className}`);

  function handleImageError() {
    imageFailed = true;
  }

  $effect(() => {
    if (src) imageFailed = false;
  });
</script>

<span
  class="inline-flex shrink-0 items-center justify-center overflow-hidden {bordered
    ? 'rounded-md border border-border/60 bg-muted/30'
    : ''} {className}"
  style:width={`${width}px`}
  style:height={`${height}px`}
  aria-hidden={alt.length === 0 ? "true" : undefined}
>
  {#if showImage && src}
    <img
      {src}
      {alt}
      {width}
      {height}
      loading="lazy"
      decoding="async"
      class="h-full w-full object-contain [image-rendering:pixelated]"
      onerror={handleImageError}
    />
  {:else}
    {#if fallbackIcon}
      <EntityGlyph
        icon={fallbackIcon}
        size={Math.max(12, size - 8)}
        class={iconClass}
      />
    {:else}
      <Fallback class={iconClass} />
    {/if}
    {#if alt.length > 0}<span class="sr-only">{alt}</span>{/if}
  {/if}
</span>
