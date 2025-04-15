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

