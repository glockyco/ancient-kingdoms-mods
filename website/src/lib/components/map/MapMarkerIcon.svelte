<!--
  A map marker as the map draws it: the marker's white glyph on a circle in its
  layer color. Lists use it so that a row can be matched to its marker.
-->
<script lang="ts">
  import EntityGlyph from "$lib/components/EntityGlyph.svelte";
  import { markerGlyph } from "$lib/map/icons";
  import type { MarkerDef } from "$lib/map/marker-registry";

  interface Props {
    marker: MarkerDef;
    size?: number;
  }

  let { marker, size = 24 }: Props = $props();

  const glyph = $derived(markerGlyph(marker.iconType));
</script>

<span
  class="grid shrink-0 place-items-center rounded-full text-white ring-1 ring-black/40"
  style="width: {size}px; height: {size}px; background-color: rgb({marker.color.join(
    ', ',
  )})"
  role="img"
  aria-label={marker.label}
  title={marker.label}
>
  <EntityGlyph
    icon={glyph.icon}
    size={Math.round(size * 0.55)}
    class="drop-shadow-[0_0_1px_black] {glyph.flipX ? '-scale-x-100' : ''}"
  />
</span>
