<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import {
    SOURCE_TYPE_CONFIG,
    type ItemSourceType,
  } from "$lib/constants/source-types";
  import { getQualityTextColorClass } from "$lib/utils/format";
  import type {
    BackpackSource,
    HouseStorageLocation,
    InventoryMechanicsPageData,
  } from "./+page.server";

  const MAX_VISIBLE_SOURCES_PER_TYPE = 3;
  // Every section on the page, in document order. Drives the jump list. The
  // ids match each Card.Root below.
  const SECTIONS = [
    { id: "overview", label: "Storage Overview" },
    { id: "backpacks", label: "Backpacks" },
    { id: "bank", label: "Bank Tabs and Gold" },
    { id: "house-chests", label: "House Chests" },
    { id: "item-movement", label: "Item Movement and Stacks" },
    { id: "merchants", label: "Merchants, Buyback, and Repairs" },
    { id: "loot", label: "Loot Pickup" },
    { id: "equipment-templates", label: "Equipment Templates" },
    { id: "durability-and-repair", label: "Durability and Repair" },
    { id: "armor-sets", label: "Armor Sets" },
    { id: "consumables", label: "Consumables and Item Types" },
  ];
  const BANK_TAB_COSTS = [
    0, 200, 1000, 2000, 5000, 10000, 15000, 20000, 50000, 100000,
  ];
  const BANK_TAB_ROWS = BANK_TAB_COSTS.map((cost, index) => ({
    tab: index + 1,
    cost,
    totalSlots: (index + 1) * 30,
  }));
  const EQUIPMENT_TEMPLATE_COSTS = [0, 1000, 3000, 5000, 10000];
  const EQUIPMENT_TEMPLATE_ROWS = EQUIPMENT_TEMPLATE_COSTS.map(
    (cost, index) => ({
      template: index + 1,
      cost,
    }),
  );

  let { data }: { data: InventoryMechanicsPageData } = $props();

  function formatGold(value: number): string {
    return value === 0 ? "Free" : value.toLocaleString();
  }

  function getHouseRequirement(house: HouseStorageLocation): string {
    if (house.faction_id && house.faction_required > 0) {
      return `${house.faction_id} ${house.faction_required.toLocaleString()}`;
    }
    if (house.faction_id) return house.faction_id;
    return "None recorded";
  }

  function getSourcesByType(
    sources: BackpackSource[],
  ): [ItemSourceType, BackpackSource[]][] {
    const grouped: [ItemSourceType, BackpackSource[]][] = [];

    for (const source of sources) {
      const group = grouped.find(([type]) => type === source.type);
      if (group) {
        group[1].push(source);
      } else {
        grouped.push([source.type, [source]]);
      }
    }

    return grouped;
  }

  function visibleSources(sources: BackpackSource[]): BackpackSource[] {
    return sources.slice(0, MAX_VISIBLE_SOURCES_PER_TYPE);
  }
</script>

