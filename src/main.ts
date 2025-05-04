import { FileView, Notice, Platform, Plugin } from 'obsidian'
import { savableLayout } from './obsidianLayout'
import {
	LayoutMgrSettings,
	PlatformMode,
	type SavedContainerData,
	type SavedLayout,
	type SettingData
} from './settings'
import { NewLayoutModal, OverrideLayoutModal, LoadLayoutModal } from './modals'
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
			name: 'Save Layout',
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
			id: 'override-layuout',
			name: 'Override Layout',
			checkCallback: this.layoutManagingCheckCmd((cont) => {
				new OverrideLayoutModal(this.app, this.settings, (sv) => {
					Object.assign(sv, cont)
					this.saveSettings()
				}).open()
			})
		})

		this.addCommand({
			id: 'load-layuout',
			name: 'Load Adhoc Layout',
			checkCallback: (checking) => {
				const activeFile = this.app.workspace.getActiveFile()
				if (!activeFile) {
					return false
				}
				if (!checking) {
					const path = activeFile.path
					new LoadLayoutModal(this.app, this.settings, (sv) => {
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
			leafIds
		}
	}

	/** Loads a layout, replacing any files with {path} */
	async loadLayout(sv: SavedLayout, path: string) {
		this.switching = true

		this.curLayout.update(sv, path)

		this.switching = false
	}
}
