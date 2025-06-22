import type { App } from 'obsidian'
import { PluginSettingTab } from 'obsidian'
import type { AnyContainer } from './obsidianLayout'
import { mount, unmount } from 'svelte'
import Settings from './components/settings/Settings.svelte'
import { writable } from 'svelte/store'
import type LayoutManager from './main'

export enum PlatformMode {
	BOTH = 'both',
	COMPUTER = 'computer',
	MOBILE = 'mobile'
}

export interface SavedContainerData {
	container: AnyContainer
	activeId?: string
	leafIds: string[]
}

export type SavedLayout = {
	platformMode: PlatformMode
	name: string
	patterns: string
} & SavedContainerData

export type SettingData = {
	manageIcons: boolean
	layouts: SavedLayout[]
}

export const DEFAULT_SETTINGS: SettingData = {
	manageIcons: true,
	layouts: []
}

export class LayoutMgrSettings extends PluginSettingTab {
	svelteContent: Settings
	plugin: LayoutManager

	constructor(app: App, plugin: LayoutManager) {
		super(app, plugin)

		this.plugin = plugin
	}

	display(): void {
		this.containerEl.addClass('lm-settings')

		const settingProxy = writable(this.plugin.settings)
		settingProxy.subscribe((v) => {
			this.plugin.curLayout.setManageIcons(v.manageIcons)
			if (this.plugin.curLayout.isActive()) {
				// Renamed/deleted
				// Maybe on rename we shouldn't but meh
				const activeLayout = this.plugin.settings.layouts.find(l => l.name == this.plugin.curLayout.name)
				if (!activeLayout) {
					this.plugin.curLayout.setNotActive()
				}
			}

			// Just in case, but its already proxied so it should be fine
			this.plugin.settings = v
			this.plugin.saveSettings()
		})

		this.svelteContent = mount(Settings, {
			target: this.containerEl,
			props: {
				settings: settingProxy,
				app: this.app
			}
		})
	}

	hide() {
		unmount(this.svelteContent, { outro: true })
	}
}
