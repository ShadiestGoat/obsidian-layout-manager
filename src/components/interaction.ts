import type { KeyboardEventHandler, MouseEventHandler } from 'svelte/elements'

export function buttonInteraction(cb: () => void): {
	onkeypress: KeyboardEventHandler<HTMLElement>
	onclick: MouseEventHandler<HTMLElement>
} {
	return {
		onclick: (e) => {
			if (e.currentTarget.hasAttribute('disabled')) return
			cb()
		},
		onkeypress: (e) => {
			if (e.currentTarget.hasAttribute('disabled')) return
			if (e.key == 'Enter' || e.key == ' ') {
				cb()
			}
		}
	}
}
