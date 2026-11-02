<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";

  let {
    href,
    enhanced,
    props,
    children,
  }: {
    href: string;
    enhanced: boolean;
    props: HTMLAnchorAttributes & { disabled?: boolean };
    children: Snippet;
  } = $props();

  const anchorProps = $derived.by(() => {
    const { type, disabled, ...attributes } = props;
    void type;
    void disabled;
    return attributes;
  });
</script>

<a
  {...anchorProps}
  href={props.disabled ? undefined : href}
  aria-disabled={props.disabled ? true : undefined}
  role={props.disabled ? "link" : undefined}
  tabindex={props.disabled ? -1 : undefined}
  onkeydown={(event) => {
    if (props.disabled) {
      event.preventDefault();
      return;
    }
    if (
      enhanced &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      props.onkeydown?.(event);
    }
  }}
  onclick={(event) => {
    if (props.disabled) {
      event.preventDefault();
      return;
    }
    // Preserve opening a page in a new tab or window, and native navigation before hydration.
    if (
      !enhanced ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    props.onclick?.(event);
  }}
>
  {@render children()}
</a>
