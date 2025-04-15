<script lang="ts">
    import type { NewLayoutCallback } from "src/modals"
    import { PlatformMode } from "src/settings"

	let { onSubmit }: { onSubmit: NewLayoutCallback } = $props()

	let name = $state("")
	let paths = $state("")
	let platMode = $state(PlatformMode.BOTH)
</script>

<form class="lm-new-layout-container" onsubmit={(e) => {
	e.preventDefault()
	e.stopPropagation()

	onSubmit(name, paths, platMode)
}}>
	<input type="text" placeholder="Name" bind:value={name} />
	<textarea placeholder="Paths (glob)" bind:value={paths}></textarea>
	<select class="dropdown" bind:value={platMode}>
		<option value={PlatformMode.BOTH}>Desktop & Mobile</option>
		<option value={PlatformMode.COMPUTER}>Desktop Only</option>
		<option value={PlatformMode.MOBILE}>Mobile Only</option>
	</select>

	<button disabled={!name || !paths} type="submit" class="mod-cta">Save</button>
</form>
