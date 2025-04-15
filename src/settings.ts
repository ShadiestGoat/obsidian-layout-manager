import type { AnyContainer } from './obsidianLayout'

export enum PlatformMode {
	BOTH = 'both',
	COMPUTER = 'computer',
	MOBILE = 'mobile'
}

export interface SavedLayout {
	platformMode: PlatformMode
	container: AnyContainer
	name: string
	patterns: string[]
}

export type Settings = SavedLayout[]
