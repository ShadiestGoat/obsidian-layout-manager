import { FileView, MarkdownView, Notice, Platform, Plugin } from 'obsidian'
import { savableLayout } from './obsidianLayout'
import {
	LayoutMgrSettings,
	PlatformMode,
	type SavedContainerData,
	type SavedLayout,
	type SettingData
} from './settings'
import { NewLayoutModal, PickLayoutModal } from './modals'
import { minimatch } from 'minimatch'
import { StateMgr } from './currentLayout'

export default class LayoutManager extends Plugin {
	settings: SettingData
	switching = false

	/** leaf id -> file path */
	lastState = new Map<string, string>()

	curLayout: StateMgr

	async onload(): Promise<void> {
		this.curLayout = new StateMgr(this.app)
		await this.loadSettings()

		this.addCommand({
			id: 'save-layout',
			name: 'Save layout',
			checkCallback: this.layoutManagingCheckCmd((cont) => {
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
							...cont
						})
						this.saveSettings()
					},
					{ otherNames: this.settings.map((s) => s.name) }
				).open()
			})
		})

		this.addCommand({
			id: 'override-layout',
			name: 'Override layout',
			checkCallback: this.layoutManagingCheckCmd((cont) => {
				new PickLayoutModal(this.app, this.settings, "Override layout", (sv) => {
					Object.assign(sv, cont)
					this.saveSettings()
				}).open()
			})
		})

		this.addCommand({
			id: 'load-layout',
			name: 'Load adhoc layout',
			checkCallback: (checking) => {
				const activeFile = this.app.workspace.getActiveFile()
				if (!activeFile) {
					return false
				}
				if (!checking) {
					const path = activeFile.path
					new PickLayoutModal(this.app, this.settings, "Load layout", (sv) => {
						this.loadLayout(sv, path)
					}).open()
				}

				return true
			}
		})

		this.register(() => this.curLayout.setNotActive())

		this.app.workspace.onLayoutReady(() => {
			this.curLayout.shouldUpdate()

			this.registerEvent(this.app.workspace.on('layout-change', () => this.onStateChange()))
		})

		this.addSettingTab(new LayoutMgrSettings(this.app, this))
	}

	layoutManagingCheckCmd(cb: (cont: SavedContainerData) => void): (checking: boolean) => boolean {
		return (checking: boolean): boolean => {
			let foundPath: string | undefined

			const leaves = this.app.workspace.getLeavesOfType('file')
			for (const l of leaves) {
				if (!l || !(l.view instanceof FileView) || !l.view.file) continue
				const p = l.view.file.path
				if (foundPath) {
					if (foundPath == p) continue
					return false
				}

				foundPath = p
			}

			if (!checking) {
				const cont = this.getCurrentLayout()
				if (!cont) {
					return false
				}
				cb(cont)
			}

			return true
		}
	}

	onStateChange() {
		if (this.switching) return

		const updatePath = this.curLayout.shouldUpdate()
		if (!updatePath) {
			return
		}

		const matched = this.findLayoutForPath(updatePath)
		if (!matched) {
			return
		}

		new Notice(`Using ${matched.name} layout!`)

		this.loadLayout(matched, updatePath)
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
		const leafIds = new Set<string>()
		const layoutData = this.app.workspace.rootSplit.serialize()

		const layout = savableLayout(layoutData, fileSet, leafIds)
		if (fileSet.size > 1) {
			new Notice("Can't save: multiple files found in layout")
			return null
		}

		const active = this.app.workspace.getActiveViewOfType(MarkdownView)

		return {
			container: layout,
			activeId: active ? active.leaf.id : undefined,
			leafIds: Array.from(leafIds)
		}
	}

	/** Loads a layout, replacing any files with {path} */
	async loadLayout(sv: SavedLayout, path: string) {
		this.switching = true

		this.curLayout.update(sv, path)

		this.switching = false
	}
}
