<script lang="ts">
  import { SITE_NAME, canonicalUrl, ogImageUrl } from "$lib/seo/site";

  interface Props {
    /** Page <title>. Should already include the brand suffix per page conventions. */
    title: string;
    /** <meta name="description"> body. Plain prose, no semicolons. */
    description: string;
    /** App-relative path used to compute the canonical and og:url. e.g. "/items". */
    path: string;
  }

  const { title, description, path }: Props = $props();

  const url = $derived(canonicalUrl(path));
  const image = $derived(ogImageUrl());
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:image" content={image} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
</svelte:head>
