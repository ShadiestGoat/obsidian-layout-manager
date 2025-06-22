import type { WorkspaceLeaf } from 'obsidian'
import { FileView, MarkdownView, Platform, setIcon, type App } from 'obsidian'
import { targetedLayout } from './obsidianLayout'
import type { SavedLayout } from './settings'

const symOgIcon = Symbol('Icon before Layout Manager set it')

export class StateMgr {
	file = ''
	name = ''

	private active = false
	/**
	 * id -> path OR ///View:ViewTypeHere
	 */
	private leafTargetStates = new Map<string, string>()

	private app: App
	private leafState = new Map<string, string>()

	private shouldManageIcons: boolean

	constructor(app: App, shouldManageIcons: boolean) {
		this.app = app
		this.shouldManageIcons = shouldManageIcons
	}

	private setAllIcons(add: boolean) {
		if (!this.shouldManageIcons && add) return

		this.leafTargetStates.forEach((_, id) => {
			this.manageOriginalIcon(id, add)
		})
	}

	private manageOriginalIcon(id: string, add: boolean) {
		const l = this.app.workspace.getLeafById(id)
		if (!l) return

		l.tabHeaderInnerIconEl.toggleClass('lm-original', add)
		const icon = add ? 'layout-dashboard' : symOgIcon in l.view ? l.view[symOgIcon] as string : 'file'

		if (add) {
			// @ts-expect-error I'm not typing this
			l.view[symOgIcon] = l.view.icon
		} else {
			// @ts-expect-error I'm not typing this
			delete l.view[symOgIcon]
		}

		l.view.icon = icon
		setIcon(l.tabHeaderInnerIconEl, icon)
	}

	/**
	 * Check if layout integrity is broken, given current diffs
	 */
	isLayoutIntegrityGood(diffs: Record<string, [string | undefined, string | undefined]>): boolean {
		for (const [id, target] of this.leafTargetStates) {
			// One of the originals was changed: 'layout integrity' is broken
			if (id in diffs && diffs[id][1] !== target) {
				return false
			}
		}

		return true
	}

	/**
	 * Update the actual layout in obsidian
	 * @returns the new file leaf Ids
	 */
	private async updateObsidianLayout(path: string, layout: SavedLayout): Promise<Map<string, string>> {
		// Note on impl: the goal of this function is to mimic what obsidian does in updateLayout,
		// but non-blocking & only affecting the main panel

		const newState = new Map<string, string>()
		const main = targetedLayout(layout.container, path, l => {
			if (l.state.state?.file) {
				newState.set(l.id, l.state.state?.file)
			} else {
				newState.set(l.id, "///View:" + l.state.type)
			}
		})
		this.leafTargetStates = new Map(newState.entries())
		console.log("Leaf target state is updated", this.leafTargetStates)

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

		return newState
	}

	/**
	 * @returns diffs
	 */
	private updateState(): Record<string, [string | undefined, string | undefined]> {
		const curState = new Map<string, string>()

		this.app.workspace.iterateRootLeaves((l) => {
			if (!l) {
				return
			}
			if (l.view instanceof FileView) {
				if (l.view.file) {
					curState.set(l.id, l.view.file.path)
				}
			} else {
				curState.set(l.id, "///View:" + l.view.getViewType())
			}
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
		let integrityBroke = false

		if (this.active && !this.isLayoutIntegrityGood(diffs)) {
			integrityBroke = true
		} else {
			this.setAllIcons(true)
			// Don't care about closed tabs if not in a managed layout
			if (!this.active && Object.values(diffs).filter((v) => v[1] !== undefined).length === 0) {
				return null
			}
		}

		for (const leafId in diffs) {
			const newPath = diffs[leafId][1]
			if (!newPath) continue

			if (this.active && !integrityBroke) {
				if (newPath == this.file || diffs[leafId][0] === undefined) continue
			}

			return newPath
		}

		if (integrityBroke) {
			this.setNotActive()
		}

		return null
	}

	async update(sv: SavedLayout, path: string) {
		this.leafState = await this.updateObsidianLayout(path, sv)

		// Reset again, just in case
		this.leafTargetStates = new Map(this.leafState.entries())

		this.setAllIcons(true)

		this.active = true
		this.file = path
		this.name = sv.name
	}

	isActive() {
		return this.active
	}

	setNotActive() {
		this.active = false
		this.setAllIcons(false)
		this.leafTargetStates.clear()
	}

	setManageIcons(newVal: boolean) {
		if (newVal == this.shouldManageIcons) {
			return
		}

		this.shouldManageIcons = newVal
		if (this.active) {
			this.setAllIcons(newVal)
		}
	}
}
