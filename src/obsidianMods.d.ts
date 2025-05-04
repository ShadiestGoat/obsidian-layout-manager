import _ from 'obsidian'
import type { AnyContainer } from './obsidianLayout'

// These are undocumented & interal stuff, I just want SOME typing

declare module 'obsidian' {
	interface WorkspaceLeaf {
		id: string
		isVisible(): boolean
		tabHeaderInnerIconEl: HTMLElement
	}

	interface WorkspaceRoot {
		containerEl: HTMLElement
		recomputeChildrenDimensions: () => void
		serialize(): AnyContainer
	}

	interface Workspace {
		deserializeLayout(data: AnyContainer, dataType: string | null): Promise<WorkspaceRoot>
		onLayoutChange(): void
		requestActiveLeafEvents(): void
	}
}
