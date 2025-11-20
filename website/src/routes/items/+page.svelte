<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	export let data: PageData;

	$: items = data.items;

	const qualityColors = [
		'bg-quality-0',
		'bg-quality-1',
		'bg-quality-2',
		'bg-quality-3',
		'bg-quality-4'
	];

	const qualityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

	function updateFilters(params: Record<string, string | undefined>) {
		const newParams = new SvelteURLSearchParams($page.url.searchParams);

		Object.entries(params).forEach(([key, value]) => {
			if (value === undefined || value === '') {
				newParams.delete(key);
			} else {
				newParams.set(key, value);
			}
		});

		// Reset to page 1 when filters change
		if (!params.page) {
			newParams.delete('page');
		}

		// Query-only navigation - stays on current route, only updates search params
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`?${newParams.toString()}`, { replaceState: true });
	}

	function toggleQuality(quality: number) {
		const current = data.filters.quality || [];
		const newQuality = current.includes(quality)
			? current.filter((q) => q !== quality)
			: [...current, quality];

		updateFilters({ quality: newQuality.length > 0 ? newQuality.join(',') : undefined });
	}

	function parseStats(statsJson: string | null): Record<string, number> | null {
		if (!statsJson) return null;
		try {
			return JSON.parse(statsJson);
		} catch {
			return null;
		}
	}

	function parseClassRequired(classJson: string): string[] {
		try {
			const parsed = JSON.parse(classJson);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
</script>

<div class="container mx-auto p-8 space-y-8">
	<div>
		<h1 class="text-4xl font-bold mb-2">Items</h1>
		<p class="text-muted-foreground">
			Showing {items.length} of {data.totalCount} items
		</p>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Filters</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Quality Filter -->
			<div>
				<div class="text-sm font-medium mb-2">Quality</div>
				<div class="flex gap-2 flex-wrap">
					{#each [0, 1, 2, 3, 4] as quality (quality)}
						<button
							type="button"
							class="px-3 py-1 rounded text-sm font-medium transition-all border-2 {data.filters
								.quality?.includes(quality)
								? `${qualityColors[quality]} border-foreground`
								: 'bg-muted border-transparent'}"
							on:click={() => toggleQuality(quality)}
						>
							{qualityNames[quality]}
						</button>
					{/each}
				</div>
			</div>

			<!-- Item Type Filter -->
			<div>
				<div class="text-sm font-medium mb-2">Type</div>
				<div class="flex gap-2 flex-wrap">
					{#each data.availableTypes.slice(0, 10) as type (type)}
						<button
							type="button"
							class="px-3 py-1 rounded text-sm font-medium transition-all border-2 {data.filters.itemType?.includes(
								type
							)
								? 'bg-primary text-primary-foreground border-primary'
								: 'bg-muted border-transparent'}"
							on:click={() => {
								const current = data.filters.itemType || [];
								const newTypes = current.includes(type)
									? current.filter((t) => t !== type)
									: [...current, type];
								updateFilters({ type: newTypes.length > 0 ? newTypes.join(',') : undefined });
							}}
						>
							{type}
						</button>
					{/each}
				</div>
			</div>

			<!-- Clear Filters -->
			{#if data.filters.quality || data.filters.itemType || data.filters.search}
				<div>
					<Button
						variant="outline"
						onclick={() =>
							goto(resolve('/items'), {
								replaceState: true
							})}
					>
						Clear Filters
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Items Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
		{#each items as item (item.id)}
			<a href={resolve('/items/[id]', { id: item.id })} class="block">
				<Card.Root class="h-full hover:border-primary transition-colors">
					<Card.Header>
						<div class="flex items-start justify-between gap-2">
							<Card.Title class="text-lg">{item.name}</Card.Title>
							<span
								class="px-2 py-1 rounded text-xs font-medium {qualityColors[item.quality]} flex-shrink-0"
							>
								Q{item.quality}
							</span>
						</div>
						<Card.Description>
							{item.item_type || 'Unknown type'}
							{#if item.level_required > 0}
								· Level {item.level_required}
							{/if}
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#if item.slot}
							<div class="text-sm">
								<span class="text-muted-foreground">Slot:</span>
								<span class="font-medium">{item.slot}</span>
							</div>
						{/if}

						{#if item.weapon_category}
							<div class="text-sm">
								<span class="text-muted-foreground">Weapon:</span>
								<span class="font-medium">{item.weapon_category}</span>
							</div>
						{/if}

						{#if parseClassRequired(item.class_required).length > 0}
							<div class="text-sm">
								<span class="text-muted-foreground">Class:</span>
								<span class="font-medium">{parseClassRequired(item.class_required).join(', ')}</span>
							</div>
						{/if}

						{@const stats = parseStats(item.stats)}
						{#if stats && Object.keys(stats).length > 0}
							<div class="text-sm text-muted-foreground">
								{Object.keys(stats).length} stat{Object.keys(stats).length !== 1 ? 's' : ''}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</a>
		{/each}
	</div>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<div class="flex justify-center gap-2">
			<Button
				variant="outline"
				disabled={data.pagination.page <= 1}
				onclick={() => updateFilters({ page: String(data.pagination.page - 1) })}
			>
				Previous
			</Button>

			<div class="flex items-center px-4">
				Page {data.pagination.page} of {data.pagination.totalPages}
			</div>

			<Button
				variant="outline"
				disabled={data.pagination.page >= data.pagination.totalPages}
				onclick={() => updateFilters({ page: String(data.pagination.page + 1) })}
			>
				Next
			</Button>
		</div>
	{/if}
</div>
