<!--
  A real capture from a run. The frame is 16 by 9 at the recorded size, so a row of
  captures lines up whatever their file sizes are.
-->
<script lang="ts">
  let {
    src,
    width,
    height,
    alt,
    caption,
    priority = false,
    class: className = "",
  }: {
    src: string;
    width: number;
    height: number;
    alt: string;
    caption: string;
    priority?: boolean;
    class?: string;
  } = $props();
</script>

<figure class="min-w-0 {className}">
  <img
    {src}
    {width}
    {height}
    {alt}
    loading={priority ? "eager" : "lazy"}
    decoding="async"
    class="aspect-video w-full rounded-lg border bg-muted object-cover"
  />
  <figcaption class="mt-1.5 text-xs text-balance text-muted-foreground">
    {caption}
  </figcaption>
</figure>
