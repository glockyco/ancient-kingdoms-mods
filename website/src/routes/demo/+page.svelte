<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
</script>

<ModeWatcher />

<div class="container mx-auto p-8 space-y-8 max-w-6xl">
  <div class="space-y-2">
    <h1 class="text-4xl font-bold">UI Demo & Testing</h1>
    <p class="text-muted-foreground">
      Internal testing page for CSS, UI components, and UX patterns
    </p>
  </div>

  <!-- Color Palette -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Game Color Palette</h2>

    <Card.Root>
      <Card.Header>
        <Card.Title>Item Quality Colors (0-4)</Card.Title>
        <Card.Description>Based on actual game data</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <div class="grid grid-cols-5 gap-4">
          <div class="space-y-2">
            <div class="h-20 rounded-lg bg-quality-common border"></div>
            <p class="text-sm font-medium text-center">Common</p>
            <p class="text-xs text-muted-foreground text-center">Gray</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 rounded-lg bg-quality-uncommon border"></div>
            <p class="text-sm font-medium text-center">Uncommon</p>
            <p class="text-xs text-muted-foreground text-center">Green</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 rounded-lg bg-quality-magic border"></div>
            <p class="text-sm font-medium text-center">Magic</p>
            <p class="text-xs text-muted-foreground text-center">Blue</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 rounded-lg bg-quality-epic border"></div>
            <p class="text-sm font-medium text-center">Epic</p>
            <p class="text-xs text-muted-foreground text-center">Purple</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 rounded-lg bg-quality-legendary border"></div>
            <p class="text-sm font-medium text-center">Legendary</p>
            <p class="text-xs text-muted-foreground text-center">Orange</p>
          </div>
        </div>

        <div class="space-y-2">
          <p class="font-medium">Text Colors:</p>
          <div class="flex flex-wrap gap-4">
            <span class="text-quality-common font-semibold">Common</span>
            <span class="text-quality-uncommon font-semibold">Uncommon</span>
            <span class="text-quality-magic font-semibold">Magic</span>
            <span class="text-quality-epic font-semibold">Epic</span>
            <span class="text-quality-legendary font-semibold">Legendary</span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>Monster Type Colors</Card.Title>
        <Card.Description>Regular, Elite, Boss</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <div class="grid grid-cols-3 gap-4">
          <div class="space-y-2">
            <div class="h-20 rounded-lg bg-monster-regular border"></div>
            <p class="text-sm font-medium text-center">Regular</p>
            <p class="text-xs text-muted-foreground text-center">Red</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 rounded-lg bg-monster-elite border"></div>
            <p class="text-sm font-medium text-center">Elite</p>
            <p class="text-xs text-muted-foreground text-center">Purple</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 rounded-lg bg-monster-boss border"></div>
            <p class="text-sm font-medium text-center">Boss</p>
            <p class="text-xs text-muted-foreground text-center">Cyan</p>
          </div>
        </div>

        <div class="space-y-2">
          <p class="font-medium">Text Colors:</p>
          <div class="flex flex-wrap gap-4">
            <span class="text-monster-regular font-semibold"
              >Regular Monster</span
            >
            <span class="text-monster-elite font-semibold">Elite Monster</span>
            <span class="text-monster-boss font-semibold">Boss Monster</span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Components -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">shadcn-svelte Components</h2>

    <Card.Root>
      <Card.Header>
        <Card.Title>Buttons</Card.Title>
        <Card.Description>Different button variants</Card.Description>
      </Card.Header>
      <Card.Content class="flex flex-wrap gap-4">
        <Button variant="default">Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Usage Examples -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Usage Examples</h2>

    <Card.Root>
      <Card.Header>
        <Card.Title>Item Card Example</Card.Title>
        <Card.Description>Example of styled item display</Card.Description>
      </Card.Header>
      <Card.Content>
        <div
          class="inline-block p-4 bg-background border-2 border-quality-epic rounded-lg"
        >
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-muted rounded"></div>
            <div>
              <p class="font-semibold text-quality-epic">Dragon Sword</p>
              <p class="text-sm text-muted-foreground">
                Level 45 • Epic Quality
              </p>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>Monster Tag Examples</Card.Title>
        <Card.Description>Styled badges for monster types</Card.Description>
      </Card.Header>
      <Card.Content class="flex flex-wrap gap-4">
        <span
          class="px-3 py-1 bg-monster-regular/20 text-monster-regular border border-monster-regular rounded-full text-sm font-medium"
        >
          Regular
        </span>
        <span
          class="px-3 py-1 bg-monster-elite/20 text-monster-elite border border-monster-elite rounded-full text-sm font-medium"
        >
          Elite
        </span>
        <span
          class="px-3 py-1 bg-monster-boss/20 text-monster-boss border border-monster-boss rounded-full text-sm font-medium"
        >
          Boss
        </span>
      </Card.Content>
    </Card.Root>
  </section>
</div>
