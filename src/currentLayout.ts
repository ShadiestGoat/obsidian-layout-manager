import type { WorkspaceLeaf } from 'obsidian'
import { FileView, Platform, setIcon, type App } from 'obsidian'
import { targetedLayout } from './obsidianLayout'
import type { SavedLayout } from './settings'

export class StateMgr {
	file = ''
	name = ''

	private active = false
	private leaves = new Set<string>()

	private app: App
	leafState = new Map<string, string>()

	constructor(app: App) {
		this.app = app
	}

	private manageOriginalIcon(id: string, add: boolean) {
		const l = this.app.workspace.getLeafById(id)
		if (!l) return

		l.tabHeaderInnerIconEl.toggleClass('lm-original', add)
		const icon = add ? 'layout-dashboard' : 'file'

		l.view.icon = icon
		setIcon(l.tabHeaderInnerIconEl, add ? 'layout-dashboard' : 'file')
	}

	/**
	 * Check if layout integrity is broken, given current diffs
	 */
	isLayoutIntegrityGood(diffs: Record<string, [string | undefined, string | undefined]>): boolean {
		for (const id of this.leaves) {
			if (!diffs[id]) {
				continue
			}

			// One of the originals was removed: 'layout integrety' is broken
			if (diffs[id][1] === undefined) {
				return false
			}
		}

		return true
	}

	/**
	 * Update the actual layout in obsidian
	 * @returns the new file leaf Ids
	 */
	private async updateObsidianLayout(path: string, layout: SavedLayout): Promise<string[]> {
		// Note on impl: the goal of this function is to mimic what obsidian does in updateLayout,
		// but non-blocking & only affecting the main panel

		const fileLeafIds: string[] = []
		const main = targetedLayout(layout.container, path, (id) => {
			fileLeafIds.push(id)
		})

		const w = this.app.workspace

		w.layoutReady = false

		const rootLeaf = await this.app.workspace.deserializeLayout(main, 'root')
		rootLeaf.containerEl.addClass('mod-root')
		rootLeaf.recomputeChildrenDimensions()
		w.rootSplit = rootLeaf

		if (Platform.isMobile) {
			w.containerEl.children[1].replaceWith(rootLeaf.containerEl)
		} else {
			w.containerEl.children[2].replaceWith(rootLeaf.containerEl)
		}

		if (layout.activeId) {
			const l = w.getLeafById(layout.activeId)
			if (l) w.setActiveLeaf(l)
		}

		const deferredLoaders: Promise<unknown>[] = []
		w.iterateRootLeaves(function (l: WorkspaceLeaf) {
			if (l.isVisible()) deferredLoaders.push(l.loadIfDeferred())
		})

		await Promise.all(deferredLoaders)

		w.layoutReady = true

		w.onLayoutChange()
		w.requestActiveLeafEvents()

		return fileLeafIds
	}

	/**
	 * @returns diffs
	 */
	private updateState(): Record<string, [string | undefined, string | undefined]> {
		const curState = new Map<string, string>()

		this.app.workspace.iterateRootLeaves((l) => {
			if (!l || !(l.view instanceof FileView) || !l.view.file) {
				return
			}

			curState.set(l.id, l.view.file?.path)
		})

		const diffs: Record<string, [string | undefined, string | undefined]> = {}

		curState.forEach((v, k) => {
			const old = this.leafState.get(k)
			if (old != v) {
				diffs[k] = [old, v]
			}
		})

		this.leafState.forEach((v, k) => {
			if (diffs[k]) {
				return
			}
			if (!curState.has(k)) {
				diffs[k] = [v, undefined]
			}
		})

		this.leafState = curState

		return diffs
	}

	/**
	 * @returns Either the path to the file that is the replacement one OR null, in which case don't update
	 */
	shouldUpdate(): string | null {
		const diffs = this.updateState()

		if (this.active && !this.isLayoutIntegrityGood(diffs)) {
			this.setNotActive()
			return null
		}

		// Ensure that icons are reset
		this.leaves.forEach(id => {
			this.manageOriginalIcon(id, true)
		})

		// Don't care about closed tabs if not in a managed layout
		if (!this.active && Object.values(diffs).filter((v) => v[1] !== undefined).length === 0) {
			return null
		}

		for (const leafId in diffs) {
			const newPath = diffs[leafId][1]

			if (!newPath) continue
			if (this.active && newPath === this.file) {
				continue
			}

			return newPath
		}

		return null
	}

	async update(sv: SavedLayout, path: string) {
		const fileLeaves = await this.updateObsidianLayout(path, sv)

		this.leafState.clear()
		fileLeaves.forEach((id) => {
			this.leafState.set(id, path)
		})

		this.leaves = new Set(sv.leafIds)
		this.leaves.forEach((id) => {
			this.manageOriginalIcon(id, true)
		})

		this.active = true
		this.file = path
		this.name = sv.name
	}

	isActive() {
		return this.active
	}

	setNotActive() {
		this.active = false
		this.leaves.forEach(l => {
			this.manageOriginalIcon(l, false)
		})
		this.leaves.clear()
	}
}
