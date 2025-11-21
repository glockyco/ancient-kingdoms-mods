<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { PAGINATION } from '$lib/config';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isHydrated = $state(false);
	let searchInput = $state('');
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		isHydrated = true;
		// Initialize searchInput from URL on mount (for direct links)
		searchInput = $page.url.searchParams.get('search') || '';
	});

	const qualityColors = [
		'bg-quality-0',
		'bg-quality-1',
		'bg-quality-2',
		'bg-quality-3',
		'bg-quality-4'
	];

	const qualityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

	// Parse URL params for current filters (only client-side)
	const filters = $derived({
		quality: isHydrated ? ($page.url.searchParams.get('quality')?.split(',').map(Number) || []) : [],
		itemType: isHydrated ? ($page.url.searchParams.get('type')?.split(',') || []) : [],
		page: isHydrated ? Number($page.url.searchParams.get('page') || '1') : 1
	});

	// Helper to check if item name matches search
	function matchesSearch(itemName: string): boolean {
		if (!searchInput) return true;
		return itemName.toLowerCase().includes(searchInput.toLowerCase());
	}

	// Helper to check if item matches all filters
	function matchesFilters(
		item: { quality: number; item_type: string; name: string },
		options: { includeQuality?: boolean; includeType?: boolean } = {}
	): boolean {
		const { includeQuality = true, includeType = true } = options;

		if (includeQuality && filters.quality.length > 0 && !filters.quality.includes(item.quality)) {
			return false;
		}
		if (includeType && filters.itemType.length > 0 && !filters.itemType.includes(item.item_type)) {
			return false;
		}
		if (!matchesSearch(item.name)) {
			return false;
		}
		return true;
	}

	// Filter items based on current filters (use searchInput directly for instant feedback)
	const filteredItems = $derived(data.items.filter((item) => matchesFilters(item)));

	// Calculate quality counts based on current type and search filters
	const qualityCounts = $derived(
		Array.from({ length: qualityNames.length }, (_, i) => i).map((quality) => {
			const count = data.items.filter((item) =>
				matchesFilters(item, { includeQuality: false }) && item.quality === quality
			).length;
			return { quality, count };
		})
	);

	// Calculate type counts based on current quality and search filters
	const typeCounts = $derived.by(() => {
		const allTypes = Array.from(new Set(data.items.map((item) => item.item_type))).sort();
		return allTypes.map((type) => {
			const count = data.items.filter((item) =>
				matchesFilters(item, { includeType: false }) && item.item_type === type
			).length;
			return { type, count };
		});
	});

	// Pagination
	const totalPages = $derived(Math.ceil(filteredItems.length / PAGINATION.PAGE_SIZE));
	const paginatedItems = $derived(
		filteredItems.slice(
			(filters.page - 1) * PAGINATION.PAGE_SIZE,
			filters.page * PAGINATION.PAGE_SIZE
		)
	);

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

		goto(`?${newParams.toString()}`, { replaceState: true });
	}

	function toggleQuality(quality: number) {
		const current = filters.quality;
		const newQuality = current.includes(quality)
			? current.filter((q) => q !== quality)
			: [...current, quality];

		updateFilters({ quality: newQuality.length > 0 ? newQuality.join(',') : undefined });
	}

	function toggleType(type: string) {
		const current = filters.itemType;
		const newTypes = current.includes(type)
			? current.filter((t) => t !== type)
			: [...current, type];

		updateFilters({ type: newTypes.length > 0 ? newTypes.join(',') : undefined });
	}

	// Debounce URL update when searchInput changes
	$effect(() => {
		const currentSearch = searchInput; // Read here so effect tracks changes

		// Don't update URL on initial mount
		if (!isHydrated) return;

		// Clear existing timer
		if (searchDebounceTimer) {
			clearTimeout(searchDebounceTimer);
		}

		// Schedule URL update (for bookmarking/sharing)
		searchDebounceTimer = setTimeout(() => {
			// Update URL without triggering navigation (preserves focus)
			const newParams = new SvelteURLSearchParams($page.url.searchParams);

			if (currentSearch) {
				newParams.set('search', currentSearch);
			} else {
				newParams.delete('search');
			}

			// Reset to page 1 when search changes
			newParams.delete('page');

			// Use History API directly to avoid SvelteKit navigation
			const queryString = newParams.toString();
			const newUrl = queryString
				? `${window.location.pathname}?${queryString}`
				: window.location.pathname;
			window.history.replaceState(history.state, '', newUrl);
		}, 300);

		// Cleanup function to clear timeout on effect re-run or unmount
		return () => {
			if (searchDebounceTimer) {
				clearTimeout(searchDebounceTimer);
			}
		};
	});

	function parseClassRequired(classJson: string): string[] {
		try {
			const parsed = JSON.parse(classJson);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
</script>

{#if !isHydrated}
	<div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
		<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			<p class="mt-2 text-sm text-muted-foreground">Loading...</p>
		</div>
	</div>
{/if}

<div class="container mx-auto p-8 space-y-8">
	<div>
		<h1 class="text-4xl font-bold mb-2">Items</h1>
		<p class="text-muted-foreground">
			Showing {paginatedItems.length} of {filteredItems.length} items
			{#if filteredItems.length !== data.items.length}
				(filtered from {data.items.length} total)
			{/if}
		</p>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Filters</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Search Filter -->
			<div>
				<label for="search" class="text-sm font-medium mb-2 block">Search</label>
				<input
					id="search"
					type="text"
					placeholder="Search items by name..."
					bind:value={searchInput}
					class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
			</div>

			<!-- Quality Filter -->
			<div>
				<div class="text-sm font-medium mb-2">Quality</div>
				<div class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
					{#each qualityCounts as { quality, count } (quality)}
						<button
							type="button"
							class="px-3 py-1 rounded text-sm font-medium transition-all border-2 flex justify-between items-center {filters.quality.includes(
								quality
							)
								? `${qualityColors[quality]} border-foreground`
								: 'bg-muted border-transparent'} {count === 0 ? 'opacity-40' : ''}"
							onclick={() => toggleQuality(quality)}
						>
							<span>{qualityNames[quality]}</span>
							<span class="font-mono">({count})</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Item Type Filter -->
			<div>
				<div class="text-sm font-medium mb-2">Type</div>
				<div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
					{#each typeCounts as { type, count } (type)}
						<button
							type="button"
							class="px-3 py-1 rounded text-sm font-medium transition-all border-2 flex justify-between items-center {filters.itemType.includes(
								type
							)
								? 'bg-primary text-primary-foreground border-primary'
								: 'bg-muted border-transparent'} {count === 0 ? 'opacity-40' : ''}"
							onclick={() => toggleType(type)}
						>
							<span>{type}</span>
							<span class="font-mono">({count})</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Clear Filters -->
			{#if filters.quality.length > 0 || filters.itemType.length > 0 || searchInput}
				<div>
					<Button
						variant="outline"
						onclick={() => {
							searchInput = '';
							goto('/items', { replaceState: true });
						}}
					>
						Clear Filters
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Items Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
		{#each paginatedItems as item (item.id)}
			{@const classRequired = parseClassRequired(item.class_required)}
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

						{#if item.backpack_slots > 0}
							<div class="text-sm">
								<span class="text-muted-foreground">Capacity:</span>
								<span class="font-medium"
									>{item.backpack_slots} slot{item.backpack_slots !== 1 ? 's' : ''}</span
								>
							</div>
						{/if}

						{#if classRequired.length > 0}
							<div class="text-sm">
								<span class="text-muted-foreground">Class:</span>
								<span class="font-medium">{classRequired.join(', ')}</span>
							</div>
						{/if}

						{#if item.stats_count > 0}
							<div class="text-sm text-muted-foreground">
								{item.stats_count} stat{item.stats_count !== 1 ? 's' : ''}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</a>
		{/each}
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex justify-center gap-2">
			<Button
				variant="outline"
				disabled={filters.page <= 1}
				onclick={() => updateFilters({ page: String(filters.page - 1) })}
			>
				Previous
			</Button>

			<div class="flex items-center px-4">
				Page {filters.page} of {totalPages}
			</div>

			<Button
				variant="outline"
				disabled={filters.page >= totalPages}
				onclick={() => updateFilters({ page: String(filters.page + 1) })}
			>
				Next
			</Button>
		</div>
	{/if}
</div>
