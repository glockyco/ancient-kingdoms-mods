<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
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
  const BANK_TAB_COSTS = [
    0, 1000, 5000, 10000, 25000, 50000, 75000, 100000, 250000, 500000,
  ];
  const BANK_TAB_ROWS = BANK_TAB_COSTS.map((cost, index) => ({
    tab: index + 1,
    cost,
    totalSlots: (index + 1) * 30,
  }));

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

  <nav aria-label="Page sections" class="text-sm text-muted-foreground">
    <ul class="flex flex-wrap gap-x-4 gap-y-1">
      <li>
        <a href="#overview" class="hover:text-foreground hover:underline"
          >Storage Overview</a
        >
      </li>
      <li>
        <a href="#backpacks" class="hover:text-foreground hover:underline"
          >Backpacks</a
        >
      </li>
      <li>
        <a href="#bank" class="hover:text-foreground hover:underline"
          >Bank Tabs and Gold</a
        >
      </li>
      <li>
        <a href="#house-chests" class="hover:text-foreground hover:underline"
          >House Chests</a
        >
      </li>
      <li>
        <a href="#item-movement" class="hover:text-foreground hover:underline"
          >Item Movement and Stacks</a
        >
      </li>
      <li>
        <a href="#vendor-buyback" class="hover:text-foreground hover:underline"
          >Vendor Buyback</a
        >
      </li>
      <li>
        <a href="#loot" class="hover:text-foreground hover:underline"
          >Loot Pickup</a
        >
      </li>
      <li>
        <a
          href="#equipment-and-death"
          class="hover:text-foreground hover:underline"
          >Equipment, Death, and Remains</a
        >
      </li>
    </ul>
  </nav>

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
            {#each [["Carry inventory", "Character", "24 base plus backpack storage", "Equip backpacks"], ["Backpack slots", "Character", "9 dedicated bag slots", "Fixed"], ["Bank item storage", "Character", "300 slots, 30 per tab", "Unlock bank tabs with gold"], ["House chests", "Account", "240 slots, 8 chest sections", "Buy a house, then buy chests"], ["Banked gold", "Account", "Separate gold vault", "Fixed"], ["Equipment", "Character", "16 equipped slots", "Fixed"], ["Keys", "Character", "Separate key storage", "Fixed"]] as row (row[0])}
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
          <!-- Source: server-scripts/UIBigBackpack.cs + server-scripts/GameManager.cs:391,396,791-803 — UIBigBackpack panel toggled by the "Backpack" input action; default binding <Keyboard>/b. -->Open
          the equipped-bag panel with the Backpack key (default
          <kbd
            class="rounded border border-border bg-muted px-1 py-0.5 font-mono text-xs"
            >B</kbd
          >) or the skillbar button.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:383-389 — backpack slots reject non-backpack items. -->Backpack
          slots accept backpacks only.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:397-400 — duplicate equipped backpack names are blocked. -->Duplicate
          backpack names cannot be equipped.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:402-418 — removal or downgrade is blocked if items would be locked away. -->Removing
          or downgrading a bag is blocked when items would be locked away.
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
                                class="text-xs text-muted-foreground hover:underline"
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
        <!-- Source: server-scripts/Player.cs:393 — characters start with one bank tab unlocked. -->
        <!-- Source: server-scripts/Player.cs:11780-11805 and 11815-11843 — bank gold withdraw and deposit commands. -->
        New characters start with tab 1 unlocked. Additional tabs unlock in order.
        Banked gold is stored separately from carried gold. Depositing moves carried
        gold into the account vault and withdrawing moves it back to the character.
      </p>
      <div class="overflow-x-auto">
        <!-- Source: server-scripts/UIBank.cs:293-308 — bank tab unlock price ladder. -->
        <!-- Source: server-scripts/Player.cs:11736-11749 — server charges current unlock price before increasing unlocked bank tabs. -->
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
        <!-- Source: server-scripts/ChestHouse.cs:81-84 and 173-176 — only the owning account can open house chest UI. -->
        <!-- Source: server-scripts/StrucItemUi.cs:33-36 — purchase warning says same-color chests share storage. -->
        You need to own a house before you can use house chests. Each chest type opens
        one fixed account-wide storage section. A second chest of the same type gives
        another access point to that section, not another 30 slots.
      </p>

      <div class="space-y-2 text-sm text-muted-foreground">
        <h3 class="font-semibold text-foreground">Buying and placing chests</h3>
        <p>
          <!-- Source: server-scripts/Housing.cs:33-38 — owned house trigger shows the H-key house panel prompt. -->
          <!-- Source: server-scripts/CustomStrucUI.cs:112-124 — H opens the structure panel only inside an owned house buildable zone. -->
          While inside a house you own, press
          <kbd
            class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-foreground"
            >H</kbd
          > to open the house panel.
        </p>
        <p>
          <!-- Source: server-scripts/CustomStrucUI.cs:54-65 — panel lists structure items and prices from HousingManager.strucItems. -->
          <!-- Source: server-scripts/StrucItemUi.cs:29-39 — selecting a chest checks gold, shows the shared-storage warning, and enters placement mode. -->
          Choose a chest from that panel, confirm the purchase warning, then place
          it inside the buildable house area.
        </p>
        <p>
          <!-- Source: server-scripts/CustomStrucUI.cs:203-210 — left click or F places the selected structure. -->
          <!-- Source: server-scripts/CustomStrucUI.cs:76-82 and 274-309 — move mode removes the structure, then respawns it without charging gold. -->
          Place the selected chest with left click or
          <kbd
            class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-foreground"
            >F</kbd
          >. Chests can be moved after placement without paying again.
        </p>
        <p>
          <!-- Source: server-scripts/CustomStrucUI.cs:68-73 and 242-260 — remove mode destroys a selected structure. -->
          <!-- Source: server-scripts/CustomStrucUI.cs:91-98 and Player.cs:7622-7641 — selling a house pays house resale value and removes placed structures; warning says chest items can be retrieved after buying another house. -->
          Individual chests can be destroyed, but there is no chest resale flow. Selling
          the house removes placed furniture, while the account-wide chest items remain
          retrievable if you buy another house.
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
          <!-- Source: server-scripts/PlayerInventory.cs:56-81 — preferred slot order yields base slots first, then unlocked backpack extension slots. -->New
          items try base carried slots first, then unlocked backpack slots.
        </li>
        <li>
          <!-- Source: server-scripts/ItemSlot.cs:31-35 and PlayerInventory.cs:1474-1486 — stack increases are clamped by target max stack. -->Matching
          stacks merge up to the target stack limit.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:426-428 and 1387-1400 — shift-drag requests and performs an inventory split. -->Shift-drag
          splits half a stack into an empty target slot.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:430-433 — non-split, non-merge inventory drag swaps slots. -->Other
          carried-item drags swap source and destination slots.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:543-549 — non-destroyable carried items cannot be destroyed. -->Non-destroyable
          items cannot be deleted.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
  <Card.Root id="vendor-buyback" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Vendor Buyback</Card.Title>
      <Card.Description
        >Every vendor keeps a temporary buyback queue.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerNpcTrading.cs:17 — buybackDuration = 600.0 (10 minutes). -->
      <!-- Source: server-scripts/PlayerNpcTrading.cs:295-317 — sell payout uses durability-adjusted sell price plus capped Charisma sell bonus; expired entries are removed on every sell; queue capped at 20. -->
      <!-- Source: server-scripts/PlayerNpcTrading.cs:500-527 — buyback purchase requires being at the same vendor and pays the exact sale payout. -->
      <p>
        Selling an item to any vendor keeps a copy of that stack in the vendor's
        buyback list for 10 minutes. Equipment uses a durability-adjusted sell
        price, then applies your Charisma sell bonus up to a 25% cap. Returning
        to the same vendor lets you re-buy the stack for the same gold the
        vendor paid you (no markup).
      </p>
      <ul class="ml-4 list-disc">
        <li>
          Each vendor stores at most 20 stacks. Oldest stacks fall off when the
          queue is full.
        </li>
        <li>Buyback entries expire 10 minutes after the sale.</li>
        <li>
          Buyback works at every NPC that buys items, including faction vendors
          and adventurer merchants.
        </li>
      </ul>
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
          <!-- Source: server-scripts/PlayerLooting.cs:49-76 — loot pickup states and 2.4-unit reach check. -->Loot
          pickup requires 2.4-unit range.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:125-144 — gold deposits directly as carried gold and splits among nearby party members. -->Gold
          goes directly to carried gold.
        </li>
        <li>Nearby party members split gold pickups.</li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:146-151 — keys are added to key storage instead of inventory slots. -->Keys
          go to key storage.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:85-122 — matching GatherQuest loot can be consumed for quest progress before entering inventory. -->Items
          that match an active GatherQuest objective are consumed on pickup when
          they advance that quest.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:162-171 — GatherInventoryQuest updates after normal inventory add succeeds. -->GatherInventoryQuest
          objectives update after the item is added to inventory, and the item
          is not consumed by that quest update.
        </li>
        <li>
          <!-- Source: server-scripts/ChestLoot.cs:314-331 and Npc.cs:2578-2591 — eligible shared chest/NPC drops route through group roll when more than one player can loot. -->
          <!-- Source: server-scripts/Monster.cs:3625-3640 — monster loot also rolls MergeItem and ScrollItem drops. -->When
          more than one player can loot the same enemy, NPC, or world loot
          chest, uncommon-or-better items, keys, chest keys, items worth more
          than 200 gold, and XP potions use group rolls instead of direct
          pickup. Enemy loot also rolls monster merge drops and scrolls.
          Quest-only items are excluded.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="equipment-and-death" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Equipment, Death, and Remains</Card.Title>
      <Card.Description>
        Inventory-adjacent rules for equipped gear durability and remains.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/PlayerEquipment.cs:36-102 — player equipment has sixteen fixed slots. -->Equipped
          gear uses 16 slots.
        </li>
        <li>
          <!-- Source: server-scripts/EquipmentItem.cs:11 — default equipment durability. -->Equipment
          starts with 10 durability.
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:3272-3294 — death reduces each equipped item's durability and warns when broken. -->Death
          reduces equipped item durability by 1.
        </li>
        <li>
          Broken equipped gear remains equipped but stops contributing while
          durability is depleted.
        </li>
        <li>
          <!-- Source: server-scripts/GatherItem.cs:289-300 and PlayerInventory.cs:133-151 — mining consumes selected pickaxe durability; 0-durability pickaxes cannot mine until repaired. -->Mining
          consumes pickaxe durability. A 0-durability pickaxe remains in
          inventory but cannot be used for mining until repaired.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerNpcTrading.cs:419-445 — repair cost recalculated server-side from missing durability and capped Charisma discount. -->
          NPC repairs use: repair cost = round(sell price × missing durability% ×
          50%), minus your Charisma purchase discount capped at 50%, with a minimum
          cost of 1 gold.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerNpcTrading.cs:460-498 and UINpcTrading.cs — repair NPCs can repair active mercenary equipment as well as player equipment. -->
          Repair NPCs can repair active mercenary equipment as well as your own equipped
          and carried gear.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerDead.cs:8 and 74-84 — player remains lifetime and expiration. -->Player
          remains last 900 seconds.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
</div>
