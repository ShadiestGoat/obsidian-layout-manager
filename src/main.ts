import type { WorkspaceLeaf } from 'obsidian'
import { FileView, Notice, Platform, Plugin, setIcon } from 'obsidian'
import { savableLayout, targetedLayout } from './obsidianLayout'
import { LayoutMgrSettings, PlatformMode, type SavedContainerData, type SavedLayout, type SettingData } from './settings'
import { NewLayoutModal, OverrideLayoutModal } from './modals'
import { minimatch } from 'minimatch'

export default class LayoutManager extends Plugin {
	settings: SettingData
	switching = false

	/** leaf id -> file path */
	lastState = new Map<string, string>()
	/**
	 * The original leaves created by this plugin
	 * If empty, treat all leaves as original
	 */
	originalLeafs: Set<string> = new Set()

	async onload(): Promise<void> {
		await this.loadSettings()

		this.addCommand({
			id: 'save-layout',
			name: 'Save Layout',
			callback: () => {
				const cont = this.getCurrentLayout()
				if (!cont) {
					return
				}

				new NewLayoutModal(
					this.app,
					(name, paths, platMode) => {
						this.settings.push({
							name,
							patterns: paths
								.split('\n')
								.filter((v) => !!v)
								.join('\n'),
							platformMode: platMode,
							...cont,
						})
						this.saveSettings()
					},
					{ otherNames: this.settings.map((s) => s.name) }
				).open()
			}
		})

		this.addCommand({
			id: 'override-layuout',
			name: 'Override Layout',
			callback: () => {
				const cont = this.getCurrentLayout()
				if (!cont) {
					return
				}

				new OverrideLayoutModal(
					this.app,
					(name) => {
						const i = this.settings.findIndex((s) => s.name == name)
						if (i == -1) {
							new Notice("Can't find this Layout")
							return
						}
						this.settings[i] = {...this.settings[i], ...cont}

						this.saveSettings()
					},
					{ options: this.settings.map((s) => s.name) }
				).open()
			}
		})

		this.register(() => this.setOriginals([]))

		this.app.workspace.onLayoutReady(() => {
			this.updateState()

			this.registerEvent(
				// Method got too big, lives in a seperate file now
				this.app.workspace.on('active-leaf-change', (l) => this.onActiveLeafChange(l))
			)
		})

		this.addSettingTab(new LayoutMgrSettings(this.app, this))
	}

	onActiveLeafChange(l: WorkspaceLeaf | null) {
		const diffs = this.updateState()

		// Are we talking about a file?
		if (!l) return
		// Debounce layout switching caused by us
		if (this.switching) return

		// Don't react to closing tabs when we are not tracking a layout
		if (
			this.originalLeafs.size == 0 &&
			Object.values(diffs).filter((v) => v[1] !== undefined).length === 0
		)
			return

		let shouldMatch = this.originalLeafs.size == 0
		for (const id of this.originalLeafs) {
			if (!diffs[id]) {
				continue
			}

			// One of the originals was removed: 'layout integrety' is broken
			if (diffs[id][1] === undefined) {
				this.setOriginals([])
				return
			}

			shouldMatch = true

			break
		}

		// We need to ensure we are talking to failes AFTER doing the diff checks
		// Think replacing the view in a leaf from file to graph view
		if (!(l.view instanceof FileView) || !l.view.file) return

		// Ensure an update so that if tabs are moved around, their icon is re-created
		this.runOriginals()

		if (!shouldMatch) return

		const path = l.view.file.path

		const matched = this.findLayoutForPath(path)
		if (!matched) {
			this.setOriginals([])
			return
		}

		new Notice(`Using ${matched.name} layout!`)

		this.loadLayout(matched, path)
	}

	manageOriginalIcon(id: string, add: boolean) {
		// Its there... trust me...
		const l = this.app.workspace.getLeafById(id) as { tabHeaderInnerIconEl: HTMLElement } | null
		if (!l) return

		l.tabHeaderInnerIconEl.toggleClass('lm-original', add)
		setIcon(l.tabHeaderInnerIconEl, add ? 'layout-dashboard' : 'file')
	}

