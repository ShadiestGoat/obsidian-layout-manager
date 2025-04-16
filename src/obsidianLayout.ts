// So obsidian doesn't actually give us layout data so this is the useful stuff that I can gather

import { type ViewState } from 'obsidian'

export type KnownContainers = {
	split: { direction: string }
	tabs: Record<string, never>
	leaf: { state: ViewState & ViewStateFile; group?: string }
}

// I hate typescript
export type AnyContainer =
	| GenericContainer<'leaf'>
	| GenericContainer<'split'>
	| GenericContainer<'tabs'>

export type GenericContainer<N extends keyof KnownContainers> = {
	id?: string
	active?: boolean
	type: N
	children?: AnyContainer[]
} & KnownContainers[N]

export interface ViewStateFile {
	type: 'markdown'
	state: {
		file: string
		mode: 'preview' | 'source'
		source: boolean
	}
}

export type LayoutData = {
	// We don't care about layout data for anything other than the user content
	// Though... future release maybe? If someone asks ig
	main: AnyContainer
	active: string
}

/**
 * Create a layout for target f, savings created leaf IDs into ogSet
 * @param setActive When an active leaf is found, it will call this cb
 */
export function targetedLayout(
	l: AnyContainer,
	f: string,
	setActive: (id: string) => void,
	ogSet: Set<string>
): AnyContainer {
	if (l.active) {
		delete l.active
		l.id = randomId(16)
		setActive(l.id)
	}

	if (l.type != 'leaf') {
		l.children?.forEach((c) => targetedLayout(c, f, setActive, ogSet))
		return l
	}

	if (!l.active) {
		l.id = randomId(16)
	}

	ogSet.add(l.id as string)

	if (l.state.type == 'markdown') {
		l.state.state.file = f
	}

	return l
}

/**
 * Makes savable data out of the raw one
 * l becomes dirty after this, do not use it again.
 */
export function savableLayout(
	l: AnyContainer,
	fileSet: Set<string>,
	activeID: string
): AnyContainer {
	// This is basically js referance abuse, which is always fun & reliable & easy to debug :3

	if (l.id == activeID) {
		l.active = true
	}

	delete l.id

	if (l.type == 'leaf') {
		if (l.state.type == 'markdown') {
			fileSet.add(l.state.state.file)

			// @ts-expect-error Title causes issues
			delete l.state.title

			// Avoid saving extra metadata, set bare minimums
			l.state.state = {
				file: '',
				mode: l.state.state.mode,
				source: l.state.state.source
			}
		}
	} else {
		l.children?.forEach((c) => savableLayout(c, fileSet, activeID))
	}

	return l
}

const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function randomId(l: number) {
	return Array.from(
		{ length: l },
		() => possible[Math.floor(Math.random() * possible.length)]
	).join('')
}
