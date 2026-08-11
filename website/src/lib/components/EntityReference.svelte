<script lang="ts">
  import type { Component, Snippet } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { base } from "$app/paths";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import {
    entityImageUrl,
    type EntityImageDomain,
  } from "$lib/utils/entityImage";
  import { cn } from "$lib/utils.js";

  /**
   * A link to an entity which optionally includes its published artwork.
   *
   * `imageAvailable` is deliberately nullable: callers can pass the raw
   * `visual_public_path` LEFT JOIN sentinel and the component will not build an
   * image URL until that sentinel is non-null. An explicit `imageSrc` always
   * wins, which also makes this useful for assets outside the standard layout.
   */
  interface Props extends Omit<HTMLAnchorAttributes, "children" | "href"> {
    href: string;
    name: string;
    domain?: EntityImageDomain;
    entityId?: string;
    imageKind?: string;
    imageSrc?: string | null;
    imageAvailable?: string | boolean | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    fallback?: Component<{ class?: string }>;
    size?: number;
    showIcon?: boolean;
    colorClass?: string;
    qualityClass?: string;
    nameClass?: string;
    maxWidth?: string;
    trailing?: Snippet;
    children?: Snippet;
  }

  let {
    href,
    name,
    domain,
    entityId,
    imageKind,
    imageSrc = null,
    imageAvailable,
    imageWidth,
    imageHeight,
    fallback,
    size = 28,
    showIcon = true,
    colorClass = "text-blue-600 dark:text-blue-400",
    qualityClass,
    class: className,
    nameClass,
    maxWidth,
    trailing,
    children,
    ...rest
  }: Props = $props();

  const resolvedImageSrc = $derived.by(() => {
    if (!showIcon) return null;
    if (imageSrc) return imageSrc;
    if (imageAvailable == null || imageAvailable === false) return null;
    if (!domain) return null;
    const hrefPath = href.split(/[?#]/, 1)[0];
    const resolvedEntityId =
      entityId ?? hrefPath.split("/").filter(Boolean).pop();
    if (!resolvedEntityId) return null;
    const kind =
      imageKind ??
      (domain === "item" || domain === "skill" ? "icon" : "primary");
    return `${base}${entityImageUrl(domain, resolvedEntityId, kind)}`;
  });

  const renderedTrailing = $derived(trailing ?? children);
</script>

<a
  {href}
  class={cn(
    "min-w-0 max-w-full items-center hover:underline",
    showIcon ? "inline-flex gap-2 align-middle" : "align-baseline",
    colorClass,
    maxWidth && "overflow-hidden whitespace-nowrap",
    className,
  )}
  style:max-width={maxWidth}
  {...rest}
>
  {#if showIcon}
    <EntityIcon
      src={resolvedImageSrc}
      alt=""
      {fallback}
      {size}
      width={imageWidth ?? size}
      height={imageHeight ?? size}
      class="shrink-0"
    />
  {/if}
  <span class={cn("min-w-0", maxWidth && "truncate", qualityClass, nameClass)}
    >{name}</span
  >
  {#if renderedTrailing}
    {@render renderedTrailing()}
  {/if}
</a>
