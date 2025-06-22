<script lang="ts">
	import type { SettingData } from 'src/settings'
	import type { Writable } from 'svelte/store'
	import SettingLayout from './SettingLayout.svelte'
	import type { App } from 'obsidian'
	import { ConfirmModal } from 'src/modals'
	import SettingItem from './SettingItem.svelte'
	import SettingHeading from './SettingHeading.svelte'
	import Checkbox from './Checkbox.svelte'

	let { settings, app }: { settings: Writable<SettingData>; app: App } = $props()

	let otherNames = $derived($settings.layouts.map((s) => s.name))
</script>

<SettingHeading title="Layout Agnostic" />
<SettingItem name="Tab Icons" desc="When enabled, will set an icon to indicate which tabs are part of the layout">
	<Checkbox bind:checked={$settings.manageIcons} />
</SettingItem>

<SettingHeading title="Layout Management" />
<div class="lm-settings lm-layout-settings">
	{#each $settings.layouts as l, i (l.name)}
		<SettingLayout
			bind:option={$settings.layouts[i]}
			{otherNames}
			currentI={i}
			size={$settings.layouts.length}
			changeOrder={(targetI) => {
				$settings.layouts.splice(i, 1)
				$settings.layouts.splice(targetI, 0, l)
				$settings = $settings
			}}
			deleteSelf={() => {
				new ConfirmModal(
					app,
					(success) => {
						if (!success) return
						$settings.layouts.splice(i, 1)
						$settings = $settings
					},
					{ desc: `This will delete the layout '${l.name}'` }
				).open()
			}}
		/>
	{/each}
</div>
