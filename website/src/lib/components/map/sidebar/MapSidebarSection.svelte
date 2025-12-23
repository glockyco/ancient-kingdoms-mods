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
    /** Toggle state: "all" = all checked, "some" = indeterminate, "none" = none checked */
    toggleState?: "all" | "some" | "none";
    /** Callback when toggle is clicked */
    onToggleAll?: () => void;
    /** Children to render inside the section */
    children: import("svelte").Snippet;
  }

  let {
    title,
    icon: Icon,
    iconColor,
    expanded = $bindable(true),
    onExpandedChange,
    toggleState,
    onToggleAll,
    children,
  }: Props = $props();

  const id = $props.id();

  function toggle() {
    expanded = !expanded;
    onExpandedChange?.(expanded);
  }

  function handleToggleClick(e: MouseEvent) {
    e.stopPropagation();
    onToggleAll?.();
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
      {#if toggleState !== undefined && onToggleAll}
        <input
          type="checkbox"
          checked={toggleState === "all"}
          indeterminate={toggleState === "some"}
          onclick={handleToggleClick}
          class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          aria-label="Toggle all {title.toLowerCase()}"
        />
      {/if}
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
