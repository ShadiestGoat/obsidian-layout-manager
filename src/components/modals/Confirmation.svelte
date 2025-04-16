<script lang="ts">
	import type { ConfirmationModalCallback } from 'src/modals'
	import { buttonInteraction } from '../interaction'

	let { onSubmit, desc }: { onSubmit: ConfirmationModalCallback; desc: string } = $props()
</script>

<div class="lm-modal-confirm">
	<p>{desc}</p>
	<button {...buttonInteraction(() => onSubmit(true))} class="mod-cta">Confirm</button>
	<button {...buttonInteraction(() => onSubmit(false))}>Cancel</button>
</div>
