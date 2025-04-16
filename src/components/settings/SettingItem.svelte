<script lang="ts">
    import type { Snippet } from "svelte"

	interface Props {
		name: string
		desc?: string
		children: Snippet
	}

	let { name, desc, children }: Props = $props()
</script>

<div class="setting-item">
	<div class="setting-item-info">
		<div class="setting-item-name">{name}</div>
		{#if desc}
			<div class="setting-item-description">{desc}</div>
		{/if}
	</div>
	<div class="setting-item-control">
		{@render children()}
	</div>
</div>
