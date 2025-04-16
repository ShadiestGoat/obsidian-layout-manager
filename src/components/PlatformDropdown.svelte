<script lang="ts">
	import { PlatformMode } from 'src/settings'

	let { value = $bindable() }: { value: PlatformMode } = $props()
</script>

<select class="dropdown" bind:value>
	<option value={PlatformMode.BOTH}>Desktop & Mobile</option>
	<option value={PlatformMode.COMPUTER}>Desktop Only</option>
	<option value={PlatformMode.MOBILE}>Mobile Only</option>
</select>
