<script lang="ts">
    import type { NewLayoutCallback } from 'src/modals'
    import { PlatformMode } from 'src/settings'
    import PlatformDropdown from '../PlatformDropdown.svelte'

    let { onSubmit, otherNames }: { onSubmit: NewLayoutCallback; otherNames: string[] } = $props()

    let name = $state('')
    let paths = $state('')
    let platMode = $state(PlatformMode.BOTH)
</script>

<form
    class="lm-new-layout-container"
    onsubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()

        onSubmit(name.trim(), paths.trim(), platMode)
    }}
>
    <!-- svelte-ignore a11y_autofocus -->
    <!-- This is only rendered in modals, which should be autofocused since it IS a jump -->
    <input type="text" placeholder="Name" bind:value={name} autofocus />
    <textarea placeholder="Paths (glob)" bind:value={paths}></textarea>
    <PlatformDropdown bind:value={platMode} />

    <button disabled={!name || !paths || otherNames.contains(name)} type="submit" class="mod-cta"
        >Save</button
    >
</form>
