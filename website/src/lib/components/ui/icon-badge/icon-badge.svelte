<script lang="ts">
  import type { Component, Snippet } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { ICON_BADGE } from "$lib/styles/badge";

  interface Props extends Omit<HTMLAnchorAttributes, "children"> {
    /** Link destination - if provided, renders as <a>, otherwise <span> */
    href?: string;
    /** Lucide icon component to display */
    icon: Component<{ class?: string }>;
    /** Additional classes for the icon (e.g., color) */
    iconClass?: string;
    /** Additional classes for the badge container */
    class?: string;
    /** Badge label content */
    children: Snippet;
  }

  let {
    href,
    icon: Icon,
    iconClass = "",
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  const isLink = $derived(!!href);
  const badgeClass = $derived(
    `${ICON_BADGE.base} ${isLink ? ICON_BADGE.link : ICON_BADGE.static} ${className}`.trim(),
  );
</script>

<svelte:element
  this={isLink ? "a" : "span"}
  {href}
  class={badgeClass}
  {...rest}
>
  <Icon class="{ICON_BADGE.iconSize} {iconClass}" />
  {@render children()}
</svelte:element>
