<script lang="ts">
  import {
    OG_IMAGE_ALT,
    OG_IMAGE_HEIGHT,
    OG_IMAGE_WIDTH,
    OG_LOCALE,
    SITE_NAME,
    canonicalUrl,
    ogImageUrl,
  } from "$lib/seo/site";

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
  <meta property="og:locale" content={OG_LOCALE} />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:image" content={image} />
  <meta property="og:image:width" content={OG_IMAGE_WIDTH.toString()} />
  <meta property="og:image:height" content={OG_IMAGE_HEIGHT.toString()} />
  <meta property="og:image:alt" content={OG_IMAGE_ALT} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
  <meta name="twitter:image:alt" content={OG_IMAGE_ALT} />
</svelte:head>
