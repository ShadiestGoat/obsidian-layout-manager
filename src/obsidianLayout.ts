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
	id: string
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
	fileCb: (id: string) => void,
): AnyContainer {
	if (l.type != 'leaf') {
		l.children?.forEach((c) => targetedLayout(c, f, fileCb))
		return l
	}

	if (l.state.type == 'markdown') {
		l.state.state.file = f
		fileCb(l.id)
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
	leafCb: (id: string) => void,
): AnyContainer {
	// This is basically js referance abuse, which is always fun & reliable & easy to debug :3
	if (l.type == 'leaf') {
		leafCb(l.id)

		if (l.state.type == 'markdown') {
			fileSet.add(l.state.state.file)

			// Avoid saving extra metadata, set bare minimums. It all gets re-calculated anyways

			// @ts-expect-error title is required, but it does get recalculated so this will be fine
			delete l.state.title

			l.state.state = {
				file: '',
				mode: l.state.state.mode,
				source: l.state.state.source
			}
		}
	} else {
		l.children?.forEach((c) => savableLayout(c, fileSet, leafCb))
	}

	return l
}
