<script lang="ts" module>
  import { serializeJsonLd, type JsonLdNode } from "$lib/seo/jsonld";

  export interface JsonLdProps {
    node: JsonLdNode;
  }
</script>

<script lang="ts">
  let { node }: JsonLdProps = $props();
  const json = $derived(
    serializeJsonLd({ "@context": "https://schema.org", ...node }),
  );
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags — JSON.stringify output is structured data, not user HTML; the </ + script> split avoids the Svelte parser closing the surrounding script block -->
  {@html `<script type="application/ld+json">${json}</` + `script>`}
</svelte:head>
