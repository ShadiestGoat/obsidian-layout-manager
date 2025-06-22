import type { KeyboardEventHandler, MouseEventHandler } from 'svelte/elements'

// Idk why KeyboardEventHandler<T> | MouseEventHandler<T> doesn't yield the same result
export function buttonInteraction<T extends HTMLElement>(cb: (e: (KeyboardEvent | MouseEvent) & { currentTarget: T}) => void): {
	onkeydown: KeyboardEventHandler<T>
	onclick: MouseEventHandler<T>
} {
	return {
		onclick: (e) => {
			if (e.currentTarget.hasAttribute('disabled')) return
			cb(e)
		},
		onkeydown: (e) => {
			if (e.currentTarget.hasAttribute('disabled')) return
			if (e.key == 'Enter' || e.key == ' ') {
				cb(e)
			}
		}
	}
}
