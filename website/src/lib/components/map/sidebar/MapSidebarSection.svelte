<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";

  interface Props {
    title: string;
    icon?: typeof ChevronDown;
    /** Color for the icon indicator (CSS color string) */
    iconColor?: string;
    /** Whether the section is expanded */
    expanded?: boolean;
    /** Callback when expanded state changes */
    onExpandedChange?: (expanded: boolean) => void;
    /** Children to render inside the section */
    children: import("svelte").Snippet;
  }

  let {
    title,
    icon: Icon,
    iconColor,
    expanded = $bindable(true),
    onExpandedChange,
    children,
  }: Props = $props();

  const id = $props.id();

  function toggle() {
    expanded = !expanded;
    onExpandedChange?.(expanded);
  }
</script>

<div class="border-b border-border last:border-b-0">
  <button
    type="button"
    class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
    aria-expanded={expanded}
    aria-controls="section-{id}"
    onclick={toggle}
  >
    <div class="flex items-center gap-2">
      {#if Icon}
        <Icon
          class="h-4 w-4"
          style={iconColor ? `color: ${iconColor}` : undefined}
        />
      {/if}
      <span>{title}</span>
    </div>
    <ChevronDown
      class="h-4 w-4 text-muted-foreground transition-transform duration-200 {expanded
        ? 'rotate-180'
        : ''}"
    />
  </button>

  {#if expanded}
    <div id="section-{id}" class="px-4 pb-3">
      {@render children()}
    </div>
  {/if}
</div>
