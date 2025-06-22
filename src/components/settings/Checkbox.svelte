<script lang="ts">
	import { buttonInteraction } from "../interaction"

	let {
		ontoggle = () => {},
		checked = $bindable(false)
	}: { ontoggle?: (newValue: boolean) => void, checked: boolean } = $props()

	const events = buttonInteraction<HTMLInputElement | HTMLDivElement>((e) => {
		e.stopPropagation()
		e.preventDefault()

		checked = !checked
		// Don't trigger it when the caller changes the value of checked.
		ontoggle(checked)
	})
</script>

<!--
	So we need keyboard interaction on the checkbox element itself, but click interaction on the wrapper
	This is because the wrapper covers the entire switch, not just the circle bit of it
-->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="checkbox-container" class:is-enabled={checked} onclick={events['onclick']}>
	<input type="checkbox" tabindex="0" bind:checked={checked} onkeydown={events['onkeydown']}>
</div>
