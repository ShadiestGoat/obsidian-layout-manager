import _ from 'obsidian'

declare module 'obsidian' {
	interface WorkspaceLeaf {
		id: string
	}
}
