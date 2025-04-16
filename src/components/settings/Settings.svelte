<script lang="ts">
    import type { SettingData } from 'src/settings'
    import type { Writable } from 'svelte/store'
    import SettingLayout from './SettingLayout.svelte'
    import type { App } from 'obsidian'
    import { ConfirmModal } from 'src/modals'

    let { settings, app }: { settings: Writable<SettingData>; app: App } = $props()

    let otherNames = $derived($settings.map((s) => s.name))
</script>

{#each $settings as l, i (l.name)}
    <SettingLayout
        bind:option={$settings[i]}
        {otherNames}
        currentI={i}
        size={$settings.length}
        changeOrder={(targetI) => {
            $settings.splice(i, 1)
            $settings.splice(targetI, 0, l)
            $settings = $settings
        }}
        deleteSelf={() => {
            new ConfirmModal(app, (success) => {
                if (!success) return
                $settings.splice(i, 1)

                $settings = $settings
            }, { desc: `This will delete the layout '${l.name}'` }).open()
        }}
    />
{/each}
