<script lang="ts">
  import type { QuestChainGraph } from "$lib/types/quests";
  import { getQuestTypeConfig } from "$lib/utils/quests";
  import Skull from "@lucide/svelte/icons/skull";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Package from "@lucide/svelte/icons/package";
  import Backpack from "@lucide/svelte/icons/backpack";
  import Search from "@lucide/svelte/icons/search";
  import Compass from "@lucide/svelte/icons/compass";
  import Shirt from "@lucide/svelte/icons/shirt";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import CircleHelp from "@lucide/svelte/icons/circle-help";

  interface Props {
    graph: QuestChainGraph;
  }

  let { graph }: Props = $props();

  // Layout constants (must match server-side)
  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 36;

  // Scroll container reference
  let scrollContainer: HTMLDivElement | undefined = $state();

  // Find current node for auto-scroll
  const currentNode = $derived(graph.nodes.find((n) => n.isCurrent));

  // Auto-scroll to center current quest on mount
  $effect(() => {
    if (scrollContainer && currentNode) {
      const containerWidth = scrollContainer.clientWidth;
      const nodeCenter = currentNode.x + NODE_WIDTH / 2;
      const scrollTarget = nodeCenter - containerWidth / 2;
      scrollContainer.scrollLeft = Math.max(0, scrollTarget);
    }
  });

  // Drag-to-scroll state
  let isDragging = $state(false);
  let hasDragged = $state(false);
  let startX = $state(0);
  let scrollLeftStart = $state(0);
  let lastX = $state(0);
  let lastTime = $state(0);
  let velocity = $state(0);
  let animationId: number | null = null;
  const DRAG_THRESHOLD = 5;
  const FRICTION = 0.95;
  const MIN_VELOCITY = 0.5;

  function handleMouseDown(e: MouseEvent) {
    if (!scrollContainer) return;
    // Stop any ongoing momentum animation
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    isDragging = true;
    hasDragged = false;
    startX = e.pageX - scrollContainer.offsetLeft;
    lastX = startX;
    lastTime = Date.now();
    scrollLeftStart = scrollContainer.scrollLeft;
    velocity = 0;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !scrollContainer) return;
    e.preventDefault();
    const x = e.pageX - scrollContainer.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > DRAG_THRESHOLD) {
      hasDragged = true;
    }
    scrollContainer.scrollLeft = scrollLeftStart - walk;

    // Calculate velocity
    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 0) {
      velocity = (lastX - x) / dt;
    }
    lastX = x;
    lastTime = now;
  }

  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    // Start momentum animation if there's velocity
    if (Math.abs(velocity) > 0.1 && hasDragged) {
      animateMomentum();
    }
  }

  function handleMouseLeave() {
    if (!isDragging) return;
    isDragging = false;
    if (Math.abs(velocity) > 0.1 && hasDragged) {
      animateMomentum();
    }
  }

  function animateMomentum() {
    if (!scrollContainer) return;
    // Scale velocity for smoother feel
    let momentumVelocity = velocity * 15;

    function step() {
      if (!scrollContainer || Math.abs(momentumVelocity) < MIN_VELOCITY) {
        animationId = null;
        return;
      }
      scrollContainer.scrollLeft += momentumVelocity;
      momentumVelocity *= FRICTION;
      animationId = requestAnimationFrame(step);
    }
    animationId = requestAnimationFrame(step);
  }

  function handleClick(e: MouseEvent) {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged = false;
    }
  }

  // Create a map of node positions for edge drawing
  const nodePositions = $derived(
    new Map(graph.nodes.map((n) => [n.id, { x: n.x, y: n.y }])),
  );

  // Generate SVG path for an edge (bezier curve)
  function getEdgePath(fromId: string, toId: string): string {
    const from = nodePositions.get(fromId);
    const to = nodePositions.get(toId);
    if (!from || !to) return "";

    const startX = from.x + NODE_WIDTH;
    const startY = from.y + NODE_HEIGHT / 2;
    const endX = to.x;
    const endY = to.y + NODE_HEIGHT / 2;
    const midX = (startX + endX) / 2;

    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  }

  // Map Tailwind color classes to RGB values for SVG fill
  const colorClassToRgb: Record<string, string> = {
    "text-red-500": "rgb(239 68 68)",
    "text-green-500": "rgb(34 197 94)",
    "text-amber-500": "rgb(245 158 11)",
    "text-blue-500": "rgb(59 130 246)",
    "text-indigo-500": "rgb(99 102 241)",
    "text-purple-500": "rgb(168 85 247)",
    "text-cyan-500": "rgb(6 182 212)",
  };

  function getQuestTypeColor(displayType: string): string {
    const config = getQuestTypeConfig(displayType);
    if (config) {
      return colorClassToRgb[config.iconColor] || "rgb(107 114 128)";
    }
    return "rgb(107 114 128)";
  }
