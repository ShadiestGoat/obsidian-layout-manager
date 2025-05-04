<script lang="ts">
	import type { PickLayoutCallback } from "src/modals"

	let { onSubmit, options, submitText }: { onSubmit: PickLayoutCallback; options: string[], submitText: string } = $props()

	let name = $state('')
</script>

<form
	class="lm-layout-picker-container"
	onsubmit={(e) => {
		e.preventDefault()
		e.stopPropagation()

		onSubmit(name)
	}}
>
	<select class="dropdown" bind:value={name}>
		{#each options as opt (opt)}
			<option>{opt}</option>
		{/each}
	</select>

	<button disabled={!name} type="submit" class="mod-cta">{submitText}</button>
</form>
