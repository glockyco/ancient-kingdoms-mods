<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";

  const SECTIONS = [
    { id: "crafting", label: "Crafting at a Station" },
    { id: "augments", label: "Augments" },
  ];
</script>

<Seo
  title="Crafting and Augments - Ancient Kingdoms"
  description="How station recipes, the Crafting journal, and equipment augments work."
  path="/mechanics/crafting"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Crafting and Augments" },
    ]}
  />

  <h1 class="text-4xl font-bold">Crafting and Augments</h1>
  <PageSections sections={SECTIONS} />

  <Card.Root id="crafting" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Crafting at a Station</Card.Title>
      <Card.Description
        >Choose materials at a Craft Station and record successful crafts in the
        Crafting journal.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UICraftingStation.cs:400-449 — the current station chooses a recipe whose ingredient names and quantities match the selected materials, preferring the recipe with more ingredients. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          The station matches selected materials and quantities against its
          recipes.
        </li>
        <li>
          Unrelated extra materials do not prevent an otherwise matching recipe.
        </li>
        <li>
          If more than one recipe matches, the recipe listing the most
          ingredients takes priority.
        </li>
      </ul>
      <p>
        See the <a
          href="/recipes"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >recipe list</a
        > for ingredients and results.
      </p>
      <!-- Source: server-scripts/Player.cs:13494-13535,13569-13589 — output capacity and all ingredient quantities are checked before materials are removed; the non-food branch produces the result without a success roll. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          A craft needs every listed material and enough inventory space for its
          result.
        </li>
        <li>
          Non-food crafting consumes the materials and always produces the
          result.
        </li>
        <li>
          <a
            href="/professions/cooking"
            class="text-blue-600 hover:underline dark:text-blue-400">Cooking</a
          > rolls for success after consuming ingredients.
        </li>
        <li>
          <a
            href="/professions/alchemy"
            class="text-blue-600 hover:underline dark:text-blue-400">Alchemy</a
          > requires a learned recipe and rolls for success.
        </li>
      </ul>
      <!-- Source: server-scripts/Player.cs:13494-13503,13569-13585 — equipment receives its maximum durability; pack recipes add the final item in the pack's final quantity. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Crafted equipment starts at its maximum durability.</li>
        <li>
          A bundle recipe gives the specified quantity of its final item
          directly, not a pack to open.
        </li>
      </ul>
      <!-- Source: server-scripts/Player.cs:12414-12427 and server-scripts/UIJournal.cs:78-85,268-301 and server-scripts/UICraftingDetail.cs:33-63 — successful crafts are recorded, and discovered entries display their ingredients and count. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Successful crafts enter the Crafting journal.</li>
        <li>
          A discovered entry shows its material quantities and the number of
          successful crafts.
        </li>
      </ul>
      <!-- Source: server-scripts/Player.cs:12529-12535 — after each result, Craft All crafts again while the station panel stays open. -->
      <!-- Source: server-scripts/UICraftingStation.cs:400-450 — a craft stops when no recipe matches the materials or the result does not fit in the inventory. -->
      <p>
        <span class="block"
          >Craft All repeats the craft while the station stays open.</span
        >
        <span class="block"
          >Craft All stops when no recipe matches the remaining materials or the
          result cannot fit in your inventory.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="augments" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Attaching and Removing Augments</Card.Title>
      <Card.Description
        >Each equipment piece holds one augment.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UICraftingStation.cs:53-69,142-159,288-315 and server-scripts/Player.cs:13412-13454 — two station materials trigger attachment, equipment and augment must be in inventory, and the client checks defensive category compatibility. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          Put an augment and an equipment piece from your inventory into a Craft
          Station.
        </li>
        <li>Ammunition cannot receive an augment.</li>
        <li>
          <span class="block">Defensive augments fit armor and shields.</span>
          <span class="block"
            >Offensive augments fit weapons and other equipment.</span
          >
        </li>
      </ul>
      <!-- Source: server-scripts/Player.cs:13427-13454 and server-scripts/Inventory.cs:67-92 — attaching requires an unaugmented copy, consumes the loose augment, and returns the equipment with maximum durability. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>An equipment piece holds one augment.</li>
        <li>
          Attaching an augment consumes the loose augment and returns the
          equipment with that augment attached.
        </li>
        <li>
          The returned piece has full durability, even if it was worn before
          attachment.
        </li>
      </ul>
      <!-- Source: server-scripts/PlayerEquipment.cs:186-285 — equipment and attached augment attributes are applied only while the equipped piece has positive durability. -->
      <p>
        Augment bonuses apply while the equipment is worn and has durability
        above zero.
      </p>
      <!-- Source: server-scripts/UINpcTrading.cs:203-220,268-285 and server-scripts/PlayerNpcTrading.cs:377-398 — the removal service lists carried and equipped items; its price depends on augment quality, and it needs space for the returned augment. -->
      <div class="space-y-2">
        <p>
          An augment-removal merchant can detach an augment from carried or
          equipped gear.
        </p>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead
              ><tr class="border-b border-border"
                ><th class="py-2 pr-4 text-left font-medium">Augment quality</th
                ><th class="py-2 text-right font-medium">Removal price</th></tr
              ></thead
            >
            <tbody>
              <tr class="border-b border-border/50"
                ><td class="py-2 pr-4">Magic</td><td
                  class="py-2 text-right tabular-nums">10,000 gold</td
                ></tr
              >
              <tr class="border-b border-border/50"
                ><td class="py-2 pr-4">Epic</td><td
                  class="py-2 text-right tabular-nums">15,000 gold</td
                ></tr
              >
              <tr
                ><td class="py-2 pr-4">Other qualities</td><td
                  class="py-2 text-right tabular-nums">5,000 gold</td
                ></tr
              >
            </tbody>
          </table>
        </div>
        <p>
          The merchant leaves the equipment intact and returns the augment to
          your inventory.
        </p>
        <p>You need room for the returned augment before removal succeeds.</p>
      </div>
      <!-- Source: server-scripts/UINpcTrading.cs:97-113 — selling augmented equipment displays an attached-augment warning. -->
      <p>Sale confirmation warns when equipment has an augment attached.</p>
      <p>Remove an augment before selling if you want to keep it.</p>
      <p>
        For general equipment repair and storage, see <MechanicsLink
          section="inventory#durability-and-repair"
          >Inventory and Equipment</MechanicsLink
        >.
      </p>
    </Card.Content>
  </Card.Root>
</div>