</script>

{#snippet questTypeIcon(displayType: string, color: string)}
  {#if displayType === "Kill"}
    <Skull class="w-3.5 h-3.5" style="color: {color}" />
  {:else if displayType === "Gather"}
    <Leaf class="w-3.5 h-3.5" style="color: {color}" />
  {:else if displayType === "Have"}
    <Backpack class="w-3.5 h-3.5" style="color: {color}" />
  {:else if displayType === "Deliver"}
    <Package class="w-3.5 h-3.5" style="color: {color}" />
  {:else if displayType === "Find"}
    <Search class="w-3.5 h-3.5" style="color: {color}" />
  {:else if displayType === "Discover"}
    <Compass class="w-3.5 h-3.5" style="color: {color}" />
  {:else if displayType === "Equip"}
    <Shirt class="w-3.5 h-3.5" style="color: {color}" />
  {:else if displayType === "Brew"}
    <FlaskConical class="w-3.5 h-3.5" style="color: {color}" />
  {:else}
    <CircleHelp class="w-3.5 h-3.5" style="color: {color}" />
  {/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  bind:this={scrollContainer}
  class="overflow-x-auto scrollbar-thin select-none"
  class:cursor-grab={!isDragging}
  class:cursor-grabbing={isDragging}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseLeave}
  onclickcapture={handleClick}
  role="application"
  aria-label="Quest chain graph - drag to scroll, use arrow keys to navigate"
  tabindex="0"
  onkeydown={(e) => {
    if (!scrollContainer) return;
    const scrollAmount = 50;
    if (e.key === "ArrowLeft") scrollContainer.scrollLeft -= scrollAmount;
    if (e.key === "ArrowRight") scrollContainer.scrollLeft += scrollAmount;
  }}
>
  <svg
    width={graph.width}
    height={graph.height}
    viewBox="0 0 {graph.width} {graph.height}"
    class="min-w-full"
  >
    <!-- Edges -->
    {#each graph.edges as edge (edge.fromId + "-" + edge.toId)}
      <path
        d={getEdgePath(edge.fromId, edge.toId)}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="text-border"
      />
      <!-- Arrow head -->
      {@const to = nodePositions.get(edge.toId)}
      {#if to}
        <polygon
          points="{to.x - 6},{to.y + NODE_HEIGHT / 2 - 4} {to.x},{to.y +
            NODE_HEIGHT / 2} {to.x - 6},{to.y + NODE_HEIGHT / 2 + 4}"
          fill="currentColor"
          class="text-border"
        />
      {/if}
    {/each}

    <!-- Nodes -->
    {#each graph.nodes as node (node.id)}
      {@const typeColor = getQuestTypeColor(node.display_type)}
      <g>
        <!-- Node background -->
        <rect
          x={node.x}
          y={node.y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx="6"
          class={node.isCurrent
            ? "fill-primary/20 stroke-primary stroke-2"
            : "fill-muted/50 stroke-border"}
        />
        <!-- Quest type icon -->
        <foreignObject x={node.x + 7} y={node.y + 9} width={16} height={16}>
          {@render questTypeIcon(node.display_type, typeColor)}
        </foreignObject>
        <!-- Clickable link overlay -->
        <a href="/quests/{node.id}">
          <rect
            x={node.x}
            y={node.y}
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            fill="transparent"
            class="cursor-pointer"
          />
          <!-- Text -->
          <text
            x={node.x + 28}
            y={node.y + NODE_HEIGHT / 2}
            dominant-baseline="middle"
            class={node.isCurrent
              ? "fill-foreground font-medium text-sm"
              : "fill-foreground text-sm hover:fill-primary"}
          >
            {node.name.length > 20 ? node.name.slice(0, 18) + "..." : node.name}
          </text>
        </a>
      </g>
    {/each}
  </svg>
</div>

<style>
  text {
    font-family: inherit;
  }

  .scrollbar-thin::-webkit-scrollbar {
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }
</style>
