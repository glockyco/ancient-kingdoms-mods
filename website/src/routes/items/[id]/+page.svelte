<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	export let data: PageData;

	const { item } = data;

	const qualityColors = [
		'bg-quality-0',
		'bg-quality-1',
		'bg-quality-2',
		'bg-quality-3',
		'bg-quality-4'
	];

	const qualityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

	function parseJson<T>(json: string | null): T | null {
		if (!json) return null;
		try {
			return JSON.parse(json) as T;
		} catch {
			return null;
		}
	}

	$: stats = parseJson<Record<string, number>>(item.stats);
	$: classRequired = parseJson<string[]>(item.class_required) || [];
	$: droppedBy = parseJson<Array<{ monster_id: string; rate: number; zone_id: string }>>(
		item.dropped_by
	);
	$: soldBy = parseJson<
		Array<{ npc_id: string; price: number; currency_item_id: string | null; zone_id: string }>
	>(item.sold_by);
	$: rewardedBy = parseJson<Array<{ quest_id: string }>>(item.rewarded_by);
	$: craftedFrom = parseJson<Array<{ recipe_id: string; result_amount: number }>>(
		item.crafted_from
	);
	$: gatheredFrom = parseJson<Array<{ gather_item_id: string; rate: number }>>(item.gathered_from);
	$: usedInRecipes = parseJson<Array<{ recipe_id: string; amount: number }>>(item.used_in_recipes);
	$: neededForQuests = parseJson<Array<{ quest_id: string; purpose: string; amount: number }>>(
		item.needed_for_quests
	);
</script>

<svelte:head>
	<title>{item.name} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
	<!-- Header -->
	<div>
		<Button href="/items" variant="outline" class="mb-4">← Back to Items</Button>

		<div class="flex items-start gap-4">
			<div class="flex-1">
				<div class="flex items-center gap-3 mb-2">
					<h1 class="text-4xl font-bold">{item.name}</h1>
					<span class="px-3 py-1 rounded text-sm font-medium {qualityColors[item.quality]}">
						{qualityNames[item.quality]}
					</span>
				</div>
				<p class="text-xl text-muted-foreground">
					{item.item_type || 'Unknown type'}
				</p>
			</div>
		</div>
	</div>

	<!-- Basic Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Basic Information</Card.Title>
		</Card.Header>
		<Card.Content class="grid grid-cols-2 gap-4">
			<div>
				<div class="text-sm text-muted-foreground">Item ID</div>
				<div class="font-mono text-sm">{item.id}</div>
			</div>

			{#if item.level_required > 0}
				<div>
					<div class="text-sm text-muted-foreground">Level Required</div>
					<div class="font-medium">{item.level_required}</div>
				</div>
			{/if}

			{#if classRequired.length > 0}
				<div>
					<div class="text-sm text-muted-foreground">Class Required</div>
					<div class="font-medium">{classRequired.join(', ')}</div>
				</div>
			{/if}

			{#if item.slot}
				<div>
					<div class="text-sm text-muted-foreground">Equipment Slot</div>
					<div class="font-medium">{item.slot}</div>
				</div>
			{/if}

			{#if item.weapon_category}
				<div>
					<div class="text-sm text-muted-foreground">Weapon Type</div>
					<div class="font-medium">{item.weapon_category}</div>
				</div>
			{/if}

			<div>
				<div class="text-sm text-muted-foreground">Max Stack</div>
				<div class="font-medium">{item.max_stack}</div>
			</div>

			{#if item.buy_price > 0}
				<div>
					<div class="text-sm text-muted-foreground">Buy Price</div>
					<div class="font-medium text-yellow-600 dark:text-yellow-400">{item.buy_price}g</div>
				</div>
			{/if}

			{#if item.sell_price > 0}
				<div>
					<div class="text-sm text-muted-foreground">Sell Price</div>
					<div class="font-medium text-yellow-600 dark:text-yellow-400">{item.sell_price}g</div>
				</div>
			{/if}

			<div>
				<div class="text-sm text-muted-foreground">Tradable</div>
				<div class="font-medium">{item.tradable ? 'Yes' : 'No'}</div>
			</div>

			<div>
				<div class="text-sm text-muted-foreground">Sellable</div>
				<div class="font-medium">{item.sellable ? 'Yes' : 'No'}</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Stats -->
	{#if stats && Object.keys(stats).length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Stats</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
					{#each Object.entries(stats) as [stat, value]}
						<div class="flex justify-between items-center p-2 rounded bg-muted">
							<span class="text-sm font-medium">{stat}</span>
							<span class="text-sm font-bold">{value > 0 ? '+' : ''}{value}</span>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Tooltip/Description -->
	{#if item.tooltip}
		<Card.Root>
			<Card.Header>
				<Card.Title>Description</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-sm whitespace-pre-wrap">{item.tooltip}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Relationships -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Dropped By -->
		{#if droppedBy && droppedBy.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Dropped By</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						{#each droppedBy as drop}
							<div class="flex justify-between items-center text-sm">
								<a href="/monsters/{drop.monster_id}" class="hover:underline font-medium">
									{drop.monster_id}
								</a>
								<span class="text-muted-foreground">{(drop.rate * 100).toFixed(1)}%</span>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Sold By -->
		{#if soldBy && soldBy.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Sold By</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						{#each soldBy as vendor}
							<div class="flex justify-between items-center text-sm">
								<a href="/npcs/{vendor.npc_id}" class="hover:underline font-medium">
									{vendor.npc_id}
								</a>
								<span class="text-yellow-600 dark:text-yellow-400">{vendor.price}g</span>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Quest Reward -->
		{#if rewardedBy && rewardedBy.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Quest Reward</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						{#each rewardedBy as quest}
							<div class="text-sm">
								<a href="/quests/{quest.quest_id}" class="hover:underline font-medium">
									{quest.quest_id}
								</a>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Crafted From -->
		{#if craftedFrom && craftedFrom.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Crafted From Recipe</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						{#each craftedFrom as recipe}
							<div class="flex justify-between items-center text-sm">
								<span class="font-medium">{recipe.recipe_id}</span>
								<span class="text-muted-foreground">x{recipe.result_amount}</span>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Gathered From -->
		{#if gatheredFrom && gatheredFrom.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Gathered From</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						{#each gatheredFrom as gather}
							<div class="flex justify-between items-center text-sm">
								<span class="font-medium">{gather.gather_item_id}</span>
								<span class="text-muted-foreground">{(gather.rate * 100).toFixed(1)}%</span>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Used In Recipes -->
		{#if usedInRecipes && usedInRecipes.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Used In Recipes</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						{#each usedInRecipes as recipe}
							<div class="flex justify-between items-center text-sm">
								<span class="font-medium">{recipe.recipe_id}</span>
								<span class="text-muted-foreground">x{recipe.amount}</span>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Needed For Quests -->
		{#if neededForQuests && neededForQuests.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Needed For Quests</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						{#each neededForQuests as quest}
							<div class="flex justify-between items-center text-sm">
								<a href="/quests/{quest.quest_id}" class="hover:underline font-medium">
									{quest.quest_id}
								</a>
								<span class="text-muted-foreground"
									>{quest.purpose} (x{quest.amount})</span
								>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
