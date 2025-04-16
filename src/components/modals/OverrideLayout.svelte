<script lang="ts">
	let { onSubmit, options }: { onSubmit: (opt: string) => void; options: string[] } = $props()

	let name = $state('')
</script>

<form
	class="lm-new-layout-container"
	onsubmit={(e) => {
		e.preventDefault()
		e.stopPropagation()

		onSubmit(name)
	}}
>
	<select class="dropdown" bind:value={name}>
		{#each options as opt (opt)}
			<option value="opt">{opt}</option>
		{/each}
	</select>

	<button disabled={!name} type="submit" class="mod-cta">Save</button>
</form>
