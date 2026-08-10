<script lang="ts">
  import ImageIcon from "@lucide/svelte/icons/image";
  import type { Component } from "svelte";

  interface Props {
    src: string | null;
    alt: string;
    fallback?: Component<{ class?: string }>;
    size?: number;
    class?: string;
  }

  let {
    src,
    alt,
    fallback: Fallback = ImageIcon,
    size = 28,
    class: className = "",
  }: Props = $props();

  let imageFailed = $state(false);
  const showImage = $derived(Boolean(src) && !imageFailed);
  const iconClass = $derived(`h-full w-full ${className}`);

  function handleImageError() {
    imageFailed = true;
  }
</script>

<span
  class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/30"
  style:width={`${size}px`}
  style:height={`${size}px`}
  aria-hidden={alt.length === 0 ? "true" : undefined}
>
  {#if showImage && src}
    <img
      {src}
      {alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      class="h-full w-full object-contain [image-rendering:pixelated]"
      onerror={handleImageError}
    />
  {:else}
    <Fallback class={iconClass} />
    {#if alt.length > 0}<span class="sr-only">{alt}</span>{/if}
  {/if}
</span>
