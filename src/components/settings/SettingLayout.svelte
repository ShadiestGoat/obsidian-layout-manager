<script lang="ts">
	import type { SavedLayout } from 'src/settings'
	import PlatformDropdown from '../PlatformDropdown.svelte'
	import { setIcon } from 'obsidian'
	import { buttonInteraction } from '../interaction'
	import SettingItem from './SettingItem.svelte'

	interface Props {
		option: SavedLayout
		otherNames: string[]
		currentI: number
		size: number
		changeOrder: (target: number) => void
		deleteSelf: () => void
	}

	let {
		option = $bindable(),
		otherNames,
		currentI,
		size,
		changeOrder,
		deleteSelf
	}: Props = $props()

	let editingTitle = $state(false)

	let tmpValue = $state(option.name)
</script>

<details
	ontoggle={(e) => {
		if (!e.currentTarget.open) {
			editingTitle = false
			tmpValue = option.name
		}
	}}
>
	<summary
		class="lm-name"
		onkeyup={(e) => {
			if (e.key == ' ') {
				e.stopPropagation()
				e.preventDefault()
			}
		}}
	>
		{#if editingTitle}
			<input bind:value={tmpValue} type="text" placeholder="Name" />
		{:else}
			<h2>{option.name}</h2>
		{/if}
	</summary>

	<div class="lm-layout-setting">
		<div class="setting-item lm-setting-manage-container">
			<p>Manage</p>
			<div class="pad"></div>

			<div class="lm-setting-manage-buttons">
				{#if size > 1}
					{#if size > 2}
						<button
							use:setIcon={'chevrons-up'}
							{...buttonInteraction(() => changeOrder(0))}
							class="mod-cta"
							aria-label="Prioritize to top"
							disabled={currentI == 0}
						></button>
					{/if}
					<button
						use:setIcon={'chevron-up'}
						{...buttonInteraction(() => changeOrder(currentI - 1))}
						class="mod-cta"
						aria-label="Prioritize"
						disabled={currentI == 0}
					></button>
					<button
						use:setIcon={'chevron-down'}
						{...buttonInteraction(() => changeOrder(currentI + 1))}
						class="mod-cta"
						aria-label="Deprioritize"
						disabled={currentI == size - 1}
					></button>
					{#if size > 2}
						<button
							use:setIcon={'chevrons-down'}
							{...buttonInteraction(() => changeOrder(size - 1))}
							class="mod-cta"
							aria-label="Deprioritize to bottom"
							disabled={currentI == size - 1}
						></button>
					{/if}
				{/if}

				{#if editingTitle}
					<button
						use:setIcon={'check'}
						{...buttonInteraction(() => {
							editingTitle = false
							option.name = tmpValue.trim()
						})}
						class="mod-cta"
						aria-label="Save"
						disabled={tmpValue.length === 0 || otherNames.contains(tmpValue)}
					></button>
					<button
						use:setIcon={'x'}
						{...buttonInteraction(() => {
							editingTitle = false
							tmpValue = option.name
						})}
						aria-label="Cancel"
					></button>
				{:else}
					<button
						use:setIcon={'pencil'}
						{...buttonInteraction(() => {
							editingTitle = true
							tmpValue = option.name
						})}
						aria-label="Edit name"
					></button>
				{/if}

				<div class="lm-dividor"></div>

				<button
					use:setIcon={'trash-2'}
					{...buttonInteraction(() => deleteSelf())}
					aria-label="Delete layout"
				></button>
			</div>

		</div>

		<SettingItem
			name="Glob patterns"
			desc="If a pattern matches, this layout will be used. Each line is a new pattern"
		>
			<textarea bind:value={option.patterns} placeholder="Patterns (glob)"></textarea>
		</SettingItem>

		<SettingItem name="Platform mode" desc="Restrict this layout to only certain platforms">
			<PlatformDropdown bind:value={option.platformMode} />
		</SettingItem>
	</div>
</details>