<Seo
  title="Inventory Mechanics - Ancient Kingdoms"
  description="How storage works in Ancient Kingdoms: backpack slots and bag panel, bank tabs, and house chests for account-shared storage."
  path="/mechanics/inventory"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Inventory" },
    ]}
  />

  <h1 class="text-4xl font-bold">Inventory Mechanics</h1>

  <PageSections sections={SECTIONS} />

  <Card.Root id="overview" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Storage at a Glance</Card.Title>
      <Card.Description>
        Where items and gold are stored, and whether that storage belongs to one
        character or the account.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Storage</th>
              <th class="py-2 pr-4 text-left font-medium">Scope</th>
              <th class="py-2 pr-4 text-left font-medium">Capacity</th>
              <th class="py-2 text-left font-medium">How to expand</th>
            </tr>
          </thead>
          <tbody>
            {#each [["Carry inventory", "Character", "24 base plus backpack storage", "Equip backpacks"], ["Backpack slots", "Character", "9 dedicated bag slots", "Fixed"], ["Bank item storage", "Character", "300 slots, 30 per tab", "Unlock bank tabs with gold"], ["House chests", "Account", "560 slots, 8 chest sections", "Buy a house, then buy chests"], ["Banked gold", "Account", "Separate gold vault", "Fixed"], ["Equipment", "Character", "16 equipped slots", "Fixed"], ["Keys", "Character", "Separate key storage", "Fixed"]] as row (row[0])}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td class="py-2 pr-4 font-medium">{row[0]}</td>
                <td class="py-2 pr-4">{row[1]}</td>
                <td class="py-2 pr-4">{row[2]}</td>
                <td class="py-2">{row[3]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="backpacks" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Backpacks</Card.Title>
      <Card.Description>
        Backpacks equip into nine dedicated bag slots inside their own panel,
        separate from the main inventory. Each equipped bag expands the carried
        storage shown alongside those slots.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-5">
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/UIBigBackpack.cs + server-scripts/GameManager.cs:OnBackpackKeyPressed — the Backpack input action shows or hides the UIBigBackpack panel. -->Open
          the equipped-bag panel with the Backpack key (default
          <kbd
            class="rounded border border-border bg-muted px-1 py-0.5 font-mono text-sm"
            >B</kbd
          >) or the skillbar button.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:387-393 — backpack slots reject non-backpack items. -->Backpack
          slots accept backpacks only.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:432-446 and server-scripts/BackpackItem.cs:7,11-18 — only backpacks marked Unique are blocked when the same name is already equipped. -->Unique
          backpacks can only be equipped once. Any other backpack can fill
          several bag slots at once.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:417-433 — removal or downgrade is blocked if items would be locked away. -->Removing
          or downgrading a bag is blocked when items would be locked away.
        </li>
        <!-- Source: server-scripts/PlayerInventory.cs:480-490,529-535,623-629 — the bag drag handler blocks extended slots after the first; bank and house chest drags reject equipped bags. -->
        <li>
          <span class="block"
            >Bank and house chest transfers reject equipped bags.</span
          >
          <span class="block"
            >Move a bag to base inventory before changing it, rather than into
            its own storage.</span
          >
        </li>
      </ul>

      <p class="text-sm text-muted-foreground">
        Source Level is an obtainability hint. It is not a character level
        requirement.
      </p>

      {#if data.backpacks.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="py-2 pr-4 text-left font-medium">Bag</th>
                <th class="py-2 pr-4 text-right font-medium">Slots</th>
                <th class="py-2 pr-4 text-right font-medium">Unique</th>
                <th class="py-2 pr-4 text-right font-medium">Source Level</th>
                <th class="py-2 text-left font-medium">Known sources</th>
              </tr>
            </thead>
            <tbody>
              {#each data.backpacks as backpack (backpack.id)}
                <tr
                  class="border-b border-border/50 align-top hover:bg-muted/30"
                >
                  <td class="py-2 pr-4">
                    <ItemLink
                      itemId={backpack.id}
                      itemName={backpack.name}
                      colorClass={getQualityTextColorClass(backpack.quality)}
                      tooltipHtml={backpack.tooltip_html}
                      maxWidth="185px"
                    />
                  </td>
                  <td class="py-2 pr-4 text-right font-mono"
                    >{backpack.backpack_slots}</td
                  >
                  <td class="py-2 pr-4 text-right font-mono">
                    {backpack.backpack_is_unique ? "Yes" : "No"}
                  </td>
                  <td class="py-2 pr-4 text-right font-mono">
                    {#if backpack.min_source_level !== null}
                      {backpack.min_source_level}
                    {:else}
                      <span class="text-muted-foreground">—</span>
                    {/if}
                  </td>
                  <td class="py-2">
                    {#if backpack.sources.length === 0}
                      <span class="text-muted-foreground">No known source</span>
                    {:else}
                      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {#each getSourcesByType(backpack.sources) as [type, sources] (type)}
                          {@const sourceConfig = SOURCE_TYPE_CONFIG[type]}
                          <div class="flex flex-wrap items-center gap-1.5">
                            <sourceConfig.icon
                              class="h-4 w-4 shrink-0 {sourceConfig.color}"
                            />
                            <span class="text-muted-foreground"
                              >{sourceConfig.label}</span
                            >
                            {#each visibleSources(sources) as source, i (source.id)}
                              <a
                                href="{sourceConfig.linkPrefix}{source.id}"
                                class="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {source.name}
                              </a>
                              {#if i < visibleSources(sources).length - 1}<span
                                  class="text-muted-foreground">,</span
                                >{/if}
                            {/each}
                            {#if sources.length > MAX_VISIBLE_SOURCES_PER_TYPE}
                              <a
                                href="/items/{backpack.id}"
                                class="text-sm text-muted-foreground hover:underline"
                              >
                                +{sources.length - MAX_VISIBLE_SOURCES_PER_TYPE}
                                more
                              </a>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">No backpack data found.</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root id="bank" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Bank Tabs and Gold</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-5">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Player.cs:403 — characters start with one bank tab unlocked. -->
        <!-- Source: server-scripts/Player.cs:13328-13353 and 13363-13391 — bank gold withdraw and deposit commands. -->
        New characters start with tab 1 unlocked. Additional tabs unlock in order.
        Banked gold is stored separately from carried gold. Depositing moves carried
        gold into the account vault and withdrawing moves it back to the character.
      </p>
      <!-- Source: server-scripts/Npc.cs:1722-1750 and server-scripts/UIBank.cs:83-99 — interacting with a nearby banker opens the bank, which requires the player to remain alive and out of combat. -->
      <p class="text-sm text-muted-foreground">
        Open the bank at a banker while alive and out of combat.
      </p>
      <!-- Source: server-scripts/UIBank.cs:83-99 — bank closes without a living, out-of-combat player targeting a nearby banker within 2 units. -->
      <p class="text-sm text-muted-foreground">
        <span class="block"
          >The bank stays open only while you are alive, out of combat, and
          within 2 units of the selected banker.</span
        >
        <span class="block">Moving away or entering combat closes it.</span>
      </p>
      <!-- Source: server-scripts/PlayerBank.cs:390-449 — Auto Stack moves carried stackable items only when the selected tab already contains that item, filling existing stacks before empty slots. -->
      <p class="text-sm text-muted-foreground">
        <span class="block">Auto Stack checks the selected tab only.</span>
        <span class="block"
          >It moves stackable carried items already present there.</span
        >
        <span class="block"
          >It fills matching stacks, then uses empty slots in that tab for any
          remainder.</span
        >
        <span class="block">New item types and equipment stay carried.</span>
      </p>
      <div class="overflow-x-auto">
        <!-- Source: server-scripts/UIBank.cs:294-307 — bank tab unlock price ladder. -->
        <!-- Source: server-scripts/Player.cs:13284-13297 — server charges current unlock price before increasing unlocked bank tabs. -->
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Unlocking tab</th>
              <th class="py-2 pr-4 text-right font-medium">Gold cost</th>
              <th class="py-2 text-right font-medium">Total slots</th>
            </tr>
          </thead>
          <tbody>
            {#each BANK_TAB_ROWS as row (row.tab)}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td class="py-2 pr-4">{row.tab}</td>
                <td class="py-2 pr-4 text-right font-mono"
                  >{formatGold(row.cost)}</td
                >
                <td class="py-2 text-right font-mono">{row.totalSlots}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="house-chests" class="bg-muted/30">
    <Card.Header>
      <Card.Title>House Chests and Shared Storage</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-6">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Housing.cs:33-49 — entering an unowned house area opens the house purchase flow. -->
        <!-- Source: server-scripts/ChestHouse.cs:OnInteractClient and UserCode_CmdOpenChestHouse__NetworkIdentity__String — only the owning account can open house chest UI. -->
        <!-- Source: server-scripts/StrucItemUi.cs:32-35 — purchase warning says same-color chests share storage. -->
        <span class="block">Houses belong to an account.</span>
        <span class="block"
          >A house claimed by another account cannot be purchased.</span
        >
        <span class="block"
          >Each chest type opens one fixed account-wide storage section.</span
        >
        <span class="block"
          >A second chest of the same type gives another access point, not
          another 70 slots.</span
        >
      </p>
      <!-- Source: server-scripts/Housing.cs:33-49 and server-scripts/ChestHouse.cs:83-98,167-175 — the house claim and chest access compare account identity. -->
      <p class="text-sm text-muted-foreground">
        <span class="block"
          >Only the owning account can access its house chests.</span
        >
        <span class="block">Bank items remain character-specific.</span>
      </p>

      <div class="space-y-2 text-sm text-muted-foreground">
        <h3 class="font-semibold text-foreground">Buying and placing chests</h3>
        <p>
          <!-- Source: server-scripts/Housing.cs:33-38 — owned house trigger shows the H-key house panel prompt. -->
          <!-- Source: server-scripts/CustomStrucUI.cs:123-135 — H opens the structure panel only inside an owned house buildable zone. -->
          While inside a house you own, press
          <kbd
            class="rounded border border-border bg-muted px-1.5 py-0.5 text-sm text-foreground"
            >H</kbd
          > to open the house panel.
        </p>
        <p>
          <!-- Source: server-scripts/CustomStrucUI.cs:58-69 — panel lists structure items and prices from HousingManager.strucItems. -->
          <!-- Source: server-scripts/StrucItemUi.cs:29-39 — selecting a chest checks gold, shows the shared-storage warning, and enters placement mode. -->
          Choose a chest from that panel, confirm the purchase warning, then place
          it inside the buildable house area.
        </p>
        <p>
          <span class="block"
            ><!-- Source: server-scripts/CustomStrucUI.cs:203-226 — left click or F places the selected structure, or drops a moved one at the new spot. -->
            <!-- Source: server-scripts/CustomStrucUI.cs:80-86, 328-347 and Player.cs:13079-13091 — move mode hides the structure, then repositions the same one without charging gold. -->
            Place the selected chest with left click or
            <kbd
              class="rounded border border-border bg-muted px-1.5 py-0.5 text-sm text-foreground"
              >F</kbd
            >.</span
          >
          <span class="block"
            >Chests can be moved after placement without paying again.</span
          >
          <span class="block"
            >A moved chest keeps its contents: it is repositioned, not rebuilt.</span
          >
        </p>
        <p>
          <!-- Source: server-scripts/CustomStrucUI.cs:72-77 and 259-277 — remove mode destroys a selected structure. -->
          <!-- Source: server-scripts/CustomStrucUI.cs:102-109 and Player.cs:9985-10018 — selling a house pays its resale value and destroys the placed structures; warning says chest items can be retrieved after buying another house. -->
          <span class="block"
            >Individual chests can be destroyed without resale.</span
          >
          <span class="block"
            >Selling the house removes its <a
              href="/mechanics/housing#furniture"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >furniture</a
            >.</span
          >
          <span class="block"
            >Account-wide chest items remain available after you buy another
            house.</span
          >
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">House locations</h3>
        {#if data.houses.length > 0}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 pr-4 text-left font-medium">House</th>
                  <th class="py-2 pr-4 text-left font-medium">Zone</th>
                  <th class="py-2 pr-4 text-right font-medium">Base price</th>
                  <th class="py-2 pr-4 text-left font-medium">Requirement</th>
                  <th class="py-2 text-left font-medium">Map</th>
                </tr>
              </thead>
              <tbody>
                {#each data.houses as house (house.id)}
                  <tr class="border-b border-border/50 hover:bg-muted/30">
                    <td class="py-2 pr-4 font-medium">{house.name}</td>
                    <td class="py-2 pr-4">{house.zone_name ?? "Unknown"}</td>
                    <td class="py-2 pr-4 text-right font-mono"
                      >{house.base_price.toLocaleString()}</td
                    >
                    <td class="py-2 pr-4">{getHouseRequirement(house)}</td>
                    <td class="py-2"
                      ><MapLink
                        entityId={house.id}
                        entityType="house"
                        compact
                      /></td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">
            No house purchase data found.
          </p>
        {/if}
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Chest sections</h3>
        {#if data.houseChests.length > 0}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 pr-4 text-left font-medium">Chest</th>
                  <th class="py-2 pr-4 text-left font-medium">Slots</th>
                  <th class="py-2 pr-4 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {#each data.houseChests as chest (chest.id)}
                  <tr class="border-b border-border/50 hover:bg-muted/30">
                    <td class="py-2 pr-4 font-medium">
                      <ItemLink
                        itemId={chest.id}
                        itemName={chest.name}
                        tooltipHtml={chest.tooltip_html}
                      />
                    </td>
                    <td class="py-2 pr-4 font-mono"
                      >{chest.slot_start}-{chest.slot_end}</td
                    >
                    <td class="py-2 pr-4 text-right font-mono"
                      >{chest.structure_price.toLocaleString()}</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">
            No house chest item data found.
          </p>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="item-movement" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Item Movement and Stacks</Card.Title>
      <Card.Description>
        Slot choice, stack handling, splitting, swaps, and deletion rules.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:67-93 — preferred slot order yields base slots first, then unlocked backpack extension slots. -->New
          items try base carried slots first, then unlocked backpack slots.
        </li>
        <li>
          <!-- Source: server-scripts/ItemSlot.cs:23-27 and PlayerInventory.cs:1795-1809 — stack increases are clamped by target max stack. -->Matching
          stacks merge up to the target stack limit.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:449-454 and 498-511 — a drag between two inventory slots with Shift held opens an amount picker when the source stack holds more than one item and the target slot is empty. PlayerInventory.cs:1717-1729 — the server validates and splits the requested amount. -->Hold
          Shift while you drag a stack onto an empty slot. An amount picker
          opens and moves the chosen amount into that slot.
        </li>
        <!-- Source: server-scripts/PlayerInventory.cs:529-585,623-681,1717-1779 and server-scripts/PlayerBank.cs:53-72 — splitting supports carried slots and transfers to or from bank and house chest slots. -->
        <li>
          <span class="block"
            >Splitting also works between carried inventory and bank or house
            chest slots.</span
          >
          <span class="block"
            >Use an empty destination for an exact quantity.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:513-516 — non-split, non-merge inventory drag swaps slots. -->Other
          carried-item drags swap source and destination slots.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:694-702 and 2007-2015 — non-destroyable carried items cannot be destroyed. -->Non-destroyable
          items cannot be deleted.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
  <Card.Root id="merchants" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Merchants, Buyback, and Repairs</Card.Title>
      <Card.Description
        >Buying, selling, recovering, and repairing items.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerNpcTrading.cs:170-226 — trading requires an idle player near a merchant; purchases check token or gold cost and storage for the full delivered quantity, including pack contents. -->
      <p>
        <span class="block"
          >Buying requires an idle character within 2.4 units of a merchant.</span
        >
        <span class="block">Selling and buyback require a 2-unit range.</span>
        <span class="block">Purchases cost gold or the specified token.</span>
        <span class="block">The full quantity must fit in carried storage.</span
        >
        <span class="block"
          >Packs deliver their contents directly, not a pack item.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerNpcTrading.cs:250-318,52-60 — only sellable items are accepted; damaged equipment loses sale value; Charisma adds at most 25% to the sale price. -->
      <p>
        <span class="block">Damaged equipment sells for less.</span>
        <span class="block">Charisma raises the sale price by at most 25%.</span
        >
      </p>
      <!-- Source: server-scripts/UINpcTrading.cs:97-113 and server-scripts/PlayerNpcTrading.cs:377-397 — the sale dialog warns about attached augments; removal returns an augment when there is carried space. -->
      <p>
        <span class="block">Selling augmented gear triggers a warning.</span>
        <span class="block"
          >Remove an augment you want to keep before selling the equipment.</span
        >
        <span class="block"
          ><a
            href="/mechanics/crafting#augments"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Augment removal</a
          > needs carried space for the recovered item.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerNpcTrading.cs:17,295-317,495-526 — sales enter a 20-stack player buyback list for 600 seconds; any trading NPC can sell the full stack back for the recorded payout if it fits. -->
      <p>
        <span class="block"
          >Buyback holds up to 20 recent sold stacks for 10 minutes.</span
        >
        <span class="block"
          >Any trading merchant can return a stack for its recorded sale total.</span
        >
        <span class="block">The entire stack must fit in carried storage.</span>
        <span class="block">New sales push out the oldest entries.</span>
      </p>
      <!-- Source: server-scripts/PlayerNpcTrading.cs:19-49,413-479 — only repair-enabled merchants repair damaged gear; price uses half the sell value times missing durability fraction, less a capped Charisma discount, at least 1 gold. -->
      <p>
        <span class="block"
          >Only repair merchants restore damaged equipment.</span
        >
        <span class="block"
          >They repair equipped and carried gear and active mercenary equipment.</span
        >
        <span class="block"
          >Repair cost is round(sell value × missing durability fraction × 50%),
          less a Charisma purchase discount of at most 50%.</span
        >
        <span class="block">The minimum cost is 1 gold.</span>
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="loot" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Loot Pickup</Card.Title>
      <Card.Description>
        How loot moves from enemies and containers into character storage.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — loot pickup states and 2.4-unit reach check. -->Loot
          pickup requires 2.4-unit range.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — gold deposits directly as carried gold and splits among nearby party members. -->Gold
          goes directly to carried gold.
        </li>
        <li>Nearby party members split gold pickups.</li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — keys are added to key storage instead of inventory slots. -->Keys
          go to key storage.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — matching GatherQuest loot can be consumed for quest progress before entering inventory. -->Items
          that match an active GatherQuest objective are consumed on pickup when
          they advance that quest.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — GatherInventoryQuest updates after normal inventory add succeeds. -->GatherInventoryQuest
          objectives update after the item is added to inventory, and the item
          is not consumed by that quest update.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — a failed inventory add keeps the loot slot and sends "Your inventory is full". -->When
          the inventory is full, the item stays in the loot window and the game
          reports that the inventory is full.
        </li>
        <li>
          <!-- Source: server-scripts/ChestLoot.cs:323-340 and Npc.cs:UserCode_CmdLootMonster — eligible shared chest/NPC drops route through group roll when more than one player can loot. -->
          <!-- Source: server-scripts/Monster.cs:UserCode_CmdLootMonster — monster loot also rolls MergeItem and ScrollItem drops. -->When
          more than one player can loot the same enemy, NPC, or world loot
          chest, uncommon-or-better items, keys, chest keys, items worth more
          than 200 gold, and XP potions use group rolls instead of direct
          pickup. Enemy loot also rolls monster merge drops and scrolls.
          Quest-only items are excluded.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="equipment-templates" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Equipment Templates</Card.Title>
      <Card.Description>
        <!-- Source: server-scripts/PlayerEquipment.cs:32,42-47,396-398,1669-1691 — each character can use up to five equipment templates and switch between stored loadouts. -->
        Store up to five gear loadouts per character and swap between them.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerEquipment.cs:485-494 — template 2 through 5 unlock prices. -->
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {#each EQUIPMENT_TEMPLATE_ROWS as row (row.template)}
          <div
            class="min-w-0 rounded border border-border bg-muted/50 px-2 py-2 text-center"
          >
            <span class="block truncate text-sm">Template {row.template}</span>
            <span class="block truncate font-mono text-foreground"
              >{formatGold(row.cost)}</span
            >
          </div>
        {/each}
      </div>

      <ul class="list-disc space-y-1 pl-5">
        <li>
          <!-- Source: server-scripts/PlayerEquipment.cs:57-58,468-482,1670-1704 — template entries store an item hash and augment name, and switching applies all sixteen stored equipment slots. -->
          Switching applies saved choices to all 16 equipment slots.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerEquipment.cs:42-45,409-436 and server-scripts/Database.cs:3118-3120 — characters start with template 1 unlocked, and character creation captures starting equipment into template 1. -->
          Template 1 starts out holding the gear your character was created with.
        </li>
        <!-- Source: server-scripts/PlayerEquipment.cs:455-482,1640-1655 — active template tracks equipment changes and unlocking copies current gear then activates the new template. -->
        <li>
          <span class="block"
            >Your active template changes when you change gear.</span
          >
          <span class="block"
            >Unlocking another template copies your current gear and activates
            the new template.</span
          >
        </li>
        <!-- Source: server-scripts/PlayerEquipment.cs:526-565,596-605,679-685 and server-scripts/PlayerInventory.cs:67-93 — template selection searches equipped and carried slots, including unlocked backpack storage, for the saved item and augment pair. -->
        <li>
          <span class="block"
            >Switching uses equipped and carried gear, including unlocked
            backpack slots.</span
          >
          <span class="block"
            >It cannot retrieve items from the bank or a house chest.</span
          >
          <span class="block"
            >Attached augments must match the saved choice.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/PlayerEquipment.cs:538-567,608-620 — unavailable or unusable saved items leave the destination equipment slot empty. -->
          Missing or unusable saved items leave their equipment slots empty.
        </li>
        <!-- Source: server-scripts/PlayerEquipment.cs:568-579,622-676 — incompatible two-handed and off-hand combinations or insufficient carried space for removed gear refuse the entire switch. -->
        <li>
          A switch fails if the final weapon combination conflicts or removed
          gear cannot fit in carried storage.
        </li>
        <li>
          <!-- Source: server-scripts/Database.cs:425-435,782-783,2665-2689 — character_equipment_templates stores per-character template slots with a unique character, template, and slot index. -->
          Templates belong to one character and do not carry across your other characters.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="durability-and-repair" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Equipment Durability and Repair</Card.Title>
      <Card.Description>
        Broken equipment loses its bonuses until repaired.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/EquipmentItem.cs:13-16 and server-scripts/PlayerEquipment.cs:57-58 — equipment defaults to 10 maximum durability and player equipment has 16 slots. -->
      <p>
        Equipment defaults to 10 maximum durability across 16 equipped slots.
      </p>
      <!-- Source: server-scripts/Player.cs:4013-4023 — death reduces equipped item durability by one. -->
      <p>
        <span class="block"
          >Death reduces the durability of each equipped item by 1.</span
        >
        <span class="block"
          ><a
            href="/mechanics/death#death"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Death and Remains</a
          > explains what happens to carried items.</span
        >
      </p>
      <!-- Source: server-scripts/Combat.cs:733-755 — a successful armor-breaking skill rolls a random equipped slot and removes 1–4 durability if it contains working gear. -->
      <p>
        Armor-breaking skills can remove 1–4 durability from a randomly chosen
        working equipment slot.
      </p>
      <!-- Source: server-scripts/Equipment.cs:6-58 and server-scripts/PlayerEquipment.cs:194-319,1614-1625 — gear at zero durability gives no equipment or attached augment attribute bonuses and no longer counts toward its armor set. -->
      <p>
        <span class="block"
          >At zero durability, gear stays equipped but gives no equipment or
          attached augment stats.</span
        >
        <span class="block">It stops counting toward armor set bonuses.</span>
      </p>
      <!-- Source: server-scripts/ScrollItem.cs:9-65 — a repair kit restores damaged equipped items up to its quality; targeting an owned mercenary redirects it, and no qualifying item leaves the kit unused. -->
      <p>
        <span class="block"
          >A repair kit restores equipped items of its quality or lower to full
          durability.</span
        >
        <span class="block"
          >Target your own mercenary to repair that mercenary instead.</span
        >
        <span class="block"
          >A kit is not consumed if no eligible gear needs repair.</span
        >
      </p>
      <!-- Source: server-scripts/ScrollItem.cs:22-56, server-scripts/PlayerNpcTrading.cs:28-42,413-441 and server-scripts/Player.cs:4462-4465 — kits act on equipped slots; repair merchants accept carried equipment, including broken pickaxes. -->
      <p>
        <span class="block">Kits do not repair inventory tools.</span>
        <span class="block"
          >A broken pickaxe cannot mine until you repair it at a repair
          merchant.</span
        >
      </p>
      <p>
        <a
          href="#merchants"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Merchant repairs</a
        >
        cover carried gear and show the repair price.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="armor-sets" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Armor Sets</Card.Title>
      <Card.Description
        >Only working pieces of the same set count.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerEquipment.cs:287-317,1614-1625 and server-scripts/MercenaryEquipment.cs:148-185 — three matching equipped working pieces give attributes; five give player skill levels; mercenaries apply only the three-piece attributes. -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Working set pieces</th
              >
              <th class="py-2 text-left font-medium">Bonus</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4">3 equipped</td>
              <td class="py-2">The set's attribute bonuses</td>
            </tr>
            <tr>
              <td class="py-2 pr-4">5 equipped</td>
              <td class="py-2"
                >The set's skill-level bonuses, for players only</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/PlayerEquipment.cs:1580-1595,1614-1625 and server-scripts/EquipmentItem.cs:485-527 — set membership is by set name and durability must remain above zero. -->
      <p>
        <span class="block">The pieces must belong to the same named set.</span>
        <span class="block"
          >A broken or unequipped piece can remove a threshold bonus.</span
        >
      </p>
      <!-- Source: server-scripts/MercenaryEquipment.cs:148-185,226-241 and server-scripts/EquipmentItem.cs:525-527 — mercenary set processing has the three-piece attribute threshold but no five-piece skill threshold. -->
      <p>
        <span class="block"
          >Mercenaries receive the three-piece attribute bonus, not the
          five-piece skill bonus.</span
        >
        <span class="block"
          >See <a
            href="/mercenaries#equipment"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >mercenary equipment</a
          >.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="consumables" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Consumables and Item Types</Card.Title>
      <Card.Description
        >What use changes and what restrictions remain.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PotionItem.cs:77-85,119-144, server-scripts/FoodItem.cs:14-35 and server-scripts/ScrollItem.cs:67-83 — potions restore resources or apply buffs, food and drink apply buffs, and spell scrolls invoke skills. -->
      <p>
        <span class="block">Potions restore resources or apply buffs.</span>
        <span class="block">Food and drink apply buffs.</span>
        <span class="block"
          >Spell scrolls activate a skill without teaching it.</span
        >
      </p>
      <!-- Source: server-scripts/uMMORPG.Scripts.ScriptableItems/RecipeItem.cs:10-27 and server-scripts/CraftingStation.cs:8-10,50-58 — recipe items teach a potion recipe once; station crafting uses its configured material combinations. -->
      <p>
        <span class="block">Recipe items teach a potion recipe once.</span>
        <span class="block"
          >Crafting materials need a matching recipe at a station.</span
        >
        <span class="block"
          >See <a
            href="/mechanics/crafting#crafting"
            class="text-blue-600 hover:underline dark:text-blue-400">crafting</a
          >.</span
        >
      </p>
      <!-- Source: server-scripts/UsableItem.cs:14-26,30-56 — items with the same cooldown category share a cooldown; an unset category defaults to the item name, and use removes invisibility. -->
      <p>
        <span class="block"
          >Usable items with the same cooldown category share a timer.</span
        >
        <span class="block"
          >When no category is set, the item name identifies its timer.</span
        >
        <span class="block">Using an item removes invisibility.</span>
      </p>
      <!-- Source: server-scripts/PotionItem.cs:124-144 and server-scripts/FoodItem.cs:14-35 — each consumable replaces active buffs with the same nonempty buff category. -->
      <p>
        Potion, food, and drink buffs replace active buffs in the same nonempty
        category instead of stacking with them.
      </p>
      <!-- Source: server-scripts/Item.cs:20-24, server-scripts/PlayerNpcTrading.cs:250-257, server-scripts/PlayerTrading.cs:438-441 and server-scripts/PlayerInventory.cs:694-702 — sale, player trade, and destruction check separate item permissions. -->
      <p>
        <span class="block"
          >Sellable, tradable, and destroyable are separate permissions.</span
        >
        <span class="block"
          >An item can be barred from player trades but accepted by a merchant.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