	runOriginals() {
		this.originalLeafs.forEach((id) => {
			this.manageOriginalIcon(id, true)
		})
	}

	setOriginals(newOnes: string[]) {
		// Cleanup or removed ones
		this.originalLeafs.forEach((id) => {
			if (!newOnes.contains(id)) this.manageOriginalIcon(id, false)
		})

		this.originalLeafs = new Set(newOnes)
		this.runOriginals()
	}

	/**
	 * @returns diffs
	 */
	updateState(): Record<string, [string | undefined, string | undefined]> {
		const curState = new Map<string, string>()

		this.app.workspace.iterateRootLeaves((l) => {
			if (!l || !(l.view instanceof FileView) || !l.view.file) {
				return
			}

			curState.set(l.id, l.view.file?.path)
		})

		const diffs: Record<string, [string | undefined, string | undefined]> = {}

		curState.forEach((v, k) => {
			const old = this.lastState.get(k)
			if (old != v) {
				diffs[k] = [old, v]
			}
		})

		this.lastState.forEach((v, k) => {
			if (diffs[k]) {
				return
			}
			if (!curState.has(k)) {
				diffs[k] = [v, undefined]
			}
		})

		this.lastState = curState

		return diffs
	}

	findLayoutForPath(p: string): SavedLayout | null {
		for (const opt of this.settings) {
			if (opt.platformMode == PlatformMode.COMPUTER && !Platform.isDesktop) {
				continue
			}
			if (opt.platformMode == PlatformMode.MOBILE && !Platform.isMobile) {
				continue
			}

			for (const pattern of opt.patterns.split('\n')) {
				if (pattern && minimatch(p, pattern)) {
					return opt
				}
			}
		}

		return null
	}

	async saveSettings() {
		return this.saveData(this.settings)
	}

	async loadSettings() {
		const d = (await this.loadData()) ?? []

		this.settings = Array.isArray(d) ? d : []
	}

	getCurrentLayout(): SavedContainerData | null {
		const fileSet = new Set<string>()
		const leafIds: string[] = []
		const layoutData = this.app.workspace.rootSplit.serialize()
		let activeId: string | undefined

		const layout = savableLayout(layoutData, fileSet, (id) => {
			leafIds.push(id)
			if (id === this.app.workspace.activeLeaf?.id) {
				activeId = id
			}
		})
		if (fileSet.size > 1) {
			new Notice("Can't save: multiple files found in layout")
			return null
		}

		return {
			container: layout,
			activeId,
			leafIds,
		}
	}

	/** Loads a layout, replacing any files with {path} */
	async loadLayout({ activeId, leafIds, container }: SavedContainerData, path: string) {
		this.switching = true

		const main = targetedLayout(container, path)

		const w = this.app.workspace

		w.layoutReady = false

		const rootLeaf = await this.app.workspace.deserializeLayout(main, "root")
		rootLeaf.containerEl.addClass("mod-root")
		rootLeaf.recomputeChildrenDimensions()
		w.rootSplit = rootLeaf

		if (Platform.isMobile) {
			w.containerEl.children[1].replaceWith(rootLeaf.containerEl)
		} else {
			w.containerEl.children[2].replaceWith(rootLeaf.containerEl)
		}

		if (activeId) {
			const l = w.getLeafById(activeId)
			if (l) w.setActiveLeaf(l)
		}

		const deferredLoaders: Promise<unknown>[] = []
		w.iterateRootLeaves(function (l: WorkspaceLeaf) {
			if (l.isVisible()) deferredLoaders.push(l.loadIfDeferred())
		})

		await Promise.all(deferredLoaders)
		this.updateState()

		w.layoutReady = true

		w.onLayoutChange()
		w.requestActiveLeafEvents()

		this.setOriginals(leafIds)
		this.switching = false
	}
}
